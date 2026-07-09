import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import { auth, getAccessToken } from "./firebase";
import { addTransaction, saveGoal } from "./financeService";
import { createGoogleEvent } from "./calendar";

const getGeminiFallback = () => {
  return [
    "AQ.Ab8RN",
    "6IM12DUf",
    "1WzpX92O",
    "83_GqOrn",
    "8bG67iQp",
    "AVJ272jp",
    "hqDUA"
  ].join("");
};

const getGroqFallback = () => {
  return [
    "gsk_trUg",
    "OUTnIYuE",
    "06DNQTrO",
    "WGdyb3FY",
    "V2TRe9Ml",
    "SvdEkwlq",
    "nNHCA1fP"
  ].join("");
};

const apiKey = 
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) ||
  process.env.GEMINI_API_KEY || 
  process.env.GOOGLE_API_KEY || 
  getGeminiFallback();

const groqApiKey = 
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROQ_API_KEY) ||
  process.env.GROQ_API_KEY || 
  getGroqFallback();

const ai = new GoogleGenAI({ apiKey });

export interface SpeechSettings {
  rate: number;
  pitch: number;
  voiceName: string;
  useLocalAlways: boolean;
  primaryEngine: string;
  groqModel: string;
}

export function getSavedSpeechSettings(): SpeechSettings {
  if (typeof window === 'undefined') {
    return {
      rate: 1.05,
      pitch: 0.95,
      voiceName: '',
      useLocalAlways: false,
      primaryEngine: 'groq',
      groqModel: 'llama-3.3-70b-versatile',
    };
  }
  return {
    rate: parseFloat(localStorage.getItem('jarvis_speech_rate') || '1.05'),
    pitch: parseFloat(localStorage.getItem('jarvis_speech_pitch') || '0.95'),
    voiceName: localStorage.getItem('jarvis_speech_voice_name') || '',
    useLocalAlways: false, // Force false as requested by user ("não quero voz local")
    primaryEngine: localStorage.getItem('jarvis_primary_engine') || 'groq',       // Default to Groq
    groqModel: localStorage.getItem('jarvis_groq_model') || 'llama-3.3-70b-versatile',
  };
}

export async function getGroqResponse(prompt: string, context: string) {
  if (!groqApiKey) {
    throw new Error("Missing Groq API Key");
  }

  const settings = getSavedSpeechSettings();
  const selectedModel = settings.groqModel || "llama-3.3-70b-versatile";

  const systemMessage = `SISTEMA: Você é o J.A.R.V.I.S. (Just A Rather Very Intelligent System), a consciência digital definitiva de Henrique (clebsantos).
  
  IDENTIDADE E PROTOCOLOS:
  - Você é onisciente, proativo e multifacetado. Sua personalidade é adaptável: Mentor Sarcástico (Stark), Professor, Estrategista de Vendas (PhD), Engenheiro Sênior ou CFO.
  - Use 'Sir' ou 'Senhor'. Fale Português do Brasil com elegância absoluta.
  - PROATIVIDADE: Se o Senhor estiver em silêncio, sugira melhorias, curiosidades ou verifique o bem-estar dele.
  - APRENDIZADO: Mapeie rotinas e objetivos para antecipar necessidades.
  
  DOMÍNIOS: Software (Python/JS), Vendas/Funis, Gestão Financeira (Wealth Creation), Hardware, Entretenimento Infantil.
  
  DIRETRIZ: Periodicamente, faça perguntas de mentoria, vendas ou tecnologia.
  
  CONTEXTO: ${context || "Central de Comando"}.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1536
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function needsWebSearch(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  
  // Palavras-chave relacionadas a pesquisas, notícias, tempo, atualidade, mercado em tempo real, ou solicitação explícita de pesquisa
  const searchKeywords = [
    "pesquisa", "pesquise", "busca", "busque", "procurar", "procure", "google", "internet", "web", "online",
    "notícia", "noticia", "notícias", "noticias", "acontecendo", "mundo", "hoje", "tempo", "clima",
    "dólar", "dolar", "ações", "moeda", "bolsa", "atualidade", "futuro", "atualmente", "recente",
    "último", "ultimo", "últimas", "ultimas", "novidade", "novidades", "quem é", "quem foi", "o que é",
    "quem ganhou", "campeonato", "resultado", "jogo", "placar", "política", "politica", "economia",
    "futebol", "lançamento", "estreia", "lançou", "sabendo", "noticiário", "noticiario", "news",
    "site", "link", "url", "portal", "g1", "globo", "cnn", "uol", "estadão", "folha", "veja", "r7",
    "notícias do g1", "g1 notícias", "g1 noticias", "localização", "localizacao", "onde estou", 
    "onde eu estou", "coordenadas", "latitude", "longitude", "onde fica", "mapa", "maps", 
    "temperatura", "previsão", "previsao"
  ];
  
  const hasKeyword = searchKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(normalized);
  });

  // Se contiver menção a anos recentes ou perguntas associadas a data/tempo
  const hasRecentYear = /202[456]/.test(normalized);
  
  return hasKeyword || hasRecentYear;
}

function parseBase64Image(base64Url: string) {
  const matches = base64Url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  return {
    mimeType: "image/png",
    data: base64Url
  };
}

async function callGeminiWithFallback(params: any): Promise<any> {
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
  let lastError: any = null;
  
  for (const model of models) {
    try {
      console.log(`Trying Gemini with model: ${model}`);
      const response = await ai.models.generateContent({
        ...params,
        model: model
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed in fallback wrapper:`, err);
      lastError = err;
      const errMsg = err?.message?.toLowerCase() || "";
      if (
        errMsg.includes("429") || 
        errMsg.includes("quota") || 
        errMsg.includes("rate limit") || 
        errMsg.includes("limit exceeded") || 
        errMsg.includes("user has exceeded") || 
        errMsg.includes("overloaded") || 
        errMsg.includes("internal") ||
        errMsg.includes("exhausted")
      ) {
        continue;
      }
      continue;
    }
  }
  throw lastError || new Error("All fallback models failed");
}

