import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../services/firebase';
import { firestoreSyncService } from '../services/firestoreSync';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  storeId: string;
  storeName: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isNewUser: boolean;
  loginWithEmail: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  registerWithEmail: (name: string, storeName: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  dismissWelcome: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isNewUser, setIsNewUser] = useState<boolean>(false);

  // Load and subscribe to Auth state
  useEffect(() => {
    // Configure local persistence
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn("Could not set local persistence:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserProfile({
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: data.displayName || currentUser.displayName || 'Comerciante',
              storeId: data.storeId || currentUser.uid,
              storeName: data.storeName || 'Mi Almacén',
            });
          } else {
            // First time Google login or missing profile: create standard profile
            const storeName = currentUser.displayName 
              ? `Comercio de ${currentUser.displayName.split(' ')[0]}` 
              : 'Mi Comercio';
            
            const profileData: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Comerciante',
              storeId: currentUser.uid,
              storeName,
            };

            await setDoc(userDocRef, {
              ...profileData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });

            await firestoreSyncService.ensureStore(currentUser.uid, storeName, currentUser.uid);
            setUserProfile(profileData);
            setIsNewUser(true);
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
          // Fallback profile so user can still access their isolated store
          setUserProfile({
            id: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Comerciante',
            storeId: currentUser.uid,
            storeName: 'Mi Comercio',
          });
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string, rememberMe = true) => {
    if (!rememberMe) {
      // Session persistence if desired
    }
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    setUser(cred.user);
  };

  const registerWithEmail = async (name: string, storeName: string, email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    
    // Update auth display name
    await updateProfile(cred.user, {
      displayName: name.trim(),
    });

    // Create user profile in Firestore
    const userDocRef = doc(db, 'users', cred.user.uid);
    const profileData: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email.trim(),
      displayName: name.trim(),
      storeId: cred.user.uid,
      storeName: storeName.trim() || 'Mi Comercio',
    };

    await setDoc(userDocRef, {
      ...profileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Ensure store exists in Firestore
    await firestoreSyncService.ensureStore(cred.user.uid, profileData.storeName, cred.user.uid);

    setUser(cred.user);
    setUserProfile(profileData);
    setIsNewUser(true);
  };

  const loginWithGoogle = async () => {
    // Prefer signInWithPopup in AI Studio environment
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    setIsNewUser(false);
  };

  const dismissWelcome = () => {
    setIsNewUser(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isNewUser,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        sendPasswordReset,
        logout,
        dismissWelcome,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
