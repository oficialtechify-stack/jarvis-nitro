import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  MapPin, 
  Building2, 
  Users, 
  ShieldCheck, 
  Zap, 
  Mic, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Compass, 
  DollarSign, 
  Camera, 
  Globe, 
  Play, 
  ChevronRight,
  Laptop,
  Flame,
  MessageSquare,
  Navigation
} from 'lucide-react';
import ColorOrb from './ColorOrb';

interface LandingPageProps {
  onLoginGoogle: () => void;
  onEnterGuest: () => void;
  isLoggingIn?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginGoogle,
  onEnterGuest,
  isLoggingIn = false,
}) => {
  const [activeRoleTab, setActiveRoleTab] = useState<'founder' | 'employee' | 'logistics'>('founder');

  return (
    <div className="min-h-screen bg-[#06080e] text-white selection:bg-cyan-500/30 overflow-x-hidden font-sans relative">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[500px] bg-teal-600/10 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#06080e]/80 border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ColorOrb dimension="32px" active={true} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-widest text-cyan-400 font-mono">WILL</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono uppercase tracking-wider font-bold">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[10px] text-white/40 font-mono hidden sm:block">
              Copiloto de IA para Você e Sua Empresa
            </p>
          </div>
        </div>

        {/* Center Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono text-white/60">
          <a href="#funcionalidades" className="hover:text-cyan-300 transition-colors">Funcionalidades</a>
          <a href="#empresas" className="hover:text-cyan-300 transition-colors">Para Empresas</a>
          <a href="#mapas" className="hover:text-cyan-300 transition-colors">Rotas & GPS</a>
          <a href="#seguranca" className="hover:text-cyan-300 transition-colors">Segurança</a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onEnterGuest}
            className="px-3.5 py-2 text-xs font-mono font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer hidden sm:flex items-center gap-1.5"
          >
            Modo Convidado
          </button>

          <button
            type="button"
            disabled={isLoggingIn}
            onClick={onLoginGoogle}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-black text-xs rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#000000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#000000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#000000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#000000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>Entrar com Google</span>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 px-4 sm:px-8 max-w-6xl mx-auto text-center">
        {/* Release Pill */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono mb-6"
        >
          <Sparkles size={14} className="text-cyan-400" />
          <span className="font-bold">WILL Copilot 3.5</span>
          <span className="text-white/40">•</span>
          <span className="text-white/70">Instância Individual por Colaborador</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight max-w-4xl mx-auto font-sans"
        >
          O Copiloto Inteligente para <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">Você, Sua Empresa</span> e Seus Funcionários.
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-sm sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed"
        >
          Cada membro da equipe tem seu próprio <strong className="text-cyan-300">WILL individual</strong>. 
          Conectado à identidade da sua empresa para orientar tarefas, acelerar decisões, apoiar clientes e traçar rotas em tempo real.
        </motion.p>

        {/* Action CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <button
            type="button"
            disabled={isLoggingIn}
            onClick={onLoginGoogle}
            className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-mono font-black text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_45px_rgba(6,182,212,0.6)] transition-all cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#000000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#000000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#000000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#000000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Acessar Meu WILL (Google)</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={onEnterGuest}
            className="w-full sm:w-auto px-6 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30 text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play size={14} className="text-cyan-400" />
            <span>Experimentar Agora (Demo)</span>
          </button>
        </motion.div>

        {/* Trust Badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[11px] font-mono text-white/40 flex-wrap">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> 100% Privado por Usuário
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> Google Maps Integrado
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" /> Ativação por Voz em Português
          </span>
        </div>

        {/* INTERACTIVE PREVIEW TERMINAL MOCKUP */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-14 relative mx-auto max-w-4xl rounded-2xl p-1 bg-gradient-to-b from-cyan-500/30 via-white/10 to-transparent shadow-[0_0_80px_rgba(6,182,212,0.2)]"
        >
          <div className="bg-[#070a12] rounded-2xl p-4 sm:p-6 border border-white/10 overflow-hidden text-left">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-mono text-white/40">WILL Enterprise Terminal • Live GPS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono text-emerald-400 uppercase">Sistema Operante</span>
              </div>
            </div>

            {/* Content Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Orb & Voice Pulse */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-black/40 rounded-xl border border-white/5 relative overflow-hidden">
                <ColorOrb dimension="110px" active={true} />
                <p className="text-xs font-mono text-cyan-300 font-bold mt-4 tracking-wider uppercase">
                  WILL v3.5 COGNITIVO
                </p>
                <p className="text-[10px] text-white/50 text-center font-mono mt-1">
                  "À disposição, Senhor. Qual o próximo objetivo da empresa?"
                </p>
              </div>

              {/* Sample Dialog & Quick Commands */}
              <div className="md:col-span-7 space-y-3">
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                  <p className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Comando do Usuário (Voz / Texto):</p>
                  <p className="text-xs text-white/90 font-sans mt-1">
                    "Will, trace a rota para o cliente no centro e me atualize sobre o relatório de vendas."
                  </p>
                </div>

                <div className="bg-cyan-500/[0.06] border border-cyan-500/20 rounded-xl p-3">
                  <p className="text-[10px] font-mono text-emerald-400 uppercase font-bold">Resposta do WILL Individual:</p>
                  <p className="text-xs text-white/90 font-sans mt-1">
                    "Rota calculada em tempo real com Google Maps: 14 minutos até o destino. As 3 prioridades da equipe hoje foram sincronizadas no painel corporativo."
                  </p>
                </div>

                {/* Quick Interactive Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button 
                    onClick={onEnterGuest}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 text-[10px] font-mono text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Navigation size={11} className="text-cyan-400" />
                    <span>Traçar Rota no Mapa</span>
                  </button>
                  <button 
                    onClick={onEnterGuest}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 text-[10px] font-mono text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Building2 size={11} className="text-teal-400" />
                    <span>Apoio à Empresa & Equipe</span>
                  </button>
                  <button 
                    onClick={onEnterGuest}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/30 text-[10px] font-mono text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mic size={11} className="text-rose-400" />
                    <span>Falar por Microfone</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* THREE PILLARS / ROLES SHOWCASE SECTION */}
      <section id="empresas" className="py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest block mb-2">
            Multi-Instância Corporativa
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Um WILL Próprio Para Cada Nível da Sua Operação
          </h2>
          <p className="text-white/60 text-sm mt-3">
            O WILL se adapta ao contexto específico de quem está usando, integrando todos sob a mesma visão empresarial.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/5 p-1 rounded-2xl border border-white/10 flex gap-1 max-w-md w-full">
            <button
              onClick={() => setActiveRoleTab('founder')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeRoleTab === 'founder'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Para o Fundador & CEO
            </button>
            <button
              onClick={() => setActiveRoleTab('employee')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeRoleTab === 'employee'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Para os Funcionários
            </button>
            <button
              onClick={() => setActiveRoleTab('logistics')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeRoleTab === 'logistics'
                  ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Logística & Campo
            </button>
          </div>
        </div>

        {/* Tab Content Cards */}
        <div className="bg-[#080c16] border border-cyan-500/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          {activeRoleTab === 'founder' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono uppercase font-bold">
                  Visão Geral da Empresa
                </span>
                <h3 className="text-xl sm:text-3xl font-extrabold text-white mt-3 leading-snug">
                  Controle Estratégico, Gestão de Metas & Tomada de Decisão
                </h3>
                <p className="text-white/60 text-xs sm:text-sm mt-3 leading-relaxed">
                  Como diretor da empresa, seu WILL atua como um conselheiro executivo de alto calibre. 
                  Ajuda a planejar metas, analisar despesas, gerar funis de venda, acompanhar cronogramas e delegar tarefas com clareza.
                </p>

                <div className="space-y-2.5 mt-6">
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                    <span>Diretrizes corporativas personalizadas para toda a empresa</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                    <span>Lançamentos financeiros por voz e metas de faturamento</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                    <span>Visão unificada das prioridades da equipe</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-3 font-mono text-xs">
                <div className="text-cyan-400 font-bold uppercase text-[10px]">Exemplo de Consulta Executiva:</div>
                <div className="text-white/80 bg-white/5 p-3 rounded-xl border border-white/5">
                  "Will, como podemos estruturar o processo de vendas da empresa para este mês e reduzir nossos custos operacionais?"
                </div>
                <div className="text-white/90 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20 text-[11px] leading-relaxed">
                  "Senhor, mapeei 3 alavancas para a empresa: 1. Automatizar o primeiro atendimento com roteiro padronizado; 2. Renegociar os 2 maiores custos fixos; 3. Focar em clientes de maior recorrência. Posso cadastrar essas metas agora no painel."
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[10px] font-mono uppercase font-bold">
                  Apoio ao Funcionário
                </span>
                <h3 className="text-xl sm:text-3xl font-extrabold text-white mt-3 leading-snug">
                  Mentor Pessoal de Produtividade e Execução Diária
                </h3>
                <p className="text-white/60 text-xs sm:text-sm mt-3 leading-relaxed">
                  Cada funcionário faz login com sua conta do Google e recebe uma instância isolada do WILL. 
                  Ele responde dúvidas operacionais, sugere melhorias de código/textos, ajuda no atendimento e reduz o tempo gasto com tarefas repetitivas.
                </p>

                <div className="space-y-2.5 mt-6">
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                    <span>Treinamento e respostas imediatas sobre processos da empresa</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                    <span>Redação de e-mails, propostas e atendimento ao cliente</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                    <span>Histórico particular e seguro de cada colaborador</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-3 font-mono text-xs">
                <div className="text-teal-400 font-bold uppercase text-[10px]">Exemplo de Apoio ao Funcionário:</div>
                <div className="text-white/80 bg-white/5 p-3 rounded-xl border border-white/5">
                  "Will, como respondo a este cliente que está com dúvida sobre o prazo de entrega da nossa empresa?"
                </div>
                <div className="text-white/90 bg-teal-500/10 p-3 rounded-xl border border-teal-500/20 text-[11px] leading-relaxed">
                  "Aqui está uma resposta polida e profissional seguindo a política da empresa: 'Olá! Agradecemos pelo contato. O prazo padrão é de 2 a 4 dias úteis com rastreamento ativo. Posso verificar o seu pedido agora mesmo se me passar o número.' Deseja que eu envie?"
                </div>
              </div>
            </div>
          )}

          {activeRoleTab === 'logistics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px] font-mono uppercase font-bold">
                  Geolocalização & Operação
                </span>
                <h3 className="text-xl sm:text-3xl font-extrabold text-white mt-3 leading-snug">
                  Navegação com Google Maps em Tempo Real
                </h3>
                <p className="text-white/60 text-xs sm:text-sm mt-3 leading-relaxed">
                  Perfeito para visitas a clientes, compras operacionais e serviços externos. 
                  Basta pedir por voz ("Will, onde é o mercado mais próximo?" ou "Trace a rota até o cliente") e o trajeto é desenhado na tela com um clique no botão de iniciar rota.
                </p>

                <div className="space-y-2.5 mt-6">
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>Rastreamento GPS contínuo e cálculo de ETA com trânsito</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>Busca de farmácias, mercados, postos de combustível e restaurantes</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-white/80">
                    <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                    <span>Instruções curva a curva por voz sintetizada</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-2xl p-5 space-y-3 font-mono text-xs">
                <div className="text-blue-400 font-bold uppercase text-[10px]">Exemplo de Navegação GPS:</div>
                <div className="text-white/80 bg-white/5 p-3 rounded-xl border border-white/5">
                  "Will, onde é o supermercado mais próximo de mim agora e trace a rota."
                </div>
                <div className="text-white/90 bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-[11px] leading-relaxed">
                  "Localizei o Hiper Bompreço a 1.2 km de sua posição atual. Linha traçada no mapa. Pressione 'INICIAR ROTA' para iniciar as instruções em tempo real."
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CORE FEATURES GRID */}
      <section id="funcionalidades" className="py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest block mb-2">
            Poder Tecnológico
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Recursos Integrados do WILL
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <h3 className="text-base font-bold text-white mt-4 font-sans">
              WILL Individual por Conta
            </h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Cada pessoa na empresa tem sua própria sessão segura. O histórico, as conversas e os dados ficam salvos de forma independente.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
              <MapPin size={20} />
            </div>
            <h3 className="text-base font-bold text-white mt-4 font-sans">
              Rotas em Tempo Real
            </h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Google Maps interativo integrado. Calcule rotas imediatas com o botão "Iniciar Rota", veja tempo estimado e navegue curva a curva.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Mic size={20} />
            </div>
            <h3 className="text-base font-bold text-white mt-4 font-sans">
              Comandos de Voz & Síntese
            </h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Fale naturalmente com "Ei Will" ou toque no microfone. O WILL responde por áudio e executa comandos na interface sem precisar digitar.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Camera size={20} />
            </div>
            <h3 className="text-base font-bold text-white mt-4 font-sans">
              Córtex Visual & Câmera
            </h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Envie fotos de documentos, notas fiscais, telas com erros ou ative a câmera para o WILL analisar o mundo real em tempo real.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
            <h3 className="text-base font-bold text-white mt-4 font-sans">
              Controle Financeiro da Empresa
            </h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Registre receitas, custos operacionais e metas de economia por voz ou comando simples com persistência em nuvem via Firebase.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 rounded-2xl p-6 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-bold text-white mt-4 font-sans">
              Segurança Firebase & Google
            </h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed">
              Autenticação oficial do Google, criptografia e regras de segurança Firestore que garantem isolamento total dos dados corporativos.
            </p>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-20 px-4 sm:px-8 max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-b from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl font-black text-white font-sans">
              Pronto para Conectar o WILL à Sua Empresa?
            </h2>
            <p className="text-white/60 text-xs sm:text-base mt-4 max-w-xl mx-auto">
              Inicie agora com sua conta do Google e configure o perfil corporativo do seu WILL em menos de 1 minuto.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                disabled={isLoggingIn}
                onClick={onLoginGoogle}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-mono font-black text-sm rounded-xl flex items-center justify-center gap-2.5 shadow-[0_0_35px_rgba(6,182,212,0.4)] transition-all cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#000000" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#000000" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#000000" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#000000" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Conectar com Google e Iniciar</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={onEnterGuest}
                className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Abrir Terminal Direto</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 px-4 sm:px-8 text-center text-xs font-mono text-white/40">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ColorOrb dimension="18px" active={true} />
          <span className="font-bold text-white/60">WILL Enterprise AI</span>
          <span>•</span>
          <span>Copiloto Corporativo & Pessoal</span>
        </div>
        <p className="text-[10px]">
          Conectado ao Firebase Auth, Google Maps Platform & Modelos Cognitivos Multimodais.
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
