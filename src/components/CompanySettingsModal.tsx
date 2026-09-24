import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Building2, User, Briefcase, Sparkles, LogOut, 
  Check, ShieldCheck, Globe, Save, Layers
} from 'lucide-react';
import { WillUserProfile, saveUserWillProfile, isAdminUser } from '../lib/willService';
import ColorOrb from './ColorOrb';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: WillUserProfile;
  onSaveProfile: (updated: WillUserProfile) => void;
  onLogout?: () => void;
  onViewLanding?: () => void;
  onOpenAdmin?: () => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onLogout,
  onViewLanding,
  onOpenAdmin
}) => {
  const isAdmin = isAdminUser(profile.email);
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [companyName, setCompanyName] = useState(profile.companyName || 'Leadspay');
  const [role, setRole] = useState(profile.role || (isAdmin ? 'Fundador & CEO' : 'Colaborador Leadspay'));
  const [department, setDepartment] = useState(profile.department || (isAdmin ? 'Diretoria Executiva' : 'Comercial & Vendas'));
  const [responsibilities, setResponsibilities] = useState(
    profile.responsibilities || (isAdmin ? 'Gestão geral, metas e estratégias da Leadspay.' : 'Execução das tarefas diárias e suporte aos clientes da Leadspay.')
  );
  const [companyDirectives, setCompanyDirectives] = useState(
    profile.companyDirectives || 'Auxiliar nas decisões estratégicas da empresa, orientar os funcionários nas tarefas diárias e manter a alta performance.'
  );
  const [assistantTone, setAssistantTone] = useState<'professional' | 'mentor' | 'stark' | 'friendly'>(
    profile.assistantTone || 'mentor'
  );
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: WillUserProfile = {
      ...profile,
      displayName: displayName.trim() || 'Colaborador',
      companyName: companyName.trim() || 'Leadspay',
      role: role.trim() || 'Membro da Equipe',
      department: department.trim(),
      responsibilities: responsibilities.trim(),
      companyDirectives: companyDirectives.trim(),
      assistantTone,
      updatedAt: new Date().toISOString()
    };
    await saveUserWillProfile(updated);
    onSaveProfile(updated);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-[#080c16] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.2)] text-white overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4 shrink-0">
          <div className="relative">
            <ColorOrb dimension="32px" active={true} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-wider font-mono text-cyan-400 uppercase">
                Meu WILL Individual
              </h2>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                LEADSPAY
              </span>
              {isAdmin && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-[11px] text-white/50 font-mono">
              O WILL lê o seu cargo e atribuições para te ajudar no dia a dia da Leadspay
            </p>
          </div>
        </div>

        {/* Admin Shortcut Banner */}
        {isAdmin && onOpenAdmin && (
          <div className="mt-3 p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
              <ShieldCheck size={16} />
              <span>Painel de Gestão da Leadspay</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              Gerenciar Funcionários
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-3.5 py-3 overflow-y-auto flex-1 pr-1">
          {/* User Display Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <User size={13} />
              <span>Seu Nome (Como o WILL te chama)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Rick, Carlos, Mariana"
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
            />
          </div>

          {/* Company & Department in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Building2 size={13} />
                <span>Empresa</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Leadspay"
                className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Layers size={13} />
                <span>Departamento</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Comercial, Marketing, Suporte"
                className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Role / Cargo */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Briefcase size={13} />
              <span>Seu Cargo / Função na Leadspay</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Gestor de Tráfego, SDR, Closer, Suporte ao Cliente, CEO"
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
            />
          </div>

          {/* What the employee does (Responsibilities) */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
              <span>O que você faz no dia a dia da Leadspay</span>
              <span className="text-[10px] text-white/40 font-mono">Leitura do WILL</span>
            </label>
            <textarea
              rows={2}
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="Descreva suas funções, metas diárias e tarefas para o WILL te apoiar com precisão cirúrgica..."
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Directives for WILL */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>Instruções Especiais para o seu WILL</span>
            </label>
            <textarea
              rows={2}
              value={companyDirectives}
              onChange={(e) => setCompanyDirectives(e.target.value)}
              placeholder="Como o WILL deve te ajudar? Focar em fechar vendas? Criar anúncios de tráfego? Resolver tickets rápido?..."
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Assistant Tone */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 block">
              Estilo de Resposta do WILL
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'mentor', label: 'Mentor Executivo', desc: 'Foco em metas & estratégia' },
                { id: 'stark', label: 'Estilo Stark', desc: 'Inteligente, sagaz & resolutivo' },
                { id: 'professional', label: 'Corporativo Direto', desc: 'Formal e objetivo' },
                { id: 'friendly', label: 'Amigável & Apoio', desc: 'Acolhedor para rotinas' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAssistantTone(t.id as any)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    assistantTone === t.id
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                      : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-bold font-mono">{t.label}</p>
                  <p className="text-[9px] opacity-70 font-sans mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer uppercase tracking-wider"
            >
              {isSaved ? (
                <>
                  <Check size={16} />
                  <span>Configurações do WILL Atualizadas!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Salvar Dados e Atualizar WILL</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation Options */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono shrink-0">
          {onViewLanding && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onViewLanding();
              }}
              className="text-white/60 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Globe size={13} />
              <span>Ver Landing Page</span>
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
            >
              <LogOut size={13} />
              <span>Sair da Conta Google</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CompanySettingsModal;
