import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || defaultFirebaseConfig.apiKey || "AIzaSyBYwpaYGBufcWDMAoD-DCQkuXExwsrTTmc",
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || defaultFirebaseConfig.authDomain || "will-copilot.firebaseapp.com",
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || defaultFirebaseConfig.projectId || "will-copilot",
  storageBucket: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) || defaultFirebaseConfig.storageBucket || "will-copilot.firebasestorage.app",
  messagingSenderId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || defaultFirebaseConfig.messagingSenderId || "59906210835",
  appId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) || defaultFirebaseConfig.appId || "1:59906210835:web:4a9fa27781e68d85be13e6",
  measurementId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID) || defaultFirebaseConfig.measurementId || "G-9EHBRTHEB3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Analytics (safe in all browser environments)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported in this client environment
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Provedor padrão para login seguro e direto (perfil e email, sem aviso de dados confidenciais)
const standardProvider = new GoogleAuthProvider();
standardProvider.setCustomParameters({
  prompt: 'select_account'
});

// Provedor opcional apenas para integração avançada com Google Agenda
const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope('https://www.googleapis.com/auth/calendar');
calendarProvider.setCustomParameters({
  prompt: 'consent'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, standardProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || '';
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.warn('Google Sign-in was cancelled or the popup was closed by the user.');
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Solicita autorização específica para o Google Agenda (opcional)
 */
export const requestCalendarSync = async (): Promise<string | null> => {
  try {
    const result = await signInWithPopup(auth, calendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      return credential.accessToken;
    }
    return null;
  } catch (error: any) {
    console.warn('Google Calendar authorization failed or cancelled:', error);
    return null;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
