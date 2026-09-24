import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Users, UserPlus, ShieldCheck, CheckCircle2, AlertCircle, 
  Trash2, Edit3, Save, Copy, Check, ExternalLink, Briefcase, 
  Building2, Sparkles, Key, Lock, Unlock, Mail, Database, Bookmark, Plus, Tag
} from 'lucide-react';
import { 
  LeadspayEmployee, 
  getEmployeesList, 
  saveEmployee, 
  deleteEmployee, 
  ADMIN_EMAIL,
  LeadspayMemory,
  getLeadspayMemories,
  saveLeadspayMemory,
  deleteLeadspayMemory
} from '../lib/willService';

interface LeadspayAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  onEmployeeUpdated?: () => void;
}

export const FIRESTORE_RULES_TEXT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Trava de segurança padrão: nega tudo por padrão
    match /{document=**} {
      allow read, write: if false;
    }

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }

    // Administrador supremo da Leadspay: rickmarketing81@gmail.com
    function isAdmin() {
      return isSignedIn() && 
        request.auth.token.email != null && 
        request.auth.token.email.lower() == 'rickmarketing81@gmail.com';
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Perfil individual do usuário e configurações do WILL
    match /users/{userId} {
      allow get: if isOwner(userId) || isAdmin();
      allow list: if isAdmin();
      allow create, update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();

      // Histórico de conversas individuais com o WILL
      match /conversations/{conversationId} {
        allow read, write: if isOwner(userId) || isAdmin();
      }

      // Tarefas, metas e anotações individuais
      match /{subcollection=**} {
        allow read, write: if isOwner(userId) || isAdmin();
      }
    }

    // Coleção de Funcionários da Leadspay
    // Apenas o Admin (Rick) pode criar, atualizar status e deletar funcionários.
    // O funcionário pode ler seu próprio registro para carregar seu cargo e diretrizes do WILL.
    match /employees/{employeeId} {
      allow read: if isSignedIn() && (
        isAdmin() || 
        (resource != null && resource.data.email != null && 
         resource.data.email.lower() == request.auth.token.email.lower())
      );
      allow write: if isAdmin();
    }

    // Configurações e diretrizes gerais da Leadspay
    match /company/{companyId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();

      match /{subcollection=**} {
        allow read: if isSignedIn();
        allow write: if isAdmin();
      }
    }

    // Memória Corporativa Permanente da Leadspay (para o WILL nunca esquecer)
    // Todos os usuários autenticados podem ler para seus WILLs saberem as diretrizes.
    // Apenas o Administrador (rickmarketing81@gmail.com) pode criar, editar e excluir memórias.
    match /memories/{memoryId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}`;

export const LeadspayAdminModal: React.FC<LeadspayAdminModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onEmployeeUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'new_employee' | 'memories' | 'firebase_rules'>('employees');
  const [employees, setEmployees] = useState<LeadspayEmployee[]>([]);
  const [memories, setMemories] = useState<LeadspayMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<LeadspayEmployee | null>(null);

  // Form State (Employee)
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formDepartment, setFormDepartment] = useState('Comercial & Vendas');
  const [formResponsibilities, setFormResponsibilities] = useState('');
  const [formDirectives, setFormDirectives] = useState('');
  const [formStatus, setFormStatus] = useState<'liberado' | 'pendente' | 'bloqueado'>('liberado');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State (Memory)
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [memTitle, setMemTitle] = useState('');
  const [memCategory, setMemCategory] = useState<'empresa' | 'diretriz' | 'criador' | 'produtos' | 'cultura' | 'geral'>('empresa');
  const [memImportance, setMemImportance] = useState<'alta' | 'critica' | 'padrao'>('alta');
  const [memContent, setMemContent] = useState('');
  const [memSaveSuccess, setMemSaveSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empList, memList] = await Promise.all([
        getEmployeesList(),
        getLeadspayMemories()
      ]);
      setEmployees(empList);
      setMemories(memList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_TEXT);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  const handleStartCreate = () => {
    setEditingEmployee(null);
    setFormName('');
    setFormEmail('');
    setFormRole('');
    setFormDepartment('Comercial & Vendas');
    setFormResponsibilities('');
    setFormDirectives('');
    setFormStatus('liberado');
    setActiveTab('new_employee');
  };

  const handleStartEdit = (emp: LeadspayEmployee) => {
    setEditingEmployee(emp);
    setFormName(emp.name);
    setFormEmail(emp.email);
    setFormRole(emp.role);
    setFormDepartment(emp.department || 'Comercial & Vendas');
    setFormResponsibilities(emp.responsibilities || '');
    setFormDirectives(emp.willDirectives || '');
    setFormStatus(emp.accessStatus || 'liberado');
    setActiveTab('new_employee');
  };

  const handleToggleStatus = async (emp: LeadspayEmployee) => {
    const nextStatus = emp.accessStatus === 'liberado' ? 'bloqueado' : 'liberado';
    const updated: LeadspayEmployee = {
      ...emp,
      accessStatus: nextStatus,
      updatedAt: new Date().toISOString()
    };
    await saveEmployee(updated);
    await loadData();
    if (onEmployeeUpdated) onEmployeeUpdated();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover o cadastro deste funcionário?')) {
      await deleteEmployee(id);
      await loadData();
      if (onEmployeeUpdated) onEmployeeUpdated();
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim() || !formRole.trim()) {
      alert('Por favor preencha nome, email e cargo do colaborador.');
      return;
    }

    const empId = editingEmployee ? editingEmployee.id : `emp_${formEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const empData: LeadspayEmployee = {
      id: empId,
      email: formEmail.trim().toLowerCase(),
      name: formName.trim(),
      role: formRole.trim(),
      department: formDepartment.trim(),
      responsibilities: formResponsibilities.trim(),
      willDirectives: formDirectives.trim() || `Auxiliar o colaborador no cargo de ${formRole} na Leadspay.`,
      accessStatus: formStatus,
      assignedBy: currentUserEmail || ADMIN_EMAIL,
      createdAt: editingEmployee ? editingEmployee.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveEmployee(empData);
    setSaveSuccess(true);
    setTimeout(async () => {
      setSaveSuccess(false);
      await loadData();
      setActiveTab('employees');
      if (onEmployeeUpdated) onEmployeeUpdated();
    }, 700);
  };

  // Memory Actions
  const handleStartNewMemory = () => {
    setMemoryId(null);
    setMemTitle('');
    setMemCategory('empresa');
    setMemImportance('alta');
    setMemContent('');
    setIsEditingMemory(true);
  };

  const handleEditMemory = (mem: LeadspayMemory) => {
    setMemoryId(mem.id);
    setMemTitle(mem.title);
    setMemCategory(mem.category);
    setMemImportance(mem.importance);
    setMemContent(mem.content);
    setIsEditingMemory(true);
  };

  const handleDeleteMemory = async (id: string) => {
    if (confirm('Remover esta memória do WILL? Ele não se lembrará mais deste fato.')) {
      await deleteLeadspayMemory(id);
      await loadData();
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim() || !memContent.trim()) {
      alert('Por favor preencha o título e o conteúdo da memória.');
      return;
    }

    const targetId = memoryId || `mem_${Date.now()}`;
    const newMem: LeadspayMemory = {
      id: targetId,
      title: memTitle.trim(),
      category: memCategory,
      importance: memImportance,
      content: memContent.trim(),
      author: currentUserEmail || ADMIN_EMAIL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveLeadspayMemory(newMem);
    setMemSaveSuccess(true);
    setTimeout(async () => {
      setMemSaveSuccess(false);
      setIsEditingMemory(false);
      await loadData();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-4xl bg-[#090d16] border border-cyan-500/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_80px_rgba(6,182,212,0.25)] text-white overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X size={18} />
        </button>

        {/* Modal Top Header */}
        <div className="border-b border-white/10 pb-4 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                <ShieldCheck size={22} className="text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black tracking-wider font-mono text-cyan-400 uppercase">
                    LEADSPAY • Central do Administrador
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold border border-cyan-500/30">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs text-white/50 font-mono mt-0.5">
                  Gestão de Equipe, Memória Perpétua do WILL e Liberação de Acessos
                </p>
              </div>
            </div>

            {/* Admin Email Tag */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-cyan-300">
              <Mail size={13} />
              <span>{ADMIN_EMAIL}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-white/5 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('employees');
                setIsEditingMemory(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'employees'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <Users size={14} />
              <span>Funcionários & Acessos ({employees.length})</span>
            </button>

            <button
              onClick={handleStartCreate}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'new_employee'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <UserPlus size={14} />
              <span>{editingEmployee ? 'Editar Funcionário' : '+ Cadastrar Novo'}</span>
            </button>

            {/* TAB MEMÓRIA (Solicitada pelo usuário) */}
            <button
              onClick={() => {
                setActiveTab('memories');
                setIsEditingMemory(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'memories'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <Bookmark size={14} className="text-amber-400" />
              <span>Memória do WILL ({memories.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('firebase_rules');
                setIsEditingMemory(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'firebase_rules'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'text-white/60 hover:text-white bg-white/5 hover:bg-white/10'
              }`}
            >
              <Key size={14} />
              <span>Regras do Firebase</span>
            </button>
          </div>
        </div>

        {/* Tab 1: List of Employees */}
        {activeTab === 'employees' && (
          <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <span>Equipe Leadspay Cadastrada</span>
                </h3>
                <p className="text-[11px] text-white/50 font-mono">
                  Cada funcionário liberado terá seu WILL individual treinado com as diretrizes do cargo cadastrado.
                </p>
              </div>
              <button
                onClick={handleStartCreate}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                <UserPlus size={13} />
                <span>Adicionar</span>
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-white/40 font-mono text-xs">
                Carregando colaboradores da Leadspay...
              </div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <p className="text-sm text-white/60 font-mono">Nenhum funcionário cadastrado ainda.</p>
                <button
                  onClick={handleStartCreate}
                  className="mt-3 px-4 py-2 bg-cyan-500 text-black font-mono font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cadastrar Primeiro Funcionário
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {employees.map((emp) => {
                  const isLiberado = emp.accessStatus === 'liberado';
                  const isPending = emp.accessStatus === 'pendente';

                  return (
                    <div
                      key={emp.id}
                      className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Top row: Name & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-white font-mono">{emp.name}</h4>
                              {emp.email === ADMIN_EMAIL && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50 font-mono flex items-center gap-1 mt-0.5">
                              <Mail size={11} />
                              <span>{emp.email}</span>
                            </p>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                              isLiberado
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isPending
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {emp.accessStatus}
                          </span>
                        </div>

                        {/* Role & Department */}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                            <Briefcase size={11} />
                            <span>{emp.role}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-white/70 border border-white/10 flex items-center gap-1">
                            <Building2 size={11} />
                            <span>{emp.department || 'Leadspay'}</span>
                          </span>
                        </div>

                        {/* Responsibilities and Directives preview */}
                        {emp.responsibilities && (
                          <div className="mt-2.5 p-2 rounded-xl bg-black/40 border border-white/5 text-[11px] text-white/60 font-sans">
                            <span className="text-[10px] font-mono text-cyan-300/80 font-bold block mb-0.5">
                              Atribuições do Cargo:
                            </span>
                            <p className="line-clamp-2">{emp.responsibilities}</p>
                          </div>
                        )}

                        {emp.willDirectives && (
                          <div className="mt-1.5 p-2 rounded-xl bg-cyan-950/20 border border-cyan-500/10 text-[11px] text-cyan-200/80 font-sans">
                            <span className="text-[10px] font-mono text-cyan-300 font-bold flex items-center gap-1 mb-0.5">
                              <Sparkles size={10} />
                              <span>Instrução para o WILL deste funcionário:</span>
                            </span>
                            <p className="line-clamp-2">{emp.willDirectives}</p>
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        {/* Toggle Access Button */}
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isLiberado
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isLiberado ? (
                            <>
                              <Lock size={12} />
                              <span>Bloquear</span>
                            </>
                          ) : (
                            <>
                              <Unlock size={12} />
                              <span>Liberar Acesso</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(emp)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                            title="Editar Cargo e WILL"
                          >
                            <Edit3 size={13} />
                          </button>
                          {emp.email !== ADMIN_EMAIL && (
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                              title="Excluir Colaborador"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Register / Edit Employee */}
        {activeTab === 'new_employee' && (
          <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <UserPlus size={16} className="text-cyan-400" />
                  <span>{editingEmployee ? 'Editar Colaborador da Leadspay' : 'Cadastrar Novo Funcionário na Leadspay'}</span>
                </h3>
                <p className="text-[11px] text-white/50 font-mono">
                  O WILL fará a leitura automática do cargo e atribuições preenchidas para orientar o colaborador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('employees')}
                className="text-xs font-mono text-white/50 hover:text-white cursor-pointer"
              >
                Voltar à Lista
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                  Nome do Funcionário *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo, Mariana Silva"
                  className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
                />
              </div>

              {/* Employee Email (Google Account) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                  E-mail Google do Funcionário *
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="email.funcionario@gmail.com"
                  className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
                />
                <p className="text-[10px] text-white/40 font-mono">
                  Este é o e-mail que o funcionário usará para entrar com o Google no WILL.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Role / Cargo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                  Cargo / Função na Leadspay *
                </label>
                <input
                  type="text"
                  required
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="Ex: SDR, Closer de Vendas, Gestor de Tráfego, Suporte ao Cliente, Copywriter"
                  className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                  Departamento
                </label>
                <select
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-sans focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Comercial & Vendas">Comercial & Vendas (SDR / Closer)</option>
                  <option value="Marketing & Tráfego">Marketing & Tráfego Pago</option>
                  <option value="Atendimento & Suporte">Atendimento & Suporte ao Cliente</option>
                  <option value="Operações & Logística">Operações & Logística</option>
                  <option value="Tecnologia & Dev">Tecnologia & Desenvolvimento</option>
                  <option value="Financeiro & Administrativo">Financeiro & Administrativo</option>
                  <option value="Diretoria Executiva">Diretoria Executiva</option>
                </select>
              </div>
            </div>

            {/* What the employee does (Responsibilities) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
                <span>Atribuições do Cargo e O Que Ele Faz na Leadspay</span>
                <span className="text-[10px] text-white/40 font-mono">O WILL lerá este texto para apoiá-lo</span>
              </label>
              <textarea
                rows={3}
                value={formResponsibilities}
                onChange={(e) => setFormResponsibilities(e.target.value)}
                placeholder="Descreva as tarefas diárias deste funcionário, metas esperadas, ferramentas que utiliza e responsabilidades na Leadspay..."
                className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all resize-none"
              />
            </div>

            {/* Special Instructions for this employee's WILL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Instruções Especiais para o WILL Deste Funcionário</span>
              </label>
              <textarea
                rows={2}
                value={formDirectives}
                onChange={(e) => setFormDirectives(e.target.value)}
                placeholder="Ex: Como o WILL deve agir com este funcionário? Sugerir abordagens de vendas, revisar copies, cobrar métricas de tráfego, incentivar o foco..."
                className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none transition-all resize-none"
              />
            </div>

            {/* Access Status Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300 block">
                Status de Liberação do Acesso
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'liberado', label: 'Liberado', desc: 'Acesso total ao WILL individual' },
                  { id: 'pendente', label: 'Pendente', desc: 'Aguarda sua aprovação' },
                  { id: 'bloqueado', label: 'Bloqueado', desc: 'Acesso suspenso' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormStatus(s.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formStatus === s.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <p className="text-xs font-bold font-mono uppercase">{s.label}</p>
                    <p className="text-[10px] opacity-70 font-sans mt-0.5">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-mono font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer uppercase tracking-wider"
              >
                {saveSuccess ? (
                  <>
                    <Check size={16} />
                    <span>Colaborador Salvo com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>{editingEmployee ? 'Atualizar Colaborador' : 'Cadastrar e Liberar WILL'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('employees')}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/70 font-mono text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: MEMÓRIA DO WILL (Base perpétua para o WILL nunca esquecer) */}
        {activeTab === 'memories' && (
          <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
            {/* Header info banner */}
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Bookmark size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-300 text-sm font-mono flex items-center gap-2">
                    <span>Memória Perpétua da Leadspay</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                      NUNCA ESQUECER
                    </span>
                  </h4>
                  <p className="text-xs text-white/70 font-sans mt-1">
                    Tudo o que você registrar nesta aba é injetado diretamente no cérebro do WILL. Ele nunca esquecerá estes fatos, regras da empresa, dados sobre o criador <strong className="text-white">Marcos Henrique</strong>, valores de produtos ou metas estratégicas.
                  </p>
                </div>
              </div>

              {!isEditingMemory && (
                <button
                  onClick={handleStartNewMemory}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all shrink-0"
                >
                  <Plus size={13} />
                  <span>Nova Memória</span>
                </button>
              )}
            </div>

            {/* Form for Creating / Editing Memory */}
            {isEditingMemory ? (
              <form onSubmit={handleSaveMemory} className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <h4 className="text-xs font-mono font-bold text-amber-300 uppercase">
                    {memoryId ? 'Editar Memória do WILL' : 'Adicionar Nova Memória Perpétua'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingMemory(false)}
                    className="text-xs font-mono text-white/50 hover:text-white cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-amber-300 uppercase">
                      Título do Fato / Assunto *
                    </label>
                    <input
                      type="text"
                      required
                      value={memTitle}
                      onChange={(e) => setMemTitle(e.target.value)}
                      placeholder="Ex: Regra de Comissionamento, Horário de Alinhamento..."
                      className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-amber-300 uppercase">
                        Categoria
                      </label>
                      <select
                        value={memCategory}
                        onChange={(e) => setMemCategory(e.target.value as any)}
                        className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl px-2.5 py-2 text-xs text-white font-sans focus:outline-none cursor-pointer"
                      >
                        <option value="empresa">Empresa</option>
                        <option value="criador">Criador (Marcos Henrique)</option>
                        <option value="diretriz">Diretriz Estratégica</option>
                        <option value="produtos">Produtos & Preços</option>
                        <option value="cultura">Cultura & Metas</option>
                        <option value="geral">Geral</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-bold text-amber-300 uppercase">
                        Importância
                      </label>
                      <select
                        value={memImportance}
                        onChange={(e) => setMemImportance(e.target.value as any)}
                        className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl px-2.5 py-2 text-xs text-white font-sans focus:outline-none cursor-pointer"
                      >
                        <option value="critica">Crítica (Prioridade Máxima)</option>
                        <option value="alta">Alta</option>
                        <option value="padrao">Padrão</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-amber-300 uppercase">
                    Conteúdo Detalhado (O que o WILL deve memorizar) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={memContent}
                    onChange={(e) => setMemContent(e.target.value)}
                    placeholder="Descreva detalhadamente a regra, valor, processo, informação do fundador ou instrução para que o WILL nunca esqueça e aplique em todas as respostas..."
                    className="w-full bg-black/60 border border-white/10 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 font-sans focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {memSaveSuccess ? (
                      <>
                        <Check size={14} />
                        <span>Memória Gravada!</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Salvar Memória no Cérebro do WILL</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditingMemory(false)}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-mono rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : null}

            {/* List of Memories */}
            <div className="space-y-2.5">
              {memories.map((mem) => {
                const isCreator = mem.category === 'criador';
                const isCritical = mem.importance === 'critica';

                return (
                  <div
                    key={mem.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCreator
                        ? 'bg-amber-500/[0.04] border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white font-mono flex items-center gap-1.5">
                            {isCreator && <Sparkles size={14} className="text-amber-400" />}
                            <span>{mem.title}</span>
                          </h4>
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold bg-white/10 text-white/70">
                            {mem.category}
                          </span>
                          {isCritical && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              CRÍTICO
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-white/80 font-sans mt-2 leading-relaxed">
                          {mem.content}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditMemory(mem)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="Editar Memória"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteMemory(mem.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Excluir Memória"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Firebase Rules */}
        {activeTab === 'firebase_rules' && (
          <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4 font-mono text-xs">
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3">
              <ShieldCheck size={20} className="text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-cyan-300 text-sm">
                  Regras Oficiais do Firebase Firestore para a Leadspay
                </h4>
                <p className="text-xs text-white/70 font-sans mt-1">
                  Estas regras protegem o banco de dados da Leadspay. O seu email (<span className="text-cyan-300 font-mono font-bold">rickmarketing81@gmail.com</span>) tem permissão de Administrador Supremo para cadastrar e liberar colaboradores e gerenciar a Memória Perpétua.
                </p>
              </div>
            </div>

            {/* Quick Copy Action */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50 uppercase tracking-wider font-bold">
                Arquivo firestore.rules
              </span>
              <button
                onClick={handleCopyRules}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                {copiedRules ? (
                  <>
                    <Check size={14} />
                    <span>Regras Copiadas!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar Regras do Firebase</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Box */}
            <pre className="p-4 bg-black/80 border border-white/10 rounded-2xl text-[11px] text-cyan-300/90 overflow-x-auto max-h-72 select-all leading-relaxed font-mono">
              {FIRESTORE_RULES_TEXT}
            </pre>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="text-white/40 flex items-center gap-2">
            <span>Empresa: <strong className="text-white">Leadspay</strong></span>
            <span>•</span>
            <span>CEO: <strong className="text-cyan-300">Marcos Henrique</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LeadspayAdminModal;
