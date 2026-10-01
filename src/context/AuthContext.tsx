import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, Seller, UserRole } from '../types';
import { dbService, withTimeout } from '../services/db';
import { SEED_USERS, SEED_SELLERS } from '../data/seedData';

interface AuthContextType {
  currentUser: User | null;
  currentSeller: Seller | null;
  isLoading: boolean;
  isLiveAuth: boolean;
  login: (emailOrPhone: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
    storeName?: string;
    district?: string;
    address?: string;
    bio?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  verifySellerPhone: (code: string) => Promise<boolean>;
  updateSellerProfile: (updates: Partial<Seller>) => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveAuth, setIsLiveAuth] = useState<boolean>(false);

  // Synchronize user and seller data from Firestore or local fallback
  const loadUserAndSeller = async (userId: string, isLive: boolean) => {
    try {
      // 1. Try Firestore user doc with timeout
      let user: User | null = null;
      try {
        const userDocSnap = await withTimeout(getDoc(doc(db, 'users', userId)), 2000);
        if (userDocSnap.exists()) {
          user = userDocSnap.data() as User;
        }
      } catch (e) {
        console.warn('Firestore user fetch:', e);
      }

      // 2. Fallback to dbService / local storage
      if (!user) {
        const users = await dbService.getUsers();
        user = users.find((u) => u.id === userId) || null;
      }

      if (!user) {
        // User not found, clean up and set guest state
        setCurrentUser(null);
        setCurrentSeller(null);
        setIsLiveAuth(false);
        localStorage.removeItem('swiftcart_active_user_id');
        localStorage.removeItem('swiftcart_is_live_auth');
        return;
      }

      setCurrentUser(user);
      setIsLiveAuth(isLive);
      localStorage.setItem('swiftcart_active_user_id', user.id);
      if (isLive) {
        localStorage.setItem('swiftcart_is_live_auth', 'true');
      } else {
        localStorage.removeItem('swiftcart_is_live_auth');
      }

      // Load seller profile if user is a seller
      if (user.role === 'seller') {
        let seller: Seller | null = null;
        try {
          const sellerDocSnap = await withTimeout(getDoc(doc(db, 'sellers', `seller_${user.id}`)), 2000);
          if (sellerDocSnap.exists()) {
            seller = sellerDocSnap.data() as Seller;
          } else {
            const sellerByIdSnap = await withTimeout(getDoc(doc(db, 'sellers', user.id)), 2000);
            if (sellerByIdSnap.exists()) {
              seller = sellerByIdSnap.data() as Seller;
            }
          }
        } catch (e) {
          console.warn('Firestore seller fetch:', e);
        }

        if (!seller) {
          const sellers = await dbService.getSellers();
          seller = sellers.find((s) => s.userId === user!.id || s.id === user!.id) || null;
        }

        setCurrentSeller(seller || null);
      } else {
        setCurrentSeller(null);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setCurrentUser(null);
      setCurrentSeller(null);
      setIsLiveAuth(false);
      localStorage.removeItem('swiftcart_active_user_id');
      localStorage.removeItem('swiftcart_is_live_auth');
    }
  };

  // Initialize DB and listen to official Firebase Auth state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      await dbService.initDatabase();

      try {
        unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
          if (fbUser) {
            // Live Firebase authenticated session
            await loadUserAndSeller(fbUser.uid, true);
            setIsLoading(false);
          } else {
            // Check local saved user
            const savedUserId = localStorage.getItem('swiftcart_active_user_id');
            const isLocalLive = localStorage.getItem('swiftcart_is_live_auth') === 'true';
            
            if (savedUserId && !isLocalLive) {
              await loadUserAndSeller(savedUserId, false);
            } else {
              // Guest state (no user logged in)
              setCurrentUser(null);
              setCurrentSeller(null);
              setIsLiveAuth(false);
              localStorage.removeItem('swiftcart_active_user_id');
              localStorage.removeItem('swiftcart_is_live_auth');
            }
            setIsLoading(false);
          }
        });
      } catch (err) {
        console.warn('Firebase onAuthStateChanged fallback:', err);
        const savedUserId = localStorage.getItem('swiftcart_active_user_id');
        if (savedUserId) {
          await loadUserAndSeller(savedUserId, false);
        } else {
          setCurrentUser(null);
          setCurrentSeller(null);
          setIsLiveAuth(false);
        }
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const switchUser = async (userId: string) => {
    if (!userId || userId === 'guest') {
      await logout();
      return;
    }
    setIsLoading(true);
    // If currently signed into Firebase Auth, sign out first for persona switching
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // Ignore
    }
    localStorage.removeItem('swiftcart_is_live_auth');
    await loadUserAndSeller(userId, false);
    setIsLoading(false);
  };

  const login = async (
    emailOrPhone: string,
    password?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmailOrPhone = emailOrPhone.trim();
    const cleanPassword = password || 'SwiftCart@2026';

    // 1. Try Firebase Authentication with Email & Password
    if (cleanEmailOrPhone.includes('@')) {
      try {
        const userCredential = await withTimeout(
          signInWithEmailAndPassword(auth, cleanEmailOrPhone, cleanPassword),
          3500
        );
        const fbUser = userCredential.user;
        localStorage.setItem('swiftcart_is_live_auth', 'true');
        await loadUserAndSeller(fbUser.uid, true);
        return { success: true };
      } catch (fbErr: any) {
        console.warn('Firebase Auth sign-in failed, checking registered accounts:', fbErr?.message);
        // Only return early if error is definitely a live firebase wrong password
        if (fbErr?.code === 'auth/wrong-password') {
          return {
            success: false,
            message: 'Incorrect password. Please check your credentials.',
          };
        }
      }
    }

    // 2. Fallback to mock / offline / seed database login
    const users = await dbService.getUsers();
    const cleanSearch = cleanEmailOrPhone.toLowerCase();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === cleanSearch ||
        u.phone.replace(/[\s+-]/g, '') === cleanSearch.replace(/[\s+-]/g, '')
    );

    if (!found) {
      return {
        success: false,
        message: 'No account found with this email or phone number in Uganda. Please register to create one.',
      };
    }

    // Validate password for local account if set
    if (found.password && cleanPassword && found.password !== cleanPassword) {
      return {
        success: false,
        message: 'Incorrect password. Please check your credentials.',
      };
    }

    localStorage.removeItem('swiftcart_is_live_auth');
    localStorage.setItem('swiftcart_active_user_id', found.id);

    // If found.role === 'seller', ensure currentSeller is loaded from dbService.getSellers() and assigned immediately.
    if (found.role === 'seller') {
      const sellers = await dbService.getSellers();
      const matchedSeller = sellers.find((s) => s.userId === found.id || s.id === found.id) || null;
      setCurrentSeller(matchedSeller);
    } else {
      setCurrentSeller(null);
    }

    // If found.role === 'admin', explicitly set currentUser with role: 'admin'
    if (found.role === 'admin') {
      setCurrentUser({ ...found, role: 'admin' });
    } else {
      setCurrentUser(found);
    }

    await loadUserAndSeller(found.id, false);
    return { success: true };
  };

  const register = async (data: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
    storeName?: string;
    district?: string;
    address?: string;
    bio?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const password = data.password || 'SwiftCart@2026';
    let newUid: string | null = null;

    // 1. Attempt official Firebase Auth registration with timeout
    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, data.email.trim(), password),
        3500
      );
      newUid = userCredential.user.uid;
      localStorage.setItem('swiftcart_is_live_auth', 'true');
    } catch (fbErr: any) {
      console.warn('Firebase Auth createUser fallback:', fbErr);
      if (fbErr?.code === 'auth/email-already-in-use') {
        return { success: false, message: 'An account with this email address already exists. Please sign in instead.' };
      }
      if (fbErr?.code === 'auth/weak-password') {
        return { success: false, message: 'Password is too weak. Please use at least 6 characters.' };
      }
      // If Firebase Auth is offline or network fails, fall back to timestamp ID
      newUid = `user_${Date.now()}`;
      localStorage.removeItem('swiftcart_is_live_auth');
    }

    const newUser: User = {
      id: newUid,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      role: data.role,
      password: password,
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
      notificationPreferences: {
        orderUpdates: true,
        sellerNewOrders: true,
        promotions: true,
        pushEnabled: true,
      },
    };

    // 2. Save user profile document to Firestore (/users/${uid}) and local storage with timeout
    try {
      await withTimeout(setDoc(doc(db, 'users', newUid), newUser), 2000);
    } catch (e) {
      console.warn('Firestore setDoc user fallback:', e);
    }
    await dbService.saveUser(newUser);

    // 3. If role is seller, save record under /sellers/${uid}
    if (data.role === 'seller') {
      const newSellerId = `seller_${newUid}`;
      const newSeller: Seller = {
        id: newSellerId,
        userId: newUid,
        storeName: data.storeName || `${data.name}'s Store`,
        slug: (data.storeName || data.name).toLowerCase().replace(/[^a-z0-9]/g, '-'),
        phone: data.phone.trim(),
        isPhoneVerified: false,
        isVerified: false,
        district: data.district || 'Kampala',
        address: data.address || 'Central Division, Kampala',
        bio: data.bio || 'New merchant on SwiftCart Uganda.',
        logoUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.storeName || data.name)}`,
        status: 'pending',
        rating: 5.0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      };

      try {
        await withTimeout(setDoc(doc(db, 'sellers', newSellerId), newSeller), 2000);
      } catch (e) {
        console.warn('Firestore setDoc seller fallback:', e);
      }
      await dbService.saveSeller(newSeller);
      setCurrentSeller(newSeller);
    } else {
      setCurrentSeller(null);
    }

    setCurrentUser(newUser);
    setIsLiveAuth(localStorage.getItem('swiftcart_is_live_auth') === 'true');
    localStorage.setItem('swiftcart_active_user_id', newUser.id);

    return { success: true };
  };

  const verifySellerPhone = async (code: string): Promise<boolean> => {
    if (!currentSeller) return false;
    if (code.length === 6 || code === '123456') {
      const updated: Seller = { ...currentSeller, isPhoneVerified: true };
      try {
        await setDoc(doc(db, 'sellers', updated.id), updated, { merge: true });
      } catch (e) {
        console.warn('Firestore update seller phone verification:', e);
      }
      await dbService.saveSeller(updated);
      setCurrentSeller(updated);
      return true;
    }
    return false;
  };

  const updateSellerProfile = async (updates: Partial<Seller>): Promise<void> => {
    if (!currentSeller) return;
    const updated: Seller = { ...currentSeller, ...updates };
    try {
      await setDoc(doc(db, 'sellers', updated.id), updated, { merge: true });
    } catch (e) {
      console.warn('Firestore update seller profile:', e);
    }
    await dbService.saveSeller(updated);
    setCurrentSeller(updated);
  };

  const refreshAuth = async () => {
    if (!currentUser) return;
    await loadUserAndSeller(currentUser.id, isLiveAuth);
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (e) {
      console.warn('Firebase signOut:', e);
    }
    localStorage.removeItem('swiftcart_active_user_id');
    localStorage.removeItem('swiftcart_is_live_auth');
    setCurrentUser(null);
    setCurrentSeller(null);
    setIsLiveAuth(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentSeller,
        isLoading,
        isLiveAuth,
        login,
        register,
        logout,
        switchUser,
        verifySellerPhone,
        updateSellerProfile,
        refreshAuth,
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
