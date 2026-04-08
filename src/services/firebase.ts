import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

/** Jest loads modules in different orders depending on the runner; set dummies before the required check. */
if (process.env.NODE_ENV === "test") {
  const testEnv: Record<string, string> = {
    REACT_APP_FIREBASE_API_KEY: "test-firebase-api-key",
    REACT_APP_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
    REACT_APP_FIREBASE_PROJECT_ID: "test-project",
    REACT_APP_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    REACT_APP_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
  };
  for (const [key, value] of Object.entries(testEnv)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

const required = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
] as const;

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  throw new Error(
    `Missing Firebase env: ${missing.join(", ")}. Copy .env.example to .env and set values from the Firebase console.`,
  );
}

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  ...(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID }
    : {}),
};

// Initialize Firebase
let app: FirebaseApp;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Lazily initialize Firebase Messaging (not supported in all environments)
export let messaging: ReturnType<typeof getMessaging> | null = null;
isSupported().then(supported => {
  if (supported) {
    messaging = getMessaging(app);
  }
}).catch(() => {/* messaging not available */});

export default app;