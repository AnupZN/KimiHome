import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Check if there is a custom config saved in localStorage
export const getCustomFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem('custom_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.apiKey && parsed.authDomain && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore
  }
  return null;
};

const activeConfig = getCustomFirebaseConfig() || {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId
};

const app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();

export const db = activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== 'default'
  ? getFirestore(app, activeConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const emailProviderClass = EmailAuthProvider;

export const saveCustomFirebaseConfig = (config: any) => {
  if (!config) {
    localStorage.removeItem('custom_firebase_config');
  } else {
    localStorage.setItem('custom_firebase_config', JSON.stringify(config));
  }
  window.location.reload();
};

