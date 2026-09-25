/**
 * Tratador de Exceções Local (Local Exception Handler)
 * Captura, cataloga e recupera erros em tempo de execução sem travar a aplicação.
 * Encaminha todas as falhas de pipeline e erros de análise entre Groq e Gemini
 * exclusivamente para os logs do console e impede rigorosamente qualquer envio
 * de dados de erro para o módulo de síntese de voz do Gemini.
 */

export type ExceptionSource = 
  | 'pipeline' 
  | 'parsing' 
  | 'groq' 
  | 'gemini' 
  | 'tts' 
  | 'react' 
  | 'network' 
  | 'firebase' 
  | 'audio' 
  | 'window' 
  | 'general';

export interface LocalException {
  id: string;
  timestamp: string;
  source: ExceptionSource;
  stage?: string;
  message: string;
  originalError: string;
  stack?: string;
  code?: string;
  context?: string;
  blockedFromVoice: boolean;
  recovered: boolean;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'will_local_exceptions_v2';
const MAX_EXCEPTIONS_LOG = 60;
const exceptionListeners: Array<(exception: LocalException) => void> = [];

// Carrega histórico persistente do localStorage
function loadStoredExceptions(): LocalException[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

const localExceptionsHistory: LocalException[] = loadStoredExceptions();

function persistExceptions(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localExceptionsHistory.slice(0, MAX_EXCEPTIONS_LOG)));
  } catch {
    // Ignore storage write issues
  }
}

/**
 * Filtro de Segurança da Síntese de Voz:
 * Verifica se um texto contém mensagens de erro, rastreamentos de pilha (stack traces),
 * códigos de erro de API ou falhas de pipeline que NUNCA devem ser reproduzidos
 * pelo módulo de voz neural do Gemini.
 */
export function isSystemErrorOrLog(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  // Expressões regulares e termos característicos de erros técnicos do sistema
  const systemPatterns = [
    /^error:/i,
    /^typeerror:/i,
    /^syntaxerror:/i,
    /^referenceerror:/i,
    /^rangeerror:/i,
    /groq api error/i,
    /gemini.*error/i,
    /resource_exhausted/i,
    /quota.*exceeded/i,
    /rate limit/i,
    /failed to fetch/i,
    /networkerror/i,
    /status 429/i,
    /status 500/i,
    /status 503/i,
    /status 404/i,
    /status 400/i,
    /status 401/i,
    /status 403/i,
    /at\s+[\w\d_$.]+\s+\(/i, // Linhas de stack trace: "at fn (file.js:1:2)"
    /auth\/unauthorized-domain/i,
    /auth\/operation-not-allowed/i,
    /permission-denied/i,
    /\[tratador de exceç/i,
    /tratador de exceções local/i,
    /json\.parse/i,
    /unexpected token/i,
    /falha de pipeline/i,
    /pipeline failure/i,
    /cannot read propert/i,
    /is not a function/i,
    /uncaught in promise/i,
  ];

  return systemPatterns.some(pattern => pattern.test(lower));
}

/**
 * Registra e trata uma exceção localmente.
 * Encaminha EXCLUSIVAMENTE para os logs do console e assegura que não atinja a voz do Gemini.
 */
export function captureLocalException(
  error: unknown,
  source: ExceptionSource = 'general',
  context?: string,
  stage?: string,
  metadata?: Record<string, any>
): LocalException {
  const errObj = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error));
  const errAny = error as any;

  // Extrair código de erro comum (Firebase, Gemini, HTTP, Groq)
  const code = errAny?.code || errAny?.status || (errObj.message.includes('resource_exhausted') ? 'RESOURCE_EXHAUSTED' : undefined);

  let userFriendlyMessage = errObj.message;

  // Tradução e tratamento de exceções conhecidas para exibição visual amigável
  if (errObj.message.includes('resource_exhausted') || errObj.message.includes('quota') || code === 'RESOURCE_EXHAUSTED' || code === 429) {
    userFriendlyMessage = 'Limite de cota da API de IA atingido temporariamente. Contingência local ativada com sucesso.';
  } else if (errObj.message.includes('overloaded') || errObj.message.includes('503')) {
    userFriendlyMessage = 'Servidores do modelo de IA temporariamente sobrecarregados. Fallback de contingência acionado.';
  } else if (errObj.message.includes('Failed to fetch') || errObj.message.includes('NetworkError')) {
    userFriendlyMessage = 'Falha de conexão com a rede externa. Dados preservados localmente.';
  } else if (code === 'auth/unauthorized-domain') {
    userFriendlyMessage = 'Domínio atual não autorizado no Firebase Console.';
  } else if (code === 'permission-denied') {
    userFriendlyMessage = 'Acesso não autorizado pelo Firestore.';
  } else if (source === 'pipeline') {
    userFriendlyMessage = `Transição de contingência no pipeline: ${stage || 'Falha de comunicação entre motores de IA'}.`;
  } else if (source === 'parsing') {
    userFriendlyMessage = `Erro de análise de dados (parsing): ${stage || 'Formato de resposta inesperado'}.`;
  }

  const exceptionRecord: LocalException = {
    id: 'exc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    source,
    stage,
    message: userFriendlyMessage,
    originalError: errObj.message,
    stack: errObj.stack,
    code: code ? String(code) : undefined,
    context,
    blockedFromVoice: true, // Rigorosamente isolado da síntese de voz
    recovered: true,
    metadata
  };

  localExceptionsHistory.unshift(exceptionRecord);
  if (localExceptionsHistory.length > MAX_EXCEPTIONS_LOG) {
    localExceptionsHistory.pop();
  }

  persistExceptions();

  // Encaminhado EXCLUSIVAMENTE para os logs do console
  console.error(`[Tratador de Exceções Local - ${source.toUpperCase()} - ${stage || 'GERAL'}]:`, {
    mensagemTratada: exceptionRecord.message,
    erroOriginal: exceptionRecord.originalError,
    origem: exceptionRecord.context,
    estagio: exceptionRecord.stage,
    codigo: exceptionRecord.code,
    isoladoDaVoz: true,
    stack: exceptionRecord.stack,
    metadata: exceptionRecord.metadata
  });

  // Notifica ouvintes locais (UI, painel de administração)
  exceptionListeners.forEach((listener) => {
    try {
      listener(exceptionRecord);
    } catch (e) {
      console.warn('Erro ao notificar ouvinte de exceção:', e);
    }
  });

  return exceptionRecord;
}