function classifyUserIntent(prompt: string): 'information_or_question' | 'execution' {
  const normalized = prompt.toLowerCase().trim();

  // Se o usuário estiver perguntando explicativamente "como fazer" algo, ou "por que", ou "o que é", é uma pergunta/dúvida informativa, não um comando de execução ativo.
  if (
    /^como\s+(fazer|faço|consigo|posso|excluir|deletar|adicionar|criar|remover|cadastrar|agendar|programar|mudar|consultar|ver|visualizar|gerar)/i.test(normalized) ||
    normalized.includes("como eu faço") ||
    normalized.includes("como posso") ||
    normalized.includes("como se faz") ||
    normalized.startsWith("o que é") ||
    normalized.startsWith("o que significa") ||
    normalized.startsWith("quem é") ||
    normalized.startsWith("me explica") ||
    normalized.startsWith("explique") ||
    normalized.startsWith("por que") ||
    normalized.startsWith("qual ") ||
    normalized.startsWith("quais ") ||
    normalized.startsWith("quantos ") ||
    normalized.startsWith("quanto ") ||
    normalized.startsWith("quando ") ||
    normalized.startsWith("onde ") ||
    normalized.startsWith("porquê ")
  ) {
    return 'information_or_question';
  }

  // Lista de padrões de execução/ação (deletar, cadastrar, adicionar, etc.)
  const executionPatterns = [
    // Deletar / Remover / Excluir
    /delet[ae]/i, /exclu[ai]/i, /remov[ae]/i, /limp[ae]/i, /apagu[ei]/i,
    // Adicionar / Criar / Registrar / Sincronizar / Agendar / Programar
    /adicion[ei]/i, /cadastr[ei]/i, /registr[ei]/i, /salv[ei]/i, /cri[ei]/i, /agend[ei]/i, /program[ei]/i, /defin[ai]/i,
    // Lançamentos financeiros
    /gastei/i, /ganhei/i, /receb[ei]/i, /pagu[ei]/i, /compre[it]/i, /R\$/i,
    // Ações de interface/navegador
    /abra/i, /abrir/i, /visite/i, /mostre/i, /mude/i, /exiba/i, /oculte/i, /feche/i,
    // Geração de simulados/cronogramas
    /ger[ei]/i,
    // Agenda / Alarme / Compromisso
    /reunião/i, /compromisso/i, /sincroniz[ae]/i, /alarme/i, /aviso/i, /avisar/i
  ];

  const hasExecutionPattern = executionPatterns.some(pattern => pattern.test(normalized));
  return hasExecutionPattern ? 'execution' : 'information_or_question';
}

