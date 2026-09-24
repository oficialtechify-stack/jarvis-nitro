import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export const ADMIN_EMAIL = 'rickmarketing81@gmail.com';
export const DEFAULT_COMPANY_NAME = 'Leadspay';

export function isAdminUser(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export interface LeadspayEmployee {
  id: string; // e.g. sanitized email or uuid
  email: string;
  name: string;
  role: string;
  department: string;
  responsibilities: string;
  willDirectives: string;
  accessStatus: 'liberado' | 'pendente' | 'bloqueado';
  assignedBy?: string;
  linkedUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WillUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  companyName: string;
  role: string;
  department?: string;
  responsibilities?: string;
  companyDirectives: string;
  assistantTone?: 'professional' | 'mentor' | 'stark' | 'friendly';
  accessStatus?: 'liberado' | 'pendente' | 'bloqueado';
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ADMIN_PROFILE: WillUserProfile = {
  uid: 'admin_rick',
  displayName: 'Rick',
  email: ADMIN_EMAIL,
  companyName: 'Leadspay',
  role: 'Fundador & Diretor Geral (CEO)',
  department: 'Diretoria Executiva',
  responsibilities: 'Liderança estratégica da Leadspay, expansão de negócios, gestão dos colaboradores, escala de vendas e tomadas de decisão.',
  companyDirectives: 'Auxiliar nas decisões de alto impacto da Leadspay, orientar estratégias de escala, monitorar a produtividade dos colaboradores em seus respectivos cargos e manter a empresa em alto crescimento.',
  assistantTone: 'mentor',
  accessStatus: 'liberado',
  isAdmin: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_WILL_PROFILE: WillUserProfile = {
  uid: 'guest',
  displayName: 'Visitante Leadspay',
  email: '',
  companyName: 'Leadspay',
  role: 'Colaborador',
  department: 'Geral',
  responsibilities: 'Executar tarefas operacionais e colaborar com a equipe da Leadspay.',
  companyDirectives: 'Apoiar nas rotinas diárias, esclarecer dúvidas de processo e aumentar a produtividade na Leadspay.',
  assistantTone: 'mentor',
  accessStatus: 'liberado',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Exemplos iniciais para a equipe da Leadspay (armazenados localmente se o Firestore ainda não tiver registros)
const SEED_EMPLOYEES: LeadspayEmployee[] = [
  {
    id: 'emp_rick',
    email: 'rickmarketing81@gmail.com',
    name: 'Rick (Administrador)',
    role: 'CEO & Diretor Geral',
    department: 'Diretoria Executiva',
    responsibilities: 'Gestão geral da Leadspay, expansão, validação de estratégias e aprovação de colaboradores.',
    willDirectives: 'Fornecer suporte executivo de alto nível, análises de mercado, relatórios gerenciais e estratégia de crescimento.',
    accessStatus: 'liberado',
    assignedBy: 'Sistema Leadspay',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'emp_sdr_exemplo',
    email: 'comercial@leadspay.com',
    name: 'Consultor Comercial / SDR',
    role: 'SDR / Pré-vendas',
    department: 'Comercial & Vendas',
    responsibilities: 'Qualificação ativa de leads para a Leadspay, primeiro contato, quebra de objeções e agendamento de reuniões.',
    willDirectives: 'Ajudar a redigir abordagens de WhatsApp, scripts de ligação, follow-ups de alta conversão e organização do funil de vendas.',
    accessStatus: 'liberado',
    assignedBy: ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'emp_trafego_exemplo',
    email: 'trafego@leadspay.com',
    name: 'Gestor de Tráfego Pago',
    role: 'Gestor de Performance / Tráfego',
    department: 'Marketing & Aquisição',
    responsibilities: 'Criação e otimização de campanhas no Meta Ads, Google Ads e TikTok Ads para captação de leads qualificados da Leadspay.',
    willDirectives: 'Analisar métricas de CPC, CTR, CPA e ROAS, sugerir criativos com ganchos persuasivos e otimizar orçamentos de mídia paga.',
    accessStatus: 'liberado',
    assignedBy: ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export async function getEmployeesList(): Promise<LeadspayEmployee[]> {
  const localKey = 'leadspay_employees_cache';
  let cached: LeadspayEmployee[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) cached = JSON.parse(raw);
  } catch {
    cached = [];
  }

  try {
    const empCol = collection(db, 'employees');
    const snap = await getDocs(empCol);
    if (!snap.empty) {
      const list: LeadspayEmployee[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      localStorage.setItem(localKey, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Could not read employees from Firestore, using local fallback:', err);
  }

  if (cached && cached.length > 0) {
    return cached;
  }

  // Pre-seed default list in localStorage
  localStorage.setItem(localKey, JSON.stringify(SEED_EMPLOYEES));
  return SEED_EMPLOYEES;
}

export async function saveEmployee(employee: LeadspayEmployee): Promise<void> {
  const localKey = 'leadspay_employees_cache';
  let list = await getEmployeesList();
  const idx = list.findIndex(e => e.id === employee.id || e.email.toLowerCase() === employee.email.toLowerCase());
  
  const updatedEmp: LeadspayEmployee = {
    ...employee,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    list[idx] = updatedEmp;
  } else {
    list.unshift(updatedEmp);
  }
  localStorage.setItem(localKey, JSON.stringify(list));

  try {
    const docId = employee.id || `emp_${employee.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const empDocRef = doc(db, 'employees', docId);
    await setDoc(empDocRef, updatedEmp, { merge: true });
  } catch (err) {
    console.warn('Could not save employee to Firestore (permissions or network):', err);
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const localKey = 'leadspay_employees_cache';
  let list = await getEmployeesList();
  list = list.filter(e => e.id !== id);
  localStorage.setItem(localKey, JSON.stringify(list));

  try {
    const empDocRef = doc(db, 'employees', id);
    await deleteDoc(empDocRef);
  } catch (err) {
    console.warn('Could not delete employee from Firestore:', err);
  }
}

export async function findEmployeeByEmail(email: string): Promise<LeadspayEmployee | null> {
  if (!email) return null;
  const list = await getEmployeesList();
  const found = list.find(e => e.email.trim().toLowerCase() === email.trim().toLowerCase());
  return found || null;
}

export async function getUserWillProfile(
  uid: string,
  fallbackName?: string,
  fallbackEmail?: string,
  fallbackPhoto?: string
): Promise<WillUserProfile> {
  const localKey = `will_profile_${uid}`;
  const cached = localStorage.getItem(localKey);
  let parsedCached: WillUserProfile | null = null;
  if (cached) {
    try {
      parsedCached = JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  // Se for Rick Marketing (Admin Supremo)
  if (isAdminUser(fallbackEmail) || (parsedCached && isAdminUser(parsedCached.email))) {
    const adminProfile: WillUserProfile = {
      ...DEFAULT_ADMIN_PROFILE,
      uid,
      displayName: fallbackName || parsedCached?.displayName || 'Rick',
      email: fallbackEmail || ADMIN_EMAIL,
      photoURL: fallbackPhoto || parsedCached?.photoURL,
      companyName: 'Leadspay',
      role: 'Fundador & Diretor Geral (CEO)',
      department: 'Diretoria Executiva',
      accessStatus: 'liberado',
      isAdmin: true,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(localKey, JSON.stringify(adminProfile));
    // Persist in Firestore
    try {
      await setDoc(doc(db, 'users', uid), adminProfile, { merge: true });
    } catch (e) {
      console.warn('Could not sync admin profile to Firestore:', e);
    }
    return adminProfile;
  }

  if (uid === 'guest') {
    return parsedCached || DEFAULT_WILL_PROFILE;
  }

  // Verifica se o usuário é um funcionário cadastrado na Leadspay
  const userEmail = fallbackEmail || parsedCached?.email || '';
  const empMatch = await findEmployeeByEmail(userEmail);

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<WillUserProfile>;
      const merged: WillUserProfile = {
        uid,
        displayName: data.displayName || fallbackName || empMatch?.name || 'Colaborador Leadspay',
        email: data.email || userEmail,
        photoURL: data.photoURL || fallbackPhoto,
        companyName: 'Leadspay',
        role: empMatch?.role || data.role || 'Colaborador Leadspay',
        department: empMatch?.department || data.department || 'Operações',
        responsibilities: empMatch?.responsibilities || data.responsibilities || '',
        companyDirectives: empMatch?.willDirectives || data.companyDirectives || 'Apoiar o colaborador no cumprimento eficiente de suas metas na Leadspay.',
        assistantTone: data.assistantTone || 'mentor',
        accessStatus: empMatch ? empMatch.accessStatus : (data.accessStatus || 'pendente'),
        isAdmin: false,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Se temos o cadastro do funcionário, vincula o UID do Google dele
      if (empMatch && (!empMatch.linkedUid || empMatch.linkedUid !== uid)) {
        saveEmployee({ ...empMatch, linkedUid: uid });
      }

      localStorage.setItem(localKey, JSON.stringify(merged));
      return merged;
    } else {
      // Criar perfil inicial
      const newProfile: WillUserProfile = {
        uid,
        displayName: fallbackName || empMatch?.name || 'Colaborador Leadspay',
        email: userEmail,
        photoURL: fallbackPhoto,
        companyName: 'Leadspay',
        role: empMatch?.role || 'Colaborador em Integração',
        department: empMatch?.department || 'Operações',
        responsibilities: empMatch?.responsibilities || 'Executar tarefas específicas conforme orientações da Leadspay.',
        companyDirectives: empMatch?.willDirectives || 'Auxiliar este colaborador a exercer com excelência sua função na Leadspay.',
        assistantTone: 'mentor',
        accessStatus: empMatch ? empMatch.accessStatus : 'pendente',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(userDocRef, newProfile, { merge: true });
      if (empMatch) {
        saveEmployee({ ...empMatch, linkedUid: uid });
      }
      localStorage.setItem(localKey, JSON.stringify(newProfile));
      return newProfile;
    }
  } catch (err) {
    console.warn('Could not read Firestore profile, using local fallback:', err);
    if (parsedCached) return parsedCached;
    return {
      ...DEFAULT_WILL_PROFILE,
      uid,
      displayName: fallbackName || empMatch?.name || 'Colaborador Leadspay',
      email: userEmail,
      photoURL: fallbackPhoto,
      role: empMatch?.role || 'Colaborador Leadspay',
      department: empMatch?.department || 'Geral',
      responsibilities: empMatch?.responsibilities || '',
      companyDirectives: empMatch?.willDirectives || 'Apoiar tarefas na Leadspay.',
      accessStatus: empMatch ? empMatch.accessStatus : 'pendente',
    };
  }
}

export async function saveUserWillProfile(profile: WillUserProfile): Promise<void> {
  const localKey = `will_profile_${profile.uid}`;
  localStorage.setItem(localKey, JSON.stringify(profile));

  if (profile.uid === 'guest') return;

  try {
    const userDocRef = doc(db, 'users', profile.uid);
    await setDoc(userDocRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Se houver um registro de funcionário correspondente, atualiza também
    if (profile.email) {
      const emp = await findEmployeeByEmail(profile.email);
      if (emp) {
        await saveEmployee({
          ...emp,
          name: profile.displayName || emp.name,
          role: profile.role || emp.role,
          department: profile.department || emp.department,
          responsibilities: profile.responsibilities || emp.responsibilities,
          willDirectives: profile.companyDirectives || emp.willDirectives,
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.warn('Could not save profile to Firestore:', err);
  }
}

export interface WillSavedConversation {
  id: string;
  title: string;
  messages: { role: 'user' | 'jarvis'; text: string; image?: string }[];
  createdAt: string;
}

export async function loadUserConversations(uid: string): Promise<WillSavedConversation[]> {
  const localKey = `will_conversations_${uid}`;
  const localData = localStorage.getItem(localKey);
  let localConvs: WillSavedConversation[] = [];
  if (localData) {
    try {
      localConvs = JSON.parse(localData);
    } catch {
      localConvs = [];
    }
  }

  if (uid === 'guest') return localConvs;

  try {
    const convsRef = collection(db, 'users', uid, 'conversations');
    const q = query(convsRef, orderBy('createdAt', 'desc'), limit(25));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const firestoreConvs: WillSavedConversation[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        firestoreConvs.push({
          id: docSnap.id,
          title: d.title || 'Conversa com Will',
          messages: d.messages || [],
          createdAt: d.createdAt || new Date().toISOString()
        });
      });
      localStorage.setItem(localKey, JSON.stringify(firestoreConvs));
      return firestoreConvs;
    }
  } catch (err) {
    console.warn('Firestore loadUserConversations error:', err);
  }

  return localConvs;
}

export async function saveUserConversation(uid: string, conv: WillSavedConversation): Promise<void> {
  const localKey = `will_conversations_${uid}`;
  let convs: WillSavedConversation[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) convs = JSON.parse(raw);
  } catch {
    convs = [];
  }

  const existingIdx = convs.findIndex(c => c.id === conv.id);
  if (existingIdx >= 0) {
    convs[existingIdx] = conv;
  } else {
    convs.unshift(conv);
  }
  localStorage.setItem(localKey, JSON.stringify(convs.slice(0, 30)));

  if (uid === 'guest') return;

  try {
    const convDocRef = doc(db, 'users', uid, 'conversations', conv.id);
    await setDoc(convDocRef, {
      title: conv.title,
      messages: conv.messages,
      createdAt: conv.createdAt,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore saveUserConversation error:', err);
  }
}

// ==========================================
// MEMÓRIA PERPÉTUA DA LEADSPAY & DO WILL
// ==========================================

export interface LeadspayMemory {
  id: string;
  title: string;
  category: 'empresa' | 'diretriz' | 'criador' | 'produtos' | 'cultura' | 'geral';
  content: string;
  importance: 'alta' | 'critica' | 'padrao';
  author: string;
  createdAt: string;
  updatedAt: string;
}

export const SEED_MEMORIES: LeadspayMemory[] = [
  {
    id: 'mem_criador_marcos_henrique',
    title: 'Criador do WILL: Marcos Henrique (CEO da Leadspay)',
    category: 'criador',
    content: 'O WILL foi idealizado e criado por Marcos Henrique, CEO da Leadspay. Ele projetou o WILL como o núcleo de inteligência corporativa para que cada colaborador da empresa tenha um copiloto estratégico individual, acelerando as decisões, metas e vendas de cada cargo na Leadspay.',
    importance: 'critica',
    author: ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem_empresa_leadspay',
    title: 'Sobre a Leadspay e Missão Corporativa',
    category: 'empresa',
    content: 'A Leadspay é uma empresa pioneira e de alta performance focada em captação, monetização e aceleração de leads e vendas. O objetivo de cada membro da equipe é gerar resultados exponenciais com ética, velocidade, transparência e excelência operacional.',
    importance: 'alta',
    author: ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mem_cultura_alta_performance',
    title: 'Cultura de Alta Performance & Protagonismo',
    category: 'cultura',
    content: 'Na Leadspay, prezamos pela proatividade, comunicação direta, resolução ágil de problemas e busca constante pelo topo. O WILL deve incentivar todos os funcionários a exercerem seus cargos com autonomia, inteligência e foco nos resultados.',
    importance: 'alta',
    author: ADMIN_EMAIL,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export async function getLeadspayMemories(): Promise<LeadspayMemory[]> {
  const localKey = 'leadspay_memories_cache';
  let cached: LeadspayMemory[] = [];
  try {
    const raw = localStorage.getItem(localKey);
    if (raw) cached = JSON.parse(raw);
  } catch {
    cached = [];
  }

  try {
    const memCol = collection(db, 'memories');
    const snap = await getDocs(memCol);
    if (!snap.empty) {
      const list: LeadspayMemory[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      localStorage.setItem(localKey, JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Could not read memories from Firestore, using local cache:', err);
  }

  if (cached && cached.length > 0) {
    return cached;
  }

  // Pre-seed local storage with defaults
  localStorage.setItem(localKey, JSON.stringify(SEED_MEMORIES));
  // Try persisting seed memories to Firestore in background
  try {
    for (const mem of SEED_MEMORIES) {
      const memRef = doc(db, 'memories', mem.id);
      setDoc(memRef, mem, { merge: true }).catch(() => {});
    }
  } catch {
    // ignore
  }

  return SEED_MEMORIES;
}

export async function saveLeadspayMemory(memory: LeadspayMemory): Promise<void> {
  const localKey = 'leadspay_memories_cache';
  let list = await getLeadspayMemories();
  const idx = list.findIndex(m => m.id === memory.id);
  const updatedMem: LeadspayMemory = {
    ...memory,
    updatedAt: new Date().toISOString()
  };

  if (idx >= 0) {
    list[idx] = updatedMem;
  } else {
    list.unshift(updatedMem);
  }
  localStorage.setItem(localKey, JSON.stringify(list));

  try {
    const docId = memory.id || `mem_${Date.now()}`;
    const memDocRef = doc(db, 'memories', docId);
    await setDoc(memDocRef, updatedMem, { merge: true });
  } catch (err) {
    console.warn('Could not save memory to Firestore:', err);
  }
}

export async function deleteLeadspayMemory(id: string): Promise<void> {
  const localKey = 'leadspay_memories_cache';
  let list = await getLeadspayMemories();
  list = list.filter(m => m.id !== id);
  localStorage.setItem(localKey, JSON.stringify(list));

  try {
    const memDocRef = doc(db, 'memories', id);
    await deleteDoc(memDocRef);
  } catch (err) {
    console.warn('Could not delete memory from Firestore:', err);
  }
}

export async function getFormattedMemoriesForContext(): Promise<string> {
  try {
    const memories = await getLeadspayMemories();
    if (!memories || memories.length === 0) return '';

    const lines = memories.map(m => `• [${m.title.toUpperCase()}]: ${m.content}`);
    return `
[BASE DE MEMÓRIA PERPÉTUA DA LEADSPAY - FATOS QUE VOCÊ NUNCA DEVE ESQUECER]:
${lines.join('\n')}
`;
  } catch {
    return '';
  }
}

/**
 * Garante que o banco de dados da Leadspay tenha registros iniciais (empresa, admin, memórias)
 */
export async function seedInitialFirestoreData(): Promise<void> {
  try {
    // 1. Salvar informações da empresa Leadspay
    const companyRef = doc(db, 'company', 'leadspay');
    await setDoc(companyRef, {
      name: 'Leadspay',
      ceo: 'Marcos Henrique',
      adminEmail: ADMIN_EMAIL,
      description: 'Ecossistema corporativo Leadspay integrado ao WILL Copilot.',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Salvar memórias essenciais
    for (const mem of SEED_MEMORIES) {
      const memRef = doc(db, 'memories', mem.id);
      await setDoc(memRef, mem, { merge: true });
    }
  } catch (e) {
    console.warn('seedInitialFirestoreData background notice:', e);
  }
}

