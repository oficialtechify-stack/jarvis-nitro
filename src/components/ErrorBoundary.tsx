import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Copy, Check, ShieldAlert, Terminal } from 'lucide-react';
import { captureLocalException, LocalException } from '../lib/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    captureLocalException(error, 'react', errorInfo.componentStack || undefined);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReload = () => {
    window.location.reload();
  };

  private handleClearCache = () => {
    try {
      localStorage.removeItem('jarvis_active_conversation_id');
      localStorage.removeItem('will_view_mode');
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleCopyDetails = () => {
    const payload = `[RELATÓRIO DE EXCEÇÃO LOCAL - WILL / LEADSPAY]
Data/Hora: ${new Date().toISOString()}
Mensagem: ${this.state.error?.message || 'Erro desconhecido'}
Stack Trace: ${this.state.error?.stack || 'N/A'}
Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}
URL: ${window.location.href}
`;
    navigator.clipboard.writeText(payload);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#06080e] text-white flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-xl bg-[#0b0e17] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(244,63,94,0.15)] relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white font-mono">
                    Tratador de Exceções Local Ativado
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                    PROTEÇÃO ATIVA
                  </span>
                </div>
                <p className="text-xs text-white/60 font-sans mt-1">
                  O sistema capturou uma falha de renderização local e impediu o encerramento da aplicação. Seus dados estão seguros.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="mt-5 p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
                <span className="flex items-center gap-1.5 text-rose-300">
                  <Terminal size={13} />
                  <span>Detalhe da Exceção:</span>
                </span>
                <button
                  onClick={this.handleCopyDetails}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {this.state.copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{this.state.copied ? 'Copiado!' : 'Copiar Diagnóstico'}</span>
                </button>
              </div>
              <p className="text-xs font-mono text-rose-300/90 break-all bg-black/40 p-2.5 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                {this.state.error?.message || 'Exceção não identificada'}
              </p>
            </div>

            {/* Recovery Actions */}
            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer transition-all active:scale-98"
              >
                <RefreshCw size={14} />
                <span>Restaurar Componente</span>
              </button>

              <button
                onClick={this.handleHardReload}
                className="w-full sm:w-auto py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white font-mono text-xs rounded-xl border border-white/10 transition-all cursor-pointer"
              >
                Recarregar Página
              </button>

              <button
                onClick={this.handleClearCache}
                className="w-full sm:w-auto py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white font-mono text-[11px] rounded-xl transition-all cursor-pointer"
                title="Redefinir sessão local caso esteja em loop"
              >
                Limpar Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