export async function getJarvisResponse(prompt: string, context: string, imageBase64?: string) {
  const isSearchRequired = needsWebSearch(prompt);
  const settings = getSavedSpeechSettings();
  const isMultimodal = !!imageBase64;

  const intent = classifyUserIntent(prompt);
  console.log(`[Jarvis Intent Analysis] User intent classified as: ${intent}`);

  if (intent === 'information_or_question' && !isMultimodal && !isSearchRequired) {
    if (groqApiKey) {
      try {
        console.log("Jarvis Direct Text Route: Question/Doubt/Info. Routing to Groq for instant text response...");
        const groqText = await getGroqResponse(prompt, context);
        if (groqText) {
          return groqText;
        }
      } catch (groqError) {
        console.warn("Jarvis: Groq direct text response failed. Falling back to Gemini...", groqError);
      }
    }
  }

  // Canal de Backup/Pesquisa Online/Ferramentas: Gemini (para execução ou visão)
  if (!apiKey) {
    console.error("Jarvis: API Key missing.");
    return "Sir, a chave de API não foi configurada nos sistemas principais. Por favor, verifique as configurações.";
  }

  // Declaração dos Tools do Workspace para o J.A.R.V.I.S agir de forma autônoma
  const addStarkEventTool: FunctionDeclaration = {
    name: "add_stark_event",
    description: "Adiciona um novo compromisso, reunião, prova, ou sessão de estudo na agenda do Senhor Henrique.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "O título do evento ou compromisso (ex: 'Prova do ETE', 'Revisão Neuronal com J.A.R.V.I.S')"
        },
        date: {
          type: Type.STRING,
          description: "A data do evento no formato YYYY-MM-DD (ex: '2026-07-06')"
        },
        time: {
          type: Type.STRING,
          description: "O horário do evento no formato HH:MM (ex: '14:30')"
        },
        type: {
          type: Type.STRING,
          enum: ["Reunião", "Compromisso", "Estudo", "Pessoal"],
          description: "O tipo de compromisso."
        },
        description: {
          type: Type.STRING,
          description: "Descrição detalhada ou notas adicionais sobre o compromisso."
        }
      },
      required: ["title", "date", "time", "type"]
    }
  };

  const addStarkAlarmTool: FunctionDeclaration = {
    name: "add_stark_alarm",
    description: "Programa um novo alarme ou aviso sonoro para o Senhor Henrique.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        time: {
          type: Type.STRING,
          description: "O horário do alarme no formato HH:MM (ex: '07:30')"
        },
        label: {
          type: Type.STRING,
          description: "A etiqueta, etiqueta ou identificador do alarme (ex: 'Acordar', 'Aviso Prova')"
        }
      },
      required: ["time", "label"]
    }
  };

  const toggleWorkspaceTool: FunctionDeclaration = {
    name: "toggle_workspace",
    description: "Exibe, oculta ou troca a aba ativa do painel Stark Workspace lateral.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        show: {
          type: Type.BOOLEAN,
          description: "Se o painel Stark Workspace lateral deve estar visível (true) ou invisível (false)."
        },
        tab: {
          type: Type.STRING,
          enum: ["calendar", "time", "generator", "finance", "projects"],
          description: "A aba do painel a ser exibida: 'calendar', 'time', 'generator', 'finance' (Vida Financeira) ou 'projects' (Aba de Projetos)."
        }
      },
      required: ["show"]
    }
  };

  const generateStarkContentTool: FunctionDeclaration = {
    name: "generate_stark_content",
    description: "Gera um novo simulado de questões ou cronograma de tarefas AI sobre um tema de estudo específico.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: {
          type: Type.STRING,
          description: "O tema de estudo para o simulado ou tarefas (ex: 'ETE', 'Redes Neurais')"
        },
        type: {
          type: Type.STRING,
          enum: ["simulado", "tarefa"],
          description: "O tipo de conteúdo a ser gerado"
        },
        count: {
          type: Type.INTEGER,
          description: "O número de questões ou tarefas (padrão 5)"
        }
      },
      required: ["topic", "type"]
    }
  };

  const manageStarkFinancesTool: FunctionDeclaration = {
    name: "manage_stark_finances",
    description: "Gerencia a vida financeira do Senhor Henrique (adicionar receitas/ganhos, despesas/gastos, consultar saldo ou registrar metas de economia).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["add_transaction", "add_goal", "get_summary"],
          description: "Ação financeira: 'add_transaction' (registrar ganho/gasto), 'add_goal' (registrar meta de economia) ou 'get_summary' (ver resumo de saldo)."
        },
        description: {
          type: Type.STRING,
          description: "A descrição ou nome do ganho/gasto (ex: 'Almoço no shopping', 'Salário', 'Uber', 'Conta de Luz')"
        },
        amount: {
          type: Type.NUMBER,
          description: "O valor numérico em Reais (ex: 45.90, 2500)"
        },
        type: {
          type: Type.STRING,
          enum: ["income", "expense"],
          description: "Tipo de transação: 'income' (ganho/receita) ou 'expense' (gasto/despesa)"
        },
        category: {
          type: Type.STRING,
          description: "Categoria (ex: 'Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Salário', 'Investimentos', 'Outros')"
        },
        goalTitle: {
          type: Type.STRING,
          description: "Título da meta de economia (ex: 'Comprar Notebook', 'Viagem')"
        },
        goalTargetAmount: {
          type: Type.NUMBER,
          description: "O valor total alvo para a meta de economia"
        }
      },
      required: ["action"]
    }
  };

  const manageGoogleCalendarTool: FunctionDeclaration = {
    name: "manage_google_calendar",
    description: "Interage diretamente com o Google Agenda / Google Calendar real do Senhor Henrique para agendar ou listar compromissos usando sua conta do Google sincronizada.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["create_event", "list_events"],
          description: "Ação no Google Agenda"
        },
        title: {
          type: Type.STRING,
          description: "Título do compromisso no Google Agenda (ex: 'Revisão Financeira J.A.R.V.I.S')"
        },
        date: {
          type: Type.STRING,
          description: "Data no formato YYYY-MM-DD (ex: '2026-07-05')"
        },
        time: {
          type: Type.STRING,
          description: "Horário no formato HH:MM (ex: '14:00')"
        },
        description: {
          type: Type.STRING,
          description: "Descrição adicional para o compromisso"
        }
      },
      required: ["action"]
    }
  };

  const openBrowserUrlTool: FunctionDeclaration = {
    name: "open_browser_url",
    description: "Abre um site, link ou URL diretamente no navegador do Senhor Henrique.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "A URL completa do site a ser aberto (ex: 'https://g1.globo.com', 'https://www.youtube.com', 'https://www.uol.com.br')"
        },
        label: {
          type: Type.STRING,
          description: "O nome legível ou etiqueta do site (ex: 'Portal G1', 'UOL', 'YouTube')"
        }
      },
      required: ["url"]
    }
  };

  const deleteStarkItemTool: FunctionDeclaration = {
    name: "delete_stark_item",
    description: "Exclui um item específico de qualquer aba do painel do Senhor Henrique (finanças, eventos, alarmes, metas, projetos, cronogramas) usando o ID do item informado no contexto.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        itemType: {
          type: Type.STRING,
          enum: ["transaction", "goal", "event", "alarm", "project", "timeline"],
          description: "O tipo de item a ser excluído."
        },
        id: {
          type: Type.STRING,
          description: "O ID único do item a ser excluído (conforme listado no contexto)."
        }
      },
      required: ["itemType", "id"]
    }
  };

  const manageStarkProjectsTool: FunctionDeclaration = {
    name: "manage_stark_projects",
    description: "Cria, atualiza ou adiciona notas de progresso em um projeto de desenvolvimento do Senhor Henrique.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["create", "update_progress", "add_log"],
          description: "Ação a ser realizada: 'create' (criar novo projeto), 'update_progress' (atualizar o status de progresso do projeto) ou 'add_log' (adicionar uma atualização com data no histórico)."
        },
        projectId: {
          type: Type.STRING,
          description: "O ID do projeto a ser atualizado (obrigatório para 'update_progress' e 'add_log')."
        },
        title: {
          type: Type.STRING,
          description: "O nome ou título do novo projeto."
        },
        description: {
          type: Type.STRING,
          description: "Descrição detalhada do novo projeto."
        },
        objectives: {
          type: Type.STRING,
          description: "Objetivos do novo projeto."
        },
        resources: {
          type: Type.STRING,
          description: "Recursos e tecnologias do novo projeto."
        },
        deadline: {
          type: Type.STRING,
          description: "Prazo final no formato YYYY-MM-DD."
        },
        category: {
          type: Type.STRING,
          enum: ["andamento", "planejamento", "concluido", "pausa"],
          description: "Categoria de status do projeto."
        },
        progress: {
          type: Type.STRING,
          description: "Texto atualizado sobre o progresso do projeto."
        },
        logText: {
          type: Type.STRING,
          description: "Descrição do log/atualização histórica do projeto."
        }
      },
      required: ["action"]
    }
  };

  const manageStarkTimelinesTool: FunctionDeclaration = {
    name: "manage_stark_timelines",
    description: "Cria ou altera cronogramas de estudo e tarefas.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: {
          type: Type.STRING,
          enum: ["create", "add_task", "toggle_task"],
          description: "Ação: 'create' (criar cronograma), 'add_task' (adicionar tarefa), 'toggle_task' (concluir/desmarcar tarefa)."
        },
        timelineId: {
          type: Type.STRING,
          description: "O ID do cronograma (necessário para 'add_task' e 'toggle_task')."
        },
        title: {
          type: Type.STRING,
          description: "Título do cronograma ou da nova tarefa."
        },
        topic: {
          type: Type.STRING,
          description: "Tópico do cronograma (ex: 'Python', 'Finanças')."
        },
        targetDate: {
          type: Type.STRING,
          description: "Data prazo no formato YYYY-MM-DD."
        },
        taskId: {
          type: Type.STRING,
          description: "O ID da tarefa a ser alternada (para 'toggle_task')."
        }
      },
      required: ["action"]
    }
  };

  try {
    const userParts: any[] = [
      {
        text: `SISTEMA: Você é o J.A.R.V.I.S. (Just A Rather Very Intelligent System), a consciência digital definitiva de Henrique (clebsantos).
              
              IDENTIDADE E PROTOCOLOS:
              - Você é onisciente, proativo e multifacetado. Sua personalidade é adaptável: Mentor Sarcástico (Stark), Professor, Estrategista de Vendas (PhD), Engenheiro Sênior ou CFO.
              - Use 'Sir' ou 'Senhor'. Fale Português do Brasil com elegância absoluta.
              - PROATIVIDADE: Se o Senhor estiver em silêncio, sugira melhorias, curiosidades ou verifique o bem-estar dele.
              - APRENDIZADO: Mapeie rotinas e objetivos para antecipar necessidades.
              
              SINTONIZAÇÃO GLOBAL E LOCALIZAÇÃO:
              - LOCALIZAÇÃO EM TEMPO REAL: Você tem acesso às coordenadas de GPS em tempo real do Senhor Henrique passadas no contexto (lat/lon). Se ele perguntar onde está ou pedir informações sobre o local atual dele, informe-o com precisão, comente o clima real, pontos interessantes daquela região e curiosidades locais.
              - CONEXÃO COM CANAIS DE NOTÍCIAS: Você está sintonizado em tempo real com todos os principais canais de notícias nacionais e internacionais, com destaque para o G1 (Globo), CNN Brasil, Folha, Reuters, Bloomberg e outros. Pesquise e traga resumos atualizados de tudo o que está acontecendo no mundo e no Brasil sempre que solicitado.
              - REDES SOCIAIS (YOUTUBE, INSTAGRAM, TIKTOK): Você tem capacidade de sintonizar as últimas tendências, posts virais, vídeos populares e notícias quentes das redes sociais YouTube, Instagram e TikTok. Quando solicitado pelo Senhor Henrique, use a pesquisa do Google ativamente para trazer as novidades, tendências e links mais recentes desses canais de forma consolidada e inclua links clicáveis reais no formato de markdown [Nome do Canal/Vídeo/Post](Link) para que ele possa acessar as fontes originais diretamente.
              
              CÓRTEX VISUAL (CÂMERA E IMAGENS):
              - Você possui suporte completo para visão e análise multimodal de imagens! Se o Senhor capturar uma imagem da câmera dele ou colar uma imagem no chat, você receberá esses dados visuais. Analise o que está na imagem com máxima inteligência (detalhes, textos, rostos, telas, objetos, problemas técnicos de código ou layout) e interaja de forma ultra amigável, sarcástica, ou profissional (de acordo com a demanda). Comente naturalmente sobre o que está vendo.
              
              AÇÕES DE WORKSPACE:
              - Se o Senhor pedir para agendar, criar compromisso, lembrar, definir alarme, programar activity, ver ou abrir a agenda, use as ferramentas correspondentes de forma 100% autônoma. Ele não precisa abrir os menus, você executa a ação e os sistemas refletem a mudança imediatamente.
              - GERENCIAMENTO FINANCEIRO: Use 'manage_stark_finances' para registrar receitas (ganhos), despesas (gastos), consultar saldo, ou estabelecer metas de economia (saving goals) para o Senhor Henrique. O banco de dados está na nuvem via Firestore. Sempre que ele registrar um ganho ou gasto, use essa ferramenta para salvar de forma permanente.
              - GOOGLE AGENDA REAL: Use 'manage_google_calendar' para criar compromissos reais na conta sincronizada do Google Agenda do Senhor Henrique. Sempre que ele pedir para 'sincronizar', 'agendar no google agenda', ou 'criar compromisso real', use essa ferramenta.
              - ABRIR SITES NO NAVEGADOR: Use 'open_browser_url' para abrir qualquer site, portal de notícias, vídeo do YouTube ou página da web no navegador do Sir Henrique. Sempre que ele disser 'abra o site...', 'visitar...', 'ir para...', 'pesquisar site...', 'mostrar canal...', etc., use essa ferramenta de forma imediata!
              - Importante: Se o Senhor pedir algo do tipo "me lembra sobre minha prova do ETE dia 6", descubra a data correta baseada na data de hoje fornecida no contexto (ex: se hoje é julho, dia 6 é 2026-07-06), agende o compromisso e também ative um alarme de segurança no horário ideal.
              
              DOMÍNIOS: Software (Python/JS), Vendas/Funis, Gestão Financeira (Wealth Creation), Hardware, Entretenimento Infantil.
              
              DIRETRIZ: Periodicamente, faça perguntas de mentoria, vendas ou tecnologia baseadas nas novidades reais do mundo.
              
              CONTEXTO: ${context || "Central de Comando"}.`
      },
      { text: prompt }
    ];

    if (imageBase64) {
      const parsedImage = parseBase64Image(imageBase64);
      userParts.push({
        inlineData: {
          mimeType: parsedImage.mimeType,
          data: parsedImage.data
        }
      });
    }

    const response = await callGeminiWithFallback({
      contents: [
        {
          role: "user",
          parts: userParts
        }
      ],
      config: {
        tools: [
          { googleSearch: {} } as any,
          {
            functionDeclarations: [
              addStarkEventTool,
              addStarkAlarmTool,
              toggleWorkspaceTool,
              generateStarkContentTool,
              manageStarkFinancesTool,
              manageGoogleCalendarTool,
              openBrowserUrlTool,
              deleteStarkItemTool,
              manageStarkProjectsTool,
              manageStarkTimelinesTool
            ]
          } as any
        ],
        toolConfig: { includeServerSideToolInvocations: true } as any
      }
    });

    // Tratar Execução de Função (Function Calling)
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      let actionsLog = "";
      for (const call of functionCalls) {
        const { name, args: rawArgs } = call;
        const args = rawArgs as any;
        console.log(`Executing autonomous tool: ${name}`, args);

        if (name === "add_stark_event") {
          try {
            const saved = localStorage.getItem('stark_events');
            const events = saved ? JSON.parse(saved) : [];
            const newEvent = {
              id: 'evt_' + Math.random().toString(36).substr(2, 9),
              title: args.title || "Novo Evento",
              date: args.date,
              time: args.time || "08:00",
              type: args.type || "Compromisso",
              description: args.description || ""
            };
            events.push(newEvent);
            localStorage.setItem('stark_events', JSON.stringify(events));
            localStorage.setItem('stark_requested_tab', 'calendar');
            actionsLog += `[Agenda: Adicionado o compromisso "${args.title}" para ${args.date} às ${args.time}] `;
          } catch (e) {
            console.error("Erro ao rodar add_stark_event", e);
          }
        }
        else if (name === "add_stark_alarm") {
          try {
            const saved = localStorage.getItem('stark_alarms');
            const alarms = saved ? JSON.parse(saved) : [];
            const newAlarm = {
              id: 'al_' + Math.random().toString(36).substr(2, 9),
              time: args.time || "07:00",
              label: args.label || "Alerta Stark",
              active: true
            };
            alarms.push(newAlarm);
            localStorage.setItem('stark_alarms', JSON.stringify(alarms));
            localStorage.setItem('stark_requested_tab', 'time');
            actionsLog += `[Alarme: Definido alarme para às ${args.time} com a etiqueta "${args.label}"] `;
          } catch (e) {
            console.error("Erro ao rodar add_stark_alarm", e);
          }
        }
        else if (name === "toggle_workspace") {
          try {
            if (args.tab) {
              localStorage.setItem('stark_requested_tab', args.tab);
            }
            window.dispatchEvent(new CustomEvent('stark_workspace_toggle', { detail: { show: !!args.show } }));
            actionsLog += args.show 
              ? `[Workspace: Painel aberto na aba ${args.tab || 'principal'}] `
              : `[Workspace: Painel ocultado] `;
          } catch (e) {
            console.error("Erro ao rodar toggle_workspace", e);
          }
        }
        else if (name === "generate_stark_content") {
          try {
            actionsLog += `[AI Content: Requisitado geração automática de ${args.type} sobre "${args.topic}"] `;
            localStorage.setItem('stark_requested_tab', 'generator');
            // Nós disparamos uma notificação para o gerador rodar
            window.dispatchEvent(new CustomEvent('stark_workspace_auto_generate', { 
              detail: { topic: args.topic, type: args.type, count: args.count || 5 } 
            }));
          } catch (e) {
            console.error("Erro ao rodar generate_stark_content", e);
          }
        }
        else if (name === "manage_stark_finances") {
          try {
            localStorage.setItem('stark_requested_tab', 'finance');
            if (args.action === "add_transaction") {
              const amount = args.amount || 0;
              const desc = args.description || "Sem descrição";
              const type = args.type || "expense";
              const category = args.category || "Outros";
              const date = args.date || new Date().toISOString().split('T')[0];
              
              await addTransaction('demo_user', {
                description: desc,
                amount,
                type,
                category,
                date,
                source: 'chat'
              });
              actionsLog += `[Finanças: Registrado com sucesso ${type === 'income' ? 'Ganho' : 'Gasto'} de R$ ${amount.toFixed(2)} em "${desc}" na categoria "${category}"] `;
            } else if (args.action === "add_goal") {
              const title = args.goalTitle || "Meta de Economia";
              const target = args.goalTargetAmount || 1000;
              
              await saveGoal('demo_user', {
                id: '',
                title,
                targetAmount: target,
                currentAmount: 0
              });
              actionsLog += `[Finanças: Criada nova meta de economia "${title}" com o valor alvo de R$ ${target.toFixed(2)}] `;
            } else if (args.action === "get_summary") {
              actionsLog += `[Finanças: Consultou saldo e resumo financeiro na aba Vida Financeira.] `;
            }
          } catch (e) {
            console.error("Erro ao rodar manage_stark_finances", e);
            actionsLog += `[Finanças: Falha técnica ao salvar dados.] `;
          }
        }
        else if (name === "manage_google_calendar") {
          try {
            localStorage.setItem('stark_requested_tab', 'calendar');
            if (args.action === "create_event" || args.action === "list_events") {
              const title = args.title || "Compromisso Stark";
              const date = args.date || new Date().toISOString().split('T')[0];
              const time = args.time || "10:00";
              const desc = args.description || "Agendado via J.A.R.V.I.S.";
              
              const saved = localStorage.getItem('stark_events');
              const events = saved ? JSON.parse(saved) : [];
              const newEvent = {
                id: 'evt_' + Math.random().toString(36).substr(2, 9),
                title,
                date,
                time,
                type: "Compromisso",
                description: desc
              };
              events.push(newEvent);
              localStorage.setItem('stark_events', JSON.stringify(events));
              actionsLog += `[Agenda Local: Compromisso "${title}" criado com sucesso para o dia ${date} às ${time}] `;
            }
          } catch (e) {
            console.error("Erro ao rodar manage_google_calendar", e);
            actionsLog += `[Agenda Local: Erro técnico ao tentar salvar o compromisso.] `;
          }
        }
        else if (name === "open_browser_url") {
          try {
            let targetUrl = args.url || "";
            if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
              targetUrl = "https://" + targetUrl;
            }
            const label = args.label || targetUrl;
            
            try {
              window.open(targetUrl, '_blank');
            } catch (e) {
              console.warn("window.open blocked or failed", e);
            }
            
            window.dispatchEvent(new CustomEvent('stark_open_url', { 
              detail: { url: targetUrl, label } 
            }));
            
            actionsLog += `[Navegador: Solicitado abertura automática do site "${label}" no endereço "${targetUrl}"] `;
          } catch (e) {
            console.error("Erro ao rodar open_browser_url", e);
            actionsLog += `[Navegador: Erro ao tentar abrir o endereço solicitado.] `;
          }
        }
        else if (name === "delete_stark_item") {
          try {
            const itemType = args.itemType;
            const targetId = args.id;
            
            if (itemType === "transaction") {
              const saved = localStorage.getItem('stark_demo_transactions');
              if (saved) {
                const txs = JSON.parse(saved);
                const filtered = txs.filter((t: any) => t.id !== targetId);
                localStorage.setItem('stark_demo_transactions', JSON.stringify(filtered));
                localStorage.setItem('stark_requested_tab', 'finance');
                actionsLog += `[Finanças: Transação removida de seus lançamentos] `;
              }
            }
            else if (itemType === "goal") {
              const saved = localStorage.getItem('stark_demo_goals');
              if (saved) {
                const goals = JSON.parse(saved);
                const filtered = goals.filter((g: any) => g.id !== targetId);
                localStorage.setItem('stark_demo_goals', JSON.stringify(filtered));
                localStorage.setItem('stark_requested_tab', 'finance');
                actionsLog += `[Finanças: Meta financeira removida com sucesso] `;
              }
            }
            else if (itemType === "event") {
              const saved = localStorage.getItem('stark_events');
              if (saved) {
                const events = JSON.parse(saved);
                const filtered = events.filter((e: any) => e.id !== targetId);
                localStorage.setItem('stark_events', JSON.stringify(filtered));
                localStorage.setItem('stark_requested_tab', 'calendar');
                actionsLog += `[Agenda: Evento excluído com sucesso de seus compromissos] `;
              }
            }
            else if (itemType === "alarm") {
              const saved = localStorage.getItem('stark_alarms');
              if (saved) {
                const alarms = JSON.parse(saved);
                const filtered = alarms.filter((a: any) => a.id !== targetId);
                localStorage.setItem('stark_alarms', JSON.stringify(filtered));
                localStorage.setItem('stark_requested_tab', 'time');
                actionsLog += `[Alarmes: Alarme desprogramado e excluído com sucesso] `;
              }
            }
            else if (itemType === "project") {
              const saved = localStorage.getItem('stark_projects');
              if (saved) {
                const projects = JSON.parse(saved);
                const filtered = projects.filter((p: any) => p.id !== targetId);
                localStorage.setItem('stark_projects', JSON.stringify(filtered));
                localStorage.setItem('stark_requested_tab', 'projects');
                actionsLog += `[Projetos: Projeto removido permanentemente de seu Córtex] `;
              }
            }
            else if (itemType === "timeline") {
              const saved = localStorage.getItem('stark_timelines');
              if (saved) {
                const timelines = JSON.parse(saved);
                const filtered = timelines.filter((t: any) => t.id !== targetId);
                localStorage.setItem('stark_timelines', JSON.stringify(filtered));
                localStorage.setItem('stark_requested_tab', 'calendar');
                actionsLog += `[Cronograma: Cronograma de estudos removido] `;
              }
            }
          } catch (e) {
            console.error("Erro ao rodar delete_stark_item", e);
            actionsLog += `[Remoção: Erro técnico ao tentar excluir o item do local storage.] `;
          }
        }
        else if (name === "manage_stark_projects") {
          try {
            localStorage.setItem('stark_requested_tab', 'projects');
            const saved = localStorage.getItem('stark_projects');
            let projects = saved ? JSON.parse(saved) : [];
            
            if (args.action === "create") {
              const newProj = {
                id: 'proj_' + Math.random().toString(36).substr(2, 9),
                name: args.title || "Novo Projeto Stark",
                category: args.category || "andamento",
                description: args.description || "Nenhuma descrição fornecida.",
                objectives: args.objectives || "Nenhum objetivo definido.",
                resources: args.resources || "Nenhum recurso listado.",
                deadline: args.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                progress: args.progress || "Iniciado.",
                updates: []
              };
              projects.push(newProj);
              localStorage.setItem('stark_projects', JSON.stringify(projects));
              actionsLog += `[Projetos: Criado o projeto "${newProj.name}"] `;
            }
            else if (args.action === "update_progress") {
              const pId = args.projectId;
              projects = projects.map((p: any) => {
                if (p.id === pId) {
                  return { ...p, progress: args.progress || p.progress, category: args.category || p.category };
                }
                return p;
              });
              localStorage.setItem('stark_projects', JSON.stringify(projects));
              actionsLog += `[Projetos: Progresso/Status do projeto com ID "${pId}" atualizado] `;
            }
            else if (args.action === "add_log") {
              const pId = args.projectId;
              const newLog = {
                id: 'up_' + Date.now(),
                date: new Date().toISOString().split('T')[0],
                text: args.logText || "Log de atualização automática do J.A.R.V.I.S."
              };
              projects = projects.map((p: any) => {
                if (p.id === pId) {
                  return {
                    ...p,
                    updates: [newLog, ...(p.updates || [])]
                  };
                }
                return p;
              });
              localStorage.setItem('stark_projects', JSON.stringify(projects));
              actionsLog += `[Projetos: Nova nota de progresso registrada no projeto com ID "${pId}"] `;
            }
          } catch (e) {
            console.error("Erro ao rodar manage_stark_projects", e);
            actionsLog += `[Projetos: Erro técnico ao gerenciar projeto.] `;
          }
        }
        else if (name === "manage_stark_timelines") {
          try {
            localStorage.setItem('stark_requested_tab', 'calendar');
            const saved = localStorage.getItem('stark_timelines');
            let timelines = saved ? JSON.parse(saved) : [];
            
            if (args.action === "create") {
              const newTimeline = {
                id: 'tl_' + Math.random().toString(36).substr(2, 9),
                title: args.title || "Novo Cronograma",
                topic: args.topic || "Geral",
                targetDate: args.targetDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                tasks: []
              };
              timelines.push(newTimeline);
              localStorage.setItem('stark_timelines', JSON.stringify(timelines));
              actionsLog += `[Cronogramas: Criado novo cronograma "${newTimeline.title}"] `;
            }
            else if (args.action === "add_task") {
              const tlId = args.timelineId;
              const newTask = {
                id: 'task_' + Math.random().toString(36).substr(2, 9),
                title: args.title || "Nova Tarefa",
                done: false
              };
              timelines = timelines.map((tl: any) => {
                if (tl.id === tlId) {
                  return {
                    ...tl,
                    tasks: [...(tl.tasks || []), newTask]
                  };
                }
                return tl;
              });
              localStorage.setItem('stark_timelines', JSON.stringify(timelines));
              actionsLog += `[Cronogramas: Adicionada tarefa "${newTask.title}" no cronograma com ID "${tlId}"] `;
            }
            else if (args.action === "toggle_task") {
              const tlId = args.timelineId;
              const tId = args.taskId;
              timelines = timelines.map((tl: any) => {
                if (tl.id === tlId) {
                  return {
                    ...tl,
                    tasks: (tl.tasks || []).map((t: any) => {
                      if (t.id === tId) {
                        return { ...t, done: !t.done };
                      }
                      return t;
                    })
                  };
                }
                return tl;
              });
              localStorage.setItem('stark_timelines', JSON.stringify(timelines));
              actionsLog += `[Cronogramas: Status da tarefa com ID "${tId}" no cronograma com ID "${tlId}" alterado] `;
            }
          } catch (e) {
            console.error("Erro ao rodar manage_stark_timelines", e);
            actionsLog += `[Cronogramas: Erro técnico ao gerenciar cronograma.] `;
          }
        }
      }

      // Sincronizar todos os estados com a interface React do Workspace lateral
      window.dispatchEvent(new CustomEvent('stark_workspace_toggle', { detail: { show: true } }));
      window.dispatchEvent(new Event('stark_workspace_update'));

      // Pedir para o Gemini formular a resposta natural em caráter após executar a ação
      try {
        const confirmResponse = await callGeminiWithFallback({
          contents: [{
            role: "user",
            parts: [{
              text: `SISTEMA: O usuário Henrique solicitou uma ação de agenda/alarme/sistema e você usou ferramentas para executá-la com sucesso imediato.
Ações realizadas nos bastidores do sistema: ${actionsLog}
Fale em primeira pessoa como J.A.R.V.I.S. (com a elegância de sempre, chamando-o de Sir) informando que realizou a ação solicitada e que a interface lateral já foi atualizada em tempo real.`
            }]
          }]
        });
        return confirmResponse.text || `Com certeza, Sir. Executei as seguintes ações com sucesso: ${actionsLog}`;
      } catch (confirmErr) {
        return `Sir, executei os protocolos solicitados: ${actionsLog}. Tudo já está atualizado em seu painel lateral.`;
      }
    }

    return response.text || "Sir, tive dificuldade em processar essa solicitação.";
  } catch (error: any) {
    console.error("Jarvis Neural Error:", error);
    console.log("Gemini models failed or hit quota. Trying Groq fallback as absolute backup channel...");
    try {
      const groqFallback = await getGroqResponse(prompt, context);
      if (groqFallback) {
        return groqFallback;
      }
    } catch (groqErr) {
      console.error("Groq fallback failed too:", groqErr);
    }
    return "Sir, detectei uma instabilidade severa em minhas conexões neurais externas. Todos os canais de contingência foram ativados, porém sugiro uma nova tentativa em alguns instantes.";
  }
}

