import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserSettings, Bookmark, TodoItem, QuickNote } from '../types';

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
  const rawMsg = error instanceof Error ? error.message : String(error);
  console.error(`Firestore ${operationType} failed on ${path}:`, rawMsg);

  if (rawMsg.includes('permission-denied') || rawMsg.includes('Missing or insufficient permissions')) {
    throw new Error('Access denied: You do not have permission to access or modify this cloud profile.');
  }
  if (rawMsg.includes('not-found')) {
    throw new Error('Cloud profile not found.');
  }
  if (rawMsg.includes('unavailable')) {
    throw new Error('Network error: Unable to connect to Firebase cloud services.');
  }
  throw new Error(`Cloud operation failed: ${rawMsg}`);
}

export interface SyncProfileData {
  version: string;
  updatedAt: string;
  userSettings: UserSettings;
  bookmarksList: Bookmark[];
  todosList: TodoItem[];
  notesList: QuickNote[];
  bookmarksCategoryOrder?: string[];
  ownerId?: string | null;
}

/**
 * Generate a cryptographically secure and human-friendly sync code
 * e.g., "SP-A8F2-9D7E"
 */
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 characters (no I, O, 0, 1)
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const part1 = Array.from(bytes.slice(0, 4), (b) => chars[b % chars.length]).join('');
  const part2 = Array.from(bytes.slice(4, 8), (b) => chars[b % chars.length]).join('');
  return `SP-${part1}-${part2}`;
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
    ownerId?: string | null;
  }
): Promise<void> {
  if (!syncCode || !syncCode.trim()) {
    throw new Error('Sync code is required');
  }

  const cleanCode = syncCode.trim().toUpperCase();
  const docRef = doc(db, 'sync_profiles', cleanCode);

  const payload: any = {
    version: '1.0',
    updatedAt: new Date().toISOString(),
    userSettings: data.settings,
    bookmarksList: data.bookmarks,
    todosList: data.todos,
    notesList: data.notes,
    bookmarksCategoryOrder: data.categoryOrder || null,
    ownerId: data.ownerId !== undefined ? data.ownerId : (auth.currentUser?.uid || null),
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
    ownerId: data.ownerId || null,
  };
}
