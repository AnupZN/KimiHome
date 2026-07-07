import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from './firebase';
import { UserSettings, Bookmark, TodoItem, QuickNote } from '../types';

const auth = getAuth();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface SyncProfileData {
  version: string;
  updatedAt: string;
  userSettings: UserSettings;
  bookmarksList: Bookmark[];
  todosList: TodoItem[];
  notesList: QuickNote[];
  bookmarksCategoryOrder?: string[];
}

/**
 * Generate a cryptographically secure-looking and human-friendly sync code
 * e.g., "SP-A8F2-9D7E"
 */
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars like I, O, 0, 1
  const randSegment = (len: number) => {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `SP-${randSegment(4)}-${randSegment(4)}`;
}

/**
 * Saves/Uploads the startpage data to Firestore under the given syncCode
 */
export async function uploadToCloud(
  syncCode: string,
  data: {
    settings: UserSettings;
    bookmarks: Bookmark[];
    todos: TodoItem[];
    notes: QuickNote[];
    categoryOrder?: string[];
  }
): Promise<void> {
  if (!syncCode || !syncCode.trim()) {
    throw new Error('Sync code is required');
  }

  const cleanCode = syncCode.trim().toUpperCase();
  const docRef = doc(db, 'sync_profiles', cleanCode);

  const payload = {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    userSettings: data.settings,
    bookmarksList: data.bookmarks,
    todosList: data.todos,
    notesList: data.notes,
    bookmarksCategoryOrder: data.categoryOrder || null,
  };

  try {
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `sync_profiles/${cleanCode}`);
  }
}

/**
 * Fetches/Downloads startpage data from Firestore for the given syncCode
 */
export async function downloadFromCloud(syncCode: string): Promise<SyncProfileData> {
  if (!syncCode || !syncCode.trim()) {
    throw new Error('Sync code is required');
  }

  const cleanCode = syncCode.trim().toUpperCase();
  const docRef = doc(db, 'sync_profiles', cleanCode);
  
  let docSnap;
  try {
    docSnap = await getDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `sync_profiles/${cleanCode}`);
  }

  if (!docSnap.exists()) {
    throw new Error(`No backup profile found with sync code: ${cleanCode}`);
  }

  const data = docSnap.data();
  return {
    version: data.version || '1.0',
    updatedAt: data.updatedAt || new Date().toISOString(),
    userSettings: data.userSettings,
    bookmarksList: data.bookmarksList || [],
    todosList: data.todosList || [],
    notesList: data.notesList || [],
    bookmarksCategoryOrder: data.bookmarksCategoryOrder || undefined,
  };
}