/**
 * Captura especificamente falhas de pipeline e transição entre Groq e Gemini
 */
export function capturePipelineFailure(
  fromEngine: 'Groq' | 'Gemini',
  toEngine: 'Groq' | 'Gemini' | 'Offline',
  error: unknown,
  promptSnippet?: string,
  stage: string = 'pipeline-fallback'
): LocalException {
  const shortSnippet = promptSnippet ? (promptSnippet.length > 80 ? promptSnippet.substring(0, 80) + '...' : promptSnippet) : undefined;
  
  return captureLocalException(
    error,
    'pipeline',
    `Transição de Pipeline: ${fromEngine} ➔ ${toEngine}`,
    stage,
    {
      motorOrigem: fromEngine,
      motorDestino: toEngine,
      snippetRequisicao: shortSnippet
    }
  );
}

/**
 * Captura erros de análise (parsing de JSON, markdown ou argumentos de tool) entre Groq e Gemini
 */
export function captureParsingError(
  engine: 'Groq' | 'Gemini' | 'JSON',
  rawContent: unknown,
  parseError: unknown,
  stage: string = 'response-parsing'
): LocalException {
  const rawString = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
  const snippet = rawString.length > 200 ? rawString.substring(0, 200) + '...' : rawString;

  return captureLocalException(
    parseError,
    'parsing',
    `Erro de Parsing no motor ${engine}`,
    stage,
    {
      motor: engine,
      payloadSnippet: snippet
    }
  );
}

/**
 * Assina para ser notificado de novas exceções locais em tempo real
 */
export function onLocalException(listener: (exception: LocalException) => void): () => void {
  exceptionListeners.push(listener);
  return () => {
    const idx = exceptionListeners.indexOf(listener);
    if (idx >= 0) exceptionListeners.splice(idx, 1);
  };
}

/**
 * Retorna histórico de exceções locais capturadas
 */
export function getLocalExceptions(): LocalException[] {
  return [...localExceptionsHistory];
}

/**
 * Limpa o histórico de exceções locais
 */
export function clearLocalExceptions(): void {
  localExceptionsHistory.length = 0;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Exporta relatório de exceções em formato JSON para auditoria
 */
export function exportExceptionsAsJSON(): string {
  return JSON.stringify(localExceptionsHistory, null, 2);
}

/**
 * Simula um teste de interceptação local para validação no Admin
 */
export function simulateLocalExceptionTest(): LocalException {
  const simulatedError = new Error("Simulação controlada: Falha de conexão na API Groq (HTTP 429 Rate Limit) e recuperação com Gemini.");
  return capturePipelineFailure('Groq', 'Gemini', simulatedError, 'Simulação de teste de pipeline acionada no painel admin', 'teste-simulacao-admin');
}

/**
 * Inicializa os tratadores globais do navegador (window.onerror e unhandledrejection)
 */
export function initGlobalExceptionHandlers(): void {
  if (typeof window === 'undefined') return;

  // Tratador global de erros síncronos
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver loop') || event.message?.includes('Script error')) {
      return;
    }
    captureLocalException(
      event.error || event.message,
      'window',
      `Linha: ${event.lineno}, Col: ${event.colno}`,
      'window-runtime-error'
    );
  });

  // Tratador global de Promises rejeitadas sem catch
  window.addEventListener('unhandledrejection', (event) => {
    captureLocalException(
      event.reason,
      'window',
      'Promise Rejeitada',
      'unhandled-rejection'
    );
    event.preventDefault();
  });
}