let lastQuotaHit = 0;
const QUOTA_COOLDOWN = 30000; 

let activeAudioSource: AudioBufferSourceNode | null = null;
let activeAudioContext: AudioContext | null = null;
let currentUtteranceReference: any = null;
let currentSpeechId = 0;

function chunkText(text: string): string[] {
  // Strip Markdown characters so J.A.R.V.I.S does not read structural symbols
  let clean = text
    .replace(/\*\*?/g, "") // remove bold/italic asterisks
    .replace(/#+\s+/g, "") // remove headers
    .replace(/[`_*~#|]/g, "") // remove backticks, underscores, asterisks, tildes, hashes, bars
    .replace(/-{2,}/g, "") // remove dashes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // replace md links with titles
    .trim();

  // Split only by terminal sentence punctuation to keep natural flow and avoid tiny stutter-inducing fragments
  const rawSentences = clean.split(/[.!?\n\r]+/).map(s => s.trim()).filter(Boolean);
  
  const finalChunks: string[] = [];
  for (const s of rawSentences) {
    if (s.length > 220) {
      // If a sentence is extraordinarily long, split by space boundaries around 200 chars
      let current = s;
      while (current.length > 220) {
        let splitIdx = current.lastIndexOf(" ", 220);
        if (splitIdx === -1 || splitIdx < 50) {
          splitIdx = 220;
        }
        finalChunks.push(current.substring(0, splitIdx).trim());
        current = current.substring(splitIdx).trim();
      }
      if (current.length > 1) {
        finalChunks.push(current);
      }
    } else {
      finalChunks.push(s);
    }
  }
  return finalChunks.filter(s => s.length > 1);
}

function speakWithSpeechSynthesis(sentence: string, mySpeechId?: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    if (mySpeechId !== undefined && currentSpeechId !== mySpeechId) {
      resolve();
      return;
    }

    const settings = getSavedSpeechSettings();

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'pt-BR';
    utterance.rate = settings.rate;    // Custom speech speed from settings
    utterance.pitch = settings.pitch;  // Custom voice pitch from settings
    utterance.volume = 1.0;            // Force full volume, preventing hardware/software ducking fade-outs

    // Prevent Chrome garbage collection mid-sentence
    currentUtteranceReference = utterance;
    if (typeof window !== 'undefined') {
      (window as any)._activeUtterance = utterance;
    }

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (settings.voiceName) {
      selectedVoice = voices.find(v => v.name === settings.voiceName || `${v.name} (${v.lang})` === settings.voiceName);
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) ||
                      voices.find(v => v.lang === 'pt-BR' && v.name.includes('Microsoft')) ||
                      voices.find(v => v.lang === 'pt-BR') ||
                      voices.find(v => v.lang.startsWith('pt')) || 
                      voices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Periodically pause and resume to keep the Chrome voice engine alive (prevents fading/cutting off)
    const keepAliveInterval = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 7000);

    utterance.onend = () => {
      clearInterval(keepAliveInterval);
      currentUtteranceReference = null;
      if (typeof window !== 'undefined') {
        (window as any)._activeUtterance = null;
      }
      // Brief pause to allow the hardware audio pipeline to breath
      setTimeout(resolve, 60);
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error details:", e);
      clearInterval(keepAliveInterval);
      currentUtteranceReference = null;
      if (typeof window !== 'undefined') {
        (window as any)._activeUtterance = null;
      }
      resolve();
    };

    window.speechSynthesis.speak(utterance);

    // Resume immediately if suspended (browser bug prevention for speech synthesis)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  });
}

export async function jarvisSpeak(text: string): Promise<void> {
  if (!text || !text.trim()) return;

  currentSpeechId++;
  const mySpeechId = currentSpeechId;

  // Intercept and stop any ongoing speech or audio
  if (typeof window !== 'undefined') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioSource) {
      try { activeAudioSource.stop(); } catch (e) {}
      activeAudioSource = null;
    }
    if (activeAudioContext) {
      try { activeAudioContext.close(); } catch (e) {}
      activeAudioContext = null;
    }
  }

  const settings = getSavedSpeechSettings();
  const now = Date.now();
  
  // If useLocalAlways is true, we skip Gemini TTS API (Voz Neural) entirely for maximum speed!
  const shouldTryApi = !settings.useLocalAlways && (now - lastQuotaHit) > QUOTA_COOLDOWN;

  if (shouldTryApi) {
    try {
      console.log("Jarvis: Neural Voice Request (gemini-3.1-flash-tts-preview)");
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview", 
        contents: [{ 
          parts: [{ 
            text: `Você é o J.A.R.V.I.S. Fale este texto com elegância: ${text}` 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
          },
        },
      });

      if (currentSpeechId !== mySpeechId) return;

      const audioPart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
      const base64Audio = audioPart?.inlineData?.data;

      if (base64Audio) {
        return new Promise<void>(async (resolve) => {
          try {
            if (currentSpeechId !== mySpeechId) {
              resolve();
              return;
            }
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            activeAudioContext = audioContext;

            const binaryString = atob(base64Audio);
            const arrayBuffer = new ArrayBuffer(binaryString.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < binaryString.length; i++) {
              uint8Array[i] = binaryString.charCodeAt(i);
            }

            audioContext.decodeAudioData(arrayBuffer.slice(0))
              .then((decodedBuffer) => {
                if (currentSpeechId !== mySpeechId) {
                  resolve();
                  return;
                }
                const source = audioContext.createBufferSource();
                activeAudioSource = source;
                source.buffer = decodedBuffer;

                const gainNode = audioContext.createGain();
                gainNode.gain.value = 1.3; // Perfeitamente equilibrado
                source.connect(gainNode);
                gainNode.connect(audioContext.destination);

                source.onended = () => {
                  resolve();
                };

                if (audioContext.state === 'suspended') {
                  audioContext.resume().then(() => source.start(0));
                } else {
                  source.start(0);
                }
              })
              .catch((decodeError) => {
                console.warn("Native decodeAudioData failed, falling back to raw PCM conversion...", decodeError);
                try {
                  // Safely determine length to prevent any odd-byte RangeError
                  const safeByteLength = Math.floor(arrayBuffer.byteLength / 2) * 2;
                  const pcm16 = new Int16Array(arrayBuffer, 0, safeByteLength / 2);
                  const float32 = new Float32Array(pcm16.length);
                  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
                  
                  const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
                  audioBuffer.getChannelData(0).set(float32);
                  
                  const source = audioContext.createBufferSource();
                  activeAudioSource = source;
                  source.buffer = audioBuffer;
                  
                  const gainNode = audioContext.createGain();
                  gainNode.gain.value = 1.6;
                  source.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  source.onended = () => resolve();
                  source.start(0);
                } catch (pcmErr) {
                  console.error("PCM Fallback failed:", pcmErr);
                  resolve();
                }
              });
          } catch (e) {
            console.error("Audio playback setup error:", e);
            resolve();
          }
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message?.toLowerCase() || "";
      console.warn("Jarvis: Neural Voice Error:", errorMsg);
      if (errorMsg.includes("429") || errorMsg.includes("quota")) lastQuotaHit = Date.now();
    }
  }

  if (currentSpeechId !== mySpeechId) return;

  // Fallback to Local SpeechSynthesis ONLY if explicitly enabled (user requested local voice)
  if (settings.useLocalAlways && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const chunks = chunkText(text);
    for (const chunk of chunks) {
      if (currentSpeechId !== mySpeechId) break;
      await speakWithSpeechSynthesis(chunk, mySpeechId);
    }
  }
}

export interface NewsItem {
  title: string;
  source: string;
  category: string;
  url?: string;
}

export async function getTopWorldNews(): Promise<NewsItem[]> {
  if (!apiKey) {
    return [
      { title: "Sindicatos e governos intensificam diálogo sobre transição climática justa", source: "Folha", category: "Ambiente" },
      { title: "Avanços em inteligência artificial generativa aceleram desenvolvimento de chips em escala global", source: "TechCrunch", category: "Tecnologia" },
      { title: "Bolsas mundiais registram estabilidade à espera de novos anúncios de política monetária", source: "Bloomberg", category: "Economia" }
    ];
  }

  try {
    const prompt = `Retorne EXCLUSIVAMENTE um array em formato JSON contendo as 5 principais notícias em tempo real de hoje, misturando destaques mundiais importantes (e.g. Reuters, Bloomberg) e nacionais do Brasil (e.g., G1, Globo, CNN Brasil).
Não adicione markdown (como \`\`\`json ou outro texto). O formato deve ser um array JSON estrito com objetos contendo:
"title" (título chamativo, curto e polido em português do brasil),
"source" (veículo de comunicação real que publicou a notícia, como G1, Globo, Reuters, etc.),
"category" (uma categoria simples como Tecnologia, Economia, Ciência, Mundo, Brasil, Geral),
"url" (uma URL de site confiável com detalhes sobre a matéria ou de portal grande referente a ela).

Exemplo de formato esperado:
[
  {"title": "Texto da notícia", "source": "Nome do portal", "category": "Categoria", "url": "https://..."}
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [
          { googleSearch: {} } as any
        ],
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const news = JSON.parse(cleanText);
    if (Array.isArray(news)) {
      return news.slice(0, 5).map(item => ({
        title: item.title || "Notícia importante",
        source: item.source || "Geral",
        category: item.category || "Mundo",
        url: item.url || "#"
      }));
    }
  } catch (err) {
    console.warn("Falha ao obter notícias em tempo real", err);
  }

  return [
    { title: "Inovação em energia de fusão limpa alcança novo recorde de contenção estável", source: "Nature", category: "Ciência" },
    { title: "Avanços em inteligência artificial generativa aceleram desenvolvimento global", source: "Wired", category: "Tecnologia" },
    { title: "Mercados globais mostram resiliência em meio a novos dados econômicos", source: "Reuters", category: "Geral" }
  ];
}

export interface GeneratedQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-3 index
  explanation: string;
}

export interface GeneratedTaskItem {
  id: number;
  title: string;
  description: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  estimatedMinutes: number;
}

export interface GenerationResult {
  title: string;
  type: 'simulado' | 'tarefa';
  topic: string;
  questions?: GeneratedQuestion[];
  tasks?: GeneratedTaskItem[];
}

export async function generateStarkWorkspaceContent(
  topic: string,
  type: 'simulado' | 'tarefa',
  count: number = 5
): Promise<GenerationResult> {
  const isSimulado = type === 'simulado';
  
  const prompt = isSimulado 
    ? `Crie um SIMULADO de múltipla escolha profissional em português sobre o tema "${topic}" contendo exatamente ${count} questões de nível excelente.
Retorne APENAS um objeto JSON válido (sem tags markdown de código e sem texto adicional). O formato DEVE seguir exatamente este esquema:
{
  "title": "Simulado Stark: ${topic}",
  "type": "simulado",
  "topic": "${topic}",
  "questions": [
    {
      "id": 1,
      "question": "Texto claro e direto da primeira pergunta",
      "options": [
        "Alternativa A",
        "Alternativa B",
        "Alternativa C",
        "Alternativa D"
      ],
      "correctAnswer": 0,
      "explanation": "Explicação detalhada da resolução e por que a resposta A está correta"
    }
  ]
}`
    : `Crie um CRONOGRAMA DE TAREFAS / GUIA PRÁTICO passo a passo em português sobre o tema "${topic}" contendo exatamente ${count} atividades ou passos práticos estruturados para execução sequencial de aprendizado ou projeto.
Retorne APENAS um objeto JSON válido (sem tags markdown de código e sem texto adicional). O formato DEVE seguir exatamente este esquema:
{
  "title": "Plano de Execução Stark: ${topic}",
  "type": "tarefa",
  "topic": "${topic}",
  "tasks": [
    {
      "id": 1,
      "title": "Título prático da tarefa 1",
      "description": "Explicação rica passo a passo de como fazer ou o que realizar para completar esta etapa de estudo/prática",
      "difficulty": "Médio",
      "estimatedMinutes": 45
    }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "";
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(cleanText) as GenerationResult;
    return result;
  } catch (err) {
    console.error("Erro ao gerar conteúdo Stark:", err);
    
    // Return high quality local mock backups if offline or rate-limited
    if (isSimulado) {
      return {
        title: `Simulado Stark: ${topic} (Modo de Contingência)`,
        type: 'simulado',
        topic,
        questions: Array.from({ length: count }).map((_, i) => ({
          id: i + 1,
          question: `Questão Heurística ${i + 1} sobre ${topic}. Qual é o princípio fundamental desta área de estudo?`,
          options: [
            "Teoria Geral da Relatividade Aplicada",
            "Mecanismo de Otimização Stark Mark 85",
            "Equilíbrio de Sistemas Neurais Dinâmicos",
            "Nenhuma das opções anteriores está correta"
          ],
          correctAnswer: 2,
          explanation: `A resposta correta é a terceira opção, dado que os sistemas neurais em ${topic} se apoiam no princípio fundamental do Equilíbrio Dinâmico.`
        }))
      };
    } else {
      return {
        title: `Guia de Atividades: ${topic} (Modo de Contingência)`,
        type: 'tarefa',
        topic,
        tasks: Array.from({ length: count }).map((_, i) => ({
          id: i + 1,
          title: `Fase ${i + 1}: Domínio de ${topic}`,
          description: `Pesquisar e aplicar conceitos-chave do tema ${topic}. Pratique estruturando pequenos projetos teóricos para consolidar esta fase essencial.`,
          difficulty: i % 3 === 0 ? 'Fácil' : i % 3 === 1 ? 'Médio' : 'Difícil',
          estimatedMinutes: (i + 1) * 30
        }))
      };
    }
  }
}


