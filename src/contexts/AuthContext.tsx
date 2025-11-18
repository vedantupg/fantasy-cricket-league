import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

// User data stored in Firestore
interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  profilePicUrl?: string;
  isAdmin: boolean;
  leagues: string[];
  createdAt: Date;
  profileSetupCompleted?: boolean;
  favoriteBatter?: string;
  favoriteBowler?: string;
  favoriteFielder?: string;
  favoriteIPLTeam?: string;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserData);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName });

    // Create user document in Firestore
    const newUserData: UserData = {
      uid: result.user.uid,
      email: result.user.email,
      displayName,
      isAdmin: false,
      leagues: [],
      createdAt: new Date(),
      profileSetupCompleted: false,
    };

    await setDoc(doc(db, 'users', result.user.uid), newUserData);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user document exists, if not create one
    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
    if (!userDoc.exists()) {
      const newUserData: UserData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        profilePicUrl: result.user.photoURL || undefined,
        isAdmin: false,
        leagues: [],
        createdAt: new Date(),
        profileSetupCompleted: false,
      };
      await setDoc(doc(db, 'users', result.user.uid), newUserData);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (data: Partial<UserData>) => {
    if (!user) return;
    
    const updatedData = { ...userData, ...data };
    await setDoc(doc(db, 'users', user.uid), updatedData, { merge: true });
    setUserData(updatedData as UserData);
  };

  const value: AuthContextType = {
    user,
    userData,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};