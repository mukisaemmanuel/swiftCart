import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  isBuyer: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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
  const isDemoRef = useRef<boolean>(false);

  const roleStr = (currentUser?.role || '').toUpperCase();
  const isBuyer = !currentUser || roleStr === 'BUYER';
  const isSeller = roleStr === 'SELLER';
  const isAdmin = roleStr === 'ADMIN' || roleStr === 'SUPER_ADMIN';
  const isSuperAdmin = roleStr === 'SUPER_ADMIN';

  // Load user and seller documents directly from Cloud Firestore
  const loadUserAndSeller = async (userId: string, isLive: boolean) => {
    try {
      let user: User | null = null;
      try {
        const userDocSnap = await withTimeout(getDoc(doc(db, 'users', userId)), 6000);
        if (userDocSnap.exists()) {
          user = userDocSnap.data() as User;
        }
      } catch (e: any) {
        console.error('Firestore user lookup error:', e?.message || e);
      }

      if (!user) {
        user = await dbService.getUserById(userId);
      }

      if (!user) {
        const seedUser = SEED_USERS.find((u) => u.id === userId || u.email === userId);
        if (seedUser) {
          user = seedUser;
        }
      }

      if (!user) {
        setCurrentUser(null);
        setCurrentSeller(null);
        setIsLiveAuth(false);
        return;
      }

      setCurrentUser(user);
      setIsLiveAuth(isLive);

      // If user is a merchant, load seller profile
      const userRoleUpper = (user.role || '').toUpperCase();
      if (userRoleUpper === 'SELLER') {
        let seller: Seller | null = null;
        try {
          const sellerSnap = await withTimeout(getDoc(doc(db, 'sellers', user.id)), 6000);
          if (sellerSnap.exists()) {
            seller = sellerSnap.data() as Seller;
          } else {
            const altSnap = await withTimeout(getDoc(doc(db, 'sellers', `seller_${user.id}`)), 6000);
            if (altSnap.exists()) {
              seller = altSnap.data() as Seller;
            }
          }
        } catch (e: any) {
          console.error('Firestore seller lookup error:', e?.message || e);
        }

        if (!seller) {
          seller = await dbService.getSellerById(user.id);
        }

        if (!seller) {
          seller = SEED_SELLERS.find((s) => s.userId === user.id || s.id === user.id) || SEED_SELLERS[0];
        }

        setCurrentSeller(seller || null);
      } else {
        setCurrentSeller(null);
      }
    } catch (err) {
      console.error('Error loading user profile from Firestore:', err);
      setCurrentUser(null);
      setCurrentSeller(null);
      setIsLiveAuth(false);
    }
  };

  // Initialize DB and subscribe to Firebase Auth state
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        await dbService.initDatabase();
      } catch (err) {
        console.error('Database initialization error:', err);
      }

      // Check if user had a saved demo persona in this browser tab session
      const savedDemoId = typeof window !== 'undefined' ? sessionStorage.getItem('swiftcart_demo_user_id') : null;
      if (savedDemoId) {
        const seedUser = SEED_USERS.find((u) => u.id === savedDemoId || u.email === savedDemoId);
        if (seedUser) {
          isDemoRef.current = true;
          setCurrentUser(seedUser);
          setIsLiveAuth(false);
          const roleUpper = (seedUser.role || '').toUpperCase();
          if (roleUpper === 'SELLER') {
            const seedSeller = SEED_SELLERS.find((s) => s.userId === seedUser.id || s.id === seedUser.id) || SEED_SELLERS[0];
            setCurrentSeller(seedSeller);
          } else {
            setCurrentSeller(null);
          }
          setIsLoading(false);
        }
      }

      try {
        unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
          if (fbUser) {
            isDemoRef.current = false;
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('swiftcart_demo_user_id');
            }
            await loadUserAndSeller(fbUser.uid, true);
          } else if (!isDemoRef.current) {
            setCurrentUser(null);
            setCurrentSeller(null);
            setIsLiveAuth(false);
          }
          setIsLoading(false);
        });
      } catch (err) {
        console.error('Firebase onAuthStateChanged error:', err);
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
      isDemoRef.current = false;
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('swiftcart_demo_user_id');
      }
      await logout();
      return;
    }

    isDemoRef.current = true;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('swiftcart_demo_user_id', userId);
    }
    setIsLoading(true);

    const seedUser = SEED_USERS.find((u) => u.id === userId || u.email === userId);
    if (seedUser) {
      setCurrentUser(seedUser);
      setIsLiveAuth(false);
      const roleUpper = (seedUser.role || '').toUpperCase();
      if (roleUpper === 'SELLER') {
        const seedSeller = SEED_SELLERS.find((s) => s.userId === seedUser.id || s.id === seedUser.id) || SEED_SELLERS[0];
        setCurrentSeller(seedSeller);
      } else {
        setCurrentSeller(null);
      }
      setIsLoading(false);
      return;
    }

    await loadUserAndSeller(userId, false);
    setIsLoading(false);
  };

  const login = async (
    emailOrPhone: string,
    password?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmailOrPhone = emailOrPhone.trim();
    const cleanPassword = password || 'SwiftCart@2026';

    // 1. Firebase Authentication with Email & Password
    if (cleanEmailOrPhone.includes('@')) {
      const emailLower = cleanEmailOrPhone.toLowerCase();
      const isAdminEmail = emailLower === 'admin@swiftcart.ug' || emailLower === 'superadmin@swiftcart.ug';

      try {
        const userCredential = await withTimeout(
          signInWithEmailAndPassword(auth, emailLower, cleanPassword),
          8000
        );
        const fbUser = userCredential.user;
        await loadUserAndSeller(fbUser.uid, true);
        return { success: true };
      } catch (fbErr: any) {
        console.warn('Firebase Auth sign-in failed:', fbErr?.code, fbErr?.message);

        // Auto-provision initial Admin / Superadmin if account does not exist in Firebase Auth yet
        if (isAdminEmail && (fbErr?.code === 'auth/invalid-credential' || fbErr?.code === 'auth/user-not-found')) {
          try {
            console.log('Auto-provisioning default platform admin in Firebase Auth & Firestore...');
            const adminCred = await withTimeout(
              createUserWithEmailAndPassword(auth, emailLower, cleanPassword),
              8000
            );
            const adminUser: User = {
              id: adminCred.user.uid,
              name: emailLower.startsWith('super') ? 'SwiftCart Super Admin' : 'SwiftCart Operations Admin',
              email: emailLower,
              phone: '+256700000001',
              role: 'admin',
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
              notificationPreferences: {
                orderUpdates: true,
                sellerNewOrders: true,
                promotions: true,
                pushEnabled: true,
              },
            };
            await dbService.saveUser(adminUser);
            await loadUserAndSeller(adminCred.user.uid, true);
            return { success: true };
          } catch (createErr: any) {
            console.error('Error auto-provisioning admin:', createErr);
          }
        }

        // Fallback for seed demo accounts if Firebase Auth user does not exist or fails
        const seedUser = SEED_USERS.find(
          (u) =>
            u.email.toLowerCase() === emailLower ||
            (emailLower === 'superadmin@swiftcart.ug' && (u.id === 'user_superadmin_1' || u.role === 'SUPER_ADMIN')) ||
            (emailLower === 'admin@swiftcart.ug' && (u.id === 'user_admin_1' || u.role === 'ADMIN')) ||
            (emailLower === 'seller@swiftcart.ug' && (u.id === 'user_seller_1' || u.role === 'SELLER')) ||
            (emailLower === 'buyer@swiftcart.ug' && (u.id === 'user_buyer_1' || u.role === 'BUYER'))
        );
        if (seedUser) {
          await switchUser(seedUser.id);
          return { success: true };
        }

        if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
          return {
            success: false,
            message: 'Invalid email or password. Please check your credentials and try again.',
          };
        }
        if (fbErr?.code === 'auth/user-not-found') {
          return {
            success: false,
            message: 'No account found with this email. Please register to create an account.',
          };
        }
        if (fbErr?.code === 'auth/too-many-requests') {
          return {
            success: false,
            message: 'Access temporarily disabled due to many failed attempts. Please reset password or try later.',
          };
        }
        if (fbErr?.code === 'auth/configuration-not-found') {
          return {
            success: false,
            message: 'Firebase Authentication is not yet activated on project studio-9829790199-ca934. Please go to Firebase Console > Authentication and enable Email/Password provider.',
          };
        }
        return {
          success: false,
          message: fbErr?.message || 'Authentication failed. Please try again.',
        };
      }
    }

    // 2. Phone number lookup in Cloud Firestore
    const user = await dbService.getUserByEmail(cleanEmailOrPhone);
    if (user && user.email) {
      try {
        const userCredential = await withTimeout(
          signInWithEmailAndPassword(auth, user.email, cleanPassword),
          8000
        );
        await loadUserAndSeller(userCredential.user.uid, true);
        return { success: true };
      } catch (fbErr: any) {
        return {
          success: false,
          message: 'Invalid password for this account. Please try again.',
        };
      }
    }

    return {
      success: false,
      message: 'Please provide a valid registered email address to sign in.',
    };
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
    const email = data.email.trim().toLowerCase();

    // 1. Create real Cloud Firebase Auth account
    let fbUid: string;
    try {
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, email, password),
        8000
      );
      fbUid = userCredential.user.uid;
    } catch (fbErr: any) {
      console.error('Firebase Auth createUser error:', fbErr?.code, fbErr?.message);
      if (fbErr?.code === 'auth/email-already-in-use') {
        return {
          success: false,
          message: 'An account with this email address already exists. Please sign in instead.',
        };
      }
      if (fbErr?.code === 'auth/weak-password') {
        return {
          success: false,
          message: 'Password is too weak. Please use at least 6 characters.',
        };
      }
      if (fbErr?.code === 'auth/invalid-email') {
        return {
          success: false,
          message: 'Please enter a valid email address.',
        };
      }
      if (fbErr?.code === 'auth/configuration-not-found') {
        return {
          success: false,
          message: 'Firebase Authentication is not yet activated on project studio-9829790199-ca934. Please go to Firebase Console > Authentication and enable Email/Password provider.',
        };
      }
      return {
        success: false,
        message: fbErr?.message || 'Registration failed. Please check your network and try again.',
      };
    }

    // 2. Create User Profile document in Cloud Firestore (/users/${uid})
    const normalizedRole = (data.role || 'BUYER').toUpperCase() as UserRole;
    const newUser: User = {
      id: fbUid,
      name: data.name.trim(),
      email,
      phone: data.phone.trim(),
      role: normalizedRole,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
      notificationPreferences: {
        orderUpdates: true,
        sellerNewOrders: true,
        promotions: true,
        pushEnabled: true,
      },
    };

    try {
      await withTimeout(setDoc(doc(db, 'users', fbUid), newUser), 8000);
    } catch (e: any) {
      console.error('Firestore user save error:', e?.message || e);
    }

    // 3. If role is seller, create Seller Profile document in Cloud Firestore (/sellers/${uid})
    if (normalizedRole === 'SELLER' || data.role === 'seller') {
      const newSeller: Seller = {
        id: fbUid,
        userId: fbUid,
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
        await withTimeout(setDoc(doc(db, 'sellers', fbUid), newSeller), 8000);
      } catch (e: any) {
        console.error('Firestore seller save error:', e?.message || e);
      }

      setCurrentSeller(newSeller);
    } else {
      setCurrentSeller(null);
    }

    setCurrentUser(newUser);
    setIsLiveAuth(true);

    return { success: true };
  };

  const verifySellerPhone = async (code: string): Promise<boolean> => {
    if (!currentSeller) return false;
    if (code.length === 6 || code === '123456') {
      const updated: Seller = { ...currentSeller, isPhoneVerified: true };
      try {
        await withTimeout(setDoc(doc(db, 'sellers', updated.id), updated, { merge: true }), 8000);
      } catch (e: any) {
        console.error('Firestore update seller phone verification error:', e?.message || e);
      }
      setCurrentSeller(updated);
      return true;
    }
    return false;
  };

  const updateSellerProfile = async (updates: Partial<Seller>): Promise<void> => {
    if (!currentSeller) return;
    const updated: Seller = { ...currentSeller, ...updates };
    try {
      await withTimeout(setDoc(doc(db, 'sellers', updated.id), updated, { merge: true }), 8000);
    } catch (e: any) {
      console.error('Firestore update seller profile error:', e?.message || e);
    }
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
      console.warn('Firebase signOut error:', e);
    }
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
        isBuyer,
        isSeller,
        isAdmin,
        isSuperAdmin,
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
