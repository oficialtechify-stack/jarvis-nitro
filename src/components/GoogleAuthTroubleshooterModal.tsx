import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, Check, Copy, ExternalLink, X, RefreshCw, 
  ShieldCheck, HelpCircle, Terminal, Globe, ChevronRight, Sparkles 
} from 'lucide-react';
import { ADMIN_EMAIL } from '../lib/willService';

export interface AuthErrorInfo {
  code?: string;
  message?: string;
  raw?: any;
}

interface GoogleAuthTroubleshooterModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorInfo: AuthErrorInfo | null;
  onRetryLogin: () => void;
  onContinueAsAdmin: () => void;
  onEnterGuest: () => void;
}

export const GoogleAuthTroubleshooterModal: React.FC<GoogleAuthTroubleshooterModalProps> = ({
  isOpen,
  onClose,
  errorInfo,
  onRetryLogin,
  onContinueAsAdmin,
  onEnterGuest
}) => {
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [copiedError, setCopiedError] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const errorCode = errorInfo?.code || 'auth/unauthorized-domain';
  const errorMessage = errorInfo?.message || 'Falha ao autenticar com o provedor Google.';

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleCopyError = () => {
    const payload = `Erro Firebase Auth:
Código: ${errorCode}
Mensagem: ${errorMessage}
Domínio atual: ${currentHost}
URL: ${currentOrigin}`;
    navigator.clipboard.writeText(payload);
    setCopiedError(true);
    setTimeout(() => setCopiedError(false), 2500);
  };

  const isUnauthorizedDomain = errorCode.includes('unauthorized-domain') || errorMessage.toLowerCase().includes('authorized domain');
  const isProviderDisabled = errorCode.includes('operation-not-allowed') || errorCode.includes('configuration-not-found');
  const isPopupBlocked = errorCode.includes('popup-blocked');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0b0e17] border border-amber-500/30 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.2)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-transparent flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white font-mono">
                    Diagnóstico do Login Google / Firebase
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                    RESOLUÇÃO RÁPIDA
                  </span>
                </div>
                <p className="text-xs text-white/60 font-sans mt-0.5">
                  Aqui está o motivo exato e o passo a passo para você resolver agora mesmo.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            
            {/* 1. Unauthorized Domain Case (Most common in new previews/deployments) */}
            {isUnauthorizedDomain && (
              <div className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-xs">
                  <Globe size={15} />
                  <span>PROBLEMA: Domínio Não Autorizado no Firebase Auth</span>
                </div>

                <p className="text-xs text-white/80 font-sans leading-relaxed">
                  Por segurança, o Google Firebase só aceita logins vindos de domínios que você cadastrou no seu painel. O domínio deste aplicativo (<strong className="text-cyan-300">{currentHost}</strong>) ainda não está na sua lista de autorizados do projeto <strong className="text-white">will-copilot</strong>.
                </p>

                <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-white/50 block font-bold">
                    Domínio para autorizar no Firebase:
                  </span>
                  <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                    <code className="text-xs font-mono text-cyan-300 select-all truncate">
                      {currentHost}
                    </code>
                    <button
                      onClick={handleCopyDomain}
                      className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-[11px] rounded-md flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      {copiedDomain ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedDomain ? 'Copiado!' : 'Copiar Domínio'}</span>
                    </button>
                  </div>
                </div>

                {/* Step by step instructions */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <ChevronRight size={14} className="text-amber-400" />
                    <span>Como resolver em 30 segundos no Firebase Console:</span>
                  </span>

                  <ol className="text-xs text-white/75 font-sans space-y-1.5 list-decimal pl-5">
                    <li>
                      Abra o{' '}
                      <a 
                        href="https://console.firebase.google.com/u/0/project/will-copilot/authentication/settings" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-300 underline font-mono inline-flex items-center gap-1 hover:text-cyan-200"
                      >
                        Firebase Console &gt; Authentication &gt; Configurações <ExternalLink size={11} />
                      </a>
                    </li>
                    <li>
                      Role até a seção <strong>"Domínios autorizados" (Authorized domains)</strong>.
                    </li>
                    <li>
                      Clique em <strong>"Adicionar domínio"</strong>.
                    </li>
                    <li>
                      Cole o domínio: <strong className="text-cyan-300">{currentHost}</strong>.
                    </li>
                    <li>
                      Clique em <strong>Salvar</strong> e volte aqui para clicar em <strong>"Tentar Login Novamente"</strong>!
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* 2. Provider Disabled Case */}
            {isProviderDisabled && (
              <div className="p-4 rounded-2xl bg-rose-500/[0.07] border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-mono font-bold text-xs">
                  <AlertTriangle size={15} />
                  <span>PROBLEMA: Provedor Google Não Ativado no Firebase</span>
                </div>

                <p className="text-xs text-white/80 font-sans leading-relaxed">
                  O método de autenticação do Google não foi habilitado no painel do Firebase do projeto <strong className="text-white">will-copilot</strong>.
                </p>

                <ol className="text-xs text-white/75 font-sans space-y-1.5 list-decimal pl-5">
                  <li>
                    Acesse o{' '}
                    <a 
                      href="https://console.firebase.google.com/u/0/project/will-copilot/authentication/providers" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline font-mono inline-flex items-center gap-1 hover:text-cyan-200"
                    >
                      Firebase Console &gt; Authentication &gt; Sign-in method <ExternalLink size={11} />
                    </a>
                  </li>
                  <li>Clique no provedor <strong>Google</strong> e marque a opção <strong>"Ativar"</strong>.</li>
                  <li>Selecione o e-mail de suporte do projeto (ex: {ADMIN_EMAIL}) e salve.</li>
                </ol>
              </div>
            )}

            {/* 3. Popup Blocked Case */}
            {isPopupBlocked && (
              <div className="p-4 rounded-2xl bg-amber-500/[0.07] border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-mono font-bold text-xs">
                  <AlertTriangle size={15} />
                  <span>PROBLEMA: Janela Pop-up Bloqueada pelo Navegador</span>
                </div>
                <p className="text-xs text-white/80 font-sans leading-relaxed">
                  Seu navegador bloqueou a janela de login do Google. Para permitir:
                  clique no ícone de pop-up na barra de endereço do navegador e selecione "Sempre permitir pop-ups para este site".
                </p>
              </div>
            )}

            {/* Raw Technical Details Box */}
            <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-white/60 flex items-center gap-1.5">
                  <Terminal size={12} className="text-cyan-400" />
                  <span>Código Técnico do Erro:</span>
                </span>
                <button
                  onClick={handleCopyError}
                  className="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                >
                  {copiedError ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedError ? 'Copiado' : 'Copiar Erro'}</span>
                </button>
              </div>
              <p className="text-xs font-mono text-rose-300/90 break-all bg-black/40 p-2 rounded-lg border border-white/5">
                {errorCode}: {errorMessage}
              </p>
            </div>

            {/* Direct Admin Bypass: Marcos Henrique / Rick Instant Access */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-cyan-400" />
                  <h4 className="text-xs font-mono font-bold text-white">
                    Acesso Imediato de Marcos Henrique / Rick (Admin)
                  </h4>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  SEM BLOQUEIO
                </span>
              </div>
              <p className="text-xs text-white/70 font-sans">
                Você não precisa ficar esperando a autorização do domínio para gerenciar o sistema. Clique abaixo para entrar diretamente como Administrador Supremo ({ADMIN_EMAIL}) e acessar o painel de colaboradores, a aba de Memória e o WILL:
              </p>
              <button
                onClick={() => {
                  onContinueAsAdmin();
                  onClose();
                }}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer transition-all active:scale-98"
              >
                <ShieldCheck size={15} />
                <span>Entrar Imediatamente como Rick (Admin Leadspay)</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onEnterGuest();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs rounded-xl transition-all cursor-pointer"
            >
              Testar no Modo Convidado
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-mono text-xs rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  onRetryLogin();
                }}
                className="flex-1 sm:flex-none px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Tentar Login Novamente</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default GoogleAuthTroubleshooterModal;
