import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAT7uu2q_ej91X3u9zNagCMYteUkckOOtc",
  authDomain: "fantasy-cricket-league-2554c.firebaseapp.com",
  projectId: "fantasy-cricket-league-2554c",
  storageBucket: "fantasy-cricket-league-2554c.firebasestorage.app",
  messagingSenderId: "310912152259",
  appId: "1:310912152259:web:dba9c4b0e34e3665682876",
  measurementId: "G-Y74QWZKSY5"
};

// Initialize Firebase
let app;
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

export default app;