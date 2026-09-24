import { doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface WillUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  companyName: string;
  role: string;
  companyDirectives: string;
  assistantTone?: 'professional' | 'mentor' | 'stark' | 'friendly';
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_WILL_PROFILE: WillUserProfile = {
  uid: 'guest',
  displayName: 'Henrique',
  email: '',
  companyName: 'Minha Empresa',
  role: 'Fundador & Diretor Geral',
  companyDirectives: 'Auxiliar nas decisões estratégicas da empresa, orientar os funcionários nas tarefas diárias, calcular rotas logísticas e manter a alta performance.',
  assistantTone: 'mentor',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function getUserWillProfile(uid: string, fallbackName?: string, fallbackEmail?: string, fallbackPhoto?: string): Promise<WillUserProfile> {
  // Check local cache first
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

  if (uid === 'guest') {
    return parsedCached || DEFAULT_WILL_PROFILE;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<WillUserProfile>;
      const merged: WillUserProfile = {
        uid,
        displayName: data.displayName || fallbackName || 'Colaborador',
        email: data.email || fallbackEmail || '',
        photoURL: data.photoURL || fallbackPhoto,
        companyName: data.companyName || parsedCached?.companyName || 'Minha Empresa',
        role: data.role || parsedCached?.role || 'Gestor / Colaborador',
        companyDirectives: data.companyDirectives || parsedCached?.companyDirectives || DEFAULT_WILL_PROFILE.companyDirectives,
        assistantTone: data.assistantTone || 'mentor',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(localKey, JSON.stringify(merged));
      return merged;
    } else {
      // Create initial profile in Firestore
      const newProfile: WillUserProfile = {
        uid,
        displayName: fallbackName || 'Colaborador',
        email: fallbackEmail || '',
        photoURL: fallbackPhoto,
        companyName: parsedCached?.companyName || 'Minha Empresa',
        role: parsedCached?.role || 'Fundador / Gestor',
        companyDirectives: parsedCached?.companyDirectives || DEFAULT_WILL_PROFILE.companyDirectives,
        assistantTone: 'mentor',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newProfile, { merge: true });
      localStorage.setItem(localKey, JSON.stringify(newProfile));
      return newProfile;
    }
  } catch (err) {
    console.warn('Could not read Firestore profile, using local fallback:', err);
    if (parsedCached) return parsedCached;
    return {
      ...DEFAULT_WILL_PROFILE,
      uid,
      displayName: fallbackName || 'Colaborador',
      email: fallbackEmail || '',
      photoURL: fallbackPhoto,
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
