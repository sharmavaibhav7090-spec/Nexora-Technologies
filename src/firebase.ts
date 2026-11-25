import { FirebaseError, getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

function assertFirebaseConfig(): void {
  const requiredKeys: (keyof typeof firebaseConfig)[] = [
    'projectId',
    'apiKey',
    'authDomain',
    'appId',
    'firestoreDatabaseId',
  ];
  for (const key of requiredKeys) {
    if (!firebaseConfig[key]) {
      console.error(`[Nexora Firebase] Missing required configuration field: ${key}`);
    }
  }
}

assertFirebaseConfig();

// Prevent duplicate Firebase app initialization across hot reloads or re-imports
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const firebaseMetadata = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  oAuthClientId: firebaseConfig.oAuthClientId,
};

// Configure persistent auth state with graceful fallback for restricted iframe storage
export const authPersistenceReady: Promise<void> = setPersistence(auth, browserLocalPersistence).catch(
  async (localErr) => {
    console.warn('[Nexora Auth] Local persistence unavailable, falling back to session persistence.', localErr);
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch (sessionErr) {
      console.warn('[Nexora Auth] Session persistence unavailable, falling back to memory persistence.', sessionErr);
      await setPersistence(auth, inMemoryPersistence);
    }
  }
);

export function createGoogleAuthProvider(loginHint?: string): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  const customParams: Record<string, string> = {
    prompt: 'select_account',
  };
  if (loginHint && loginHint.trim()) {
    customParams.login_hint = loginHint.trim().toLowerCase();
  }
  provider.setCustomParameters(customParams);
  return provider;
}

export const googleProvider = createGoogleAuthProvider();

export function isGoogleAuthenticated(user: User | null): boolean {
  if (!user || !user.email || !user.emailVerified) return false;
  return user.providerData.some((provider) => provider.providerId === 'google.com');
}

export interface MappedAuthError {
  code: string;
  userMessage: string;
  isUnauthorizedDomain: boolean;
  currentHostname: string;
}

export function mapFirebaseAuthError(error: unknown): MappedAuthError {
  const currentHostname =
    typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'unknown-host';

  let code = 'auth/unknown';
  let rawMessage = 'Unknown authentication error';

  if (error instanceof FirebaseError) {
    code = error.code || code;
    rawMessage = error.message;
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    code = String((error as { code?: unknown }).code || code);
    rawMessage = error instanceof Error ? error.message : String(error);
  } else if (error instanceof Error) {
    rawMessage = error.message;
    const match = rawMessage.match(/auth\/[a-z0-9-]+/i);
    if (match) {
      code = match[0].toLowerCase();
    }
  }

  console.error('[Nexora Auth Error]', {
    code,
    hostname: currentHostname,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    rawMessage,
  });

  switch (code) {
    case 'auth/unauthorized-domain':
      return {
        code,
        isUnauthorizedDomain: true,
        currentHostname,
        userMessage: `This domain (${currentHostname}) is not authorized for Google Sign-In in Firebase Authentication yet. Add "${currentHostname}" under Firebase Console → Authentication → Settings → Authorized domains for project ${firebaseConfig.projectId}.`,
      };
    case 'auth/popup-blocked':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage:
          'Your browser blocked the Google Sign-In popup window. Please allow popups for this site and click the sign-in button again.',
      };
    case 'auth/popup-closed-by-user':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage:
          'Google Sign-In was closed before completion. Click Continue with Google Account when you are ready to sign in.',
      };
    case 'auth/cancelled-popup-request':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage:
          'A Google Sign-In window is already active. Please complete or close that window before trying again.',
      };
    case 'auth/network-request-failed':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage:
          'Unable to reach Google Authentication due to a network interruption. Please check your internet connection and retry.',
      };
    case 'auth/user-disabled':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage: 'This Google account has been disabled. Please contact your Nexora Administrator.',
      };
    case 'auth/operation-not-allowed':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage:
          'Google Sign-In is not enabled in Firebase Authentication for this project. Enable Google under Sign-in providers in Firebase Console.',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage:
          'This email is associated with a different credential. Nexora requires signing in directly with a Google Account.',
      };
    case 'auth/too-many-requests':
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage: 'Too many authentication attempts were detected. Please wait a brief moment before trying again.',
      };
    default:
      return {
        code,
        isUnauthorizedDomain: false,
        currentHostname,
        userMessage:
          code === 'auth/unknown' && rawMessage && !rawMessage.includes('Firebase:')
            ? rawMessage
            : 'Google authentication could not be completed. Please try again.',
      };
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Firestore client is offline.');
    }
  }
}

testConnection();
