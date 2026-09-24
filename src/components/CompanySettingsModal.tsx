import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, User, Briefcase, Sparkles, LogOut, Check, ShieldCheck, Globe, Save } from 'lucide-react';
import { WillUserProfile, saveUserWillProfile } from '../lib/willService';
import ColorOrb from './ColorOrb';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: WillUserProfile;
  onSaveProfile: (updated: WillUserProfile) => void;
  onLogout?: () => void;
  onViewLanding?: () => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  onLogout,
  onViewLanding
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [companyName, setCompanyName] = useState(profile.companyName || 'Minha Empresa');
  const [role, setRole] = useState(profile.role || 'Fundador / Gestor');
  const [companyDirectives, setCompanyDirectives] = useState(
    profile.companyDirectives || 'Auxiliar nas decisões estratégicas da empresa, orientar os funcionários nas tarefas diárias, calcular rotas logísticas e manter a alta performance.'
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
      companyName: companyName.trim() || 'Minha Empresa',
      role: role.trim() || 'Membro da Equipe',
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
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
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
                EMPRESA
              </span>
            </div>
            <p className="text-[11px] text-white/50 font-mono">
              Configurações corporativas da sua instância exclusiva
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
          {/* User Display Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <User size={13} />
              <span>Seu Nome (Como o WILL deve te chamar)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Henrique, Carlos, Mariana"
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
            />
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Building2 size={13} />
              <span>Nome da Sua Empresa</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Minha Empresa, TechCorp, Comercial Silva"
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
            />
          </div>

          {/* Role / Cargo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Briefcase size={13} />
              <span>Seu Cargo / Função na Empresa</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Fundador & CEO, Gerente de Vendas, Operacional, Suporte"
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
            />
          </div>

          {/* Directives for WILL */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sparkles size={13} />
              <span>Diretrizes e Missão para o Seu WILL</span>
            </label>
            <textarea
              rows={3}
              value={companyDirectives}
              onChange={(e) => setCompanyDirectives(e.target.value)}
              placeholder="Descreva como o WILL deve ajudar você e os outros funcionários da empresa..."
              className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all resize-none"
            />
            <p className="text-[10px] text-white/40 font-mono">
              O WILL usará essas instruções para orientar respostas, priorizar tarefas corporativas e apoiar a equipe.
            </p>
          </div>

          {/* Assistant Tone */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 block">
              Personalidade do WILL
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'mentor', label: 'Mentor Executivo', desc: 'Estratégico, focado em metas' },
                { id: 'stark', label: 'Estilo Stark', desc: 'Inteligente, sagaz & leal' },
                { id: 'professional', label: 'Corporativo Direto', desc: 'Formal, objetivo e claro' },
                { id: 'friendly', label: 'Amigável & Suporte', desc: 'Acolhedor para o time' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAssistantTone(t.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    assistantTone === t.id
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                      : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-bold font-mono">{t.label}</p>
                  <p className="text-[9.5px] opacity-70 font-sans mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="submit"
              className="w-full sm:flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer uppercase tracking-wider"
            >
              {isSaved ? (
                <>
                  <Check size={16} />
                  <span>Configurações Salvas!</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Salvar Configurações do WILL</span>
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
