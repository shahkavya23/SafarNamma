import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { userApi, TOKEN_KEY, AUTH_EXPIRED_EVENT } from '../api/client';

const SESSION_TOKEN_PREFIX = 'sn1.';

// Helper function to verify if an email has admin privileges
export const isAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  const envAdmins = import.meta.env.VITE_ADMIN_EMAILS 
    ? (import.meta.env.VITE_ADMIN_EMAILS as string).split(',').map((e: string) => e.trim().toLowerCase()) 
    : [];
  const adminList = ['admin@roamlocal.in', ...envAdmins];
  return adminList.includes(email.trim().toLowerCase());
};

// Anyone can sign in; trips are only for SST students (admins count too)
export const STUDENT_EMAIL_DOMAIN = '@sst.scaler.com';
export const isStudentEmail = (email?: string): boolean =>
  !!email && email.trim().toLowerCase().endsWith(STUDENT_EMAIL_DOMAIN);

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => void;
  updateUser : (updateUser:Partial<User>) => void ;//In typescript partial user is a built in utility type that make all properties optional .
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Read from localStorage IMMEDIATELY for instant first-paint
    const storedUser = localStorage.getItem('roamlocal_user');
    // Sessions from before server-side auth hold a raw Google token the backend
    // won't accept; drop them so the user signs in once more
    if (storedUser && !localStorage.getItem(TOKEN_KEY)?.startsWith(SESSION_TOKEN_PREFIX)) {
      localStorage.removeItem('roamlocal_user');
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    if (storedUser) {
      try {
        const parsed: User = JSON.parse(storedUser);
        
        // Critical: Sanitize role against the authorized admin list.
        const verifiedRole = isAdminEmail(parsed.email) ? 'admin' : 'user';
        if (parsed.role !== verifiedRole) {
          parsed.role = verifiedRole;
          localStorage.setItem('roamlocal_user', JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        console.error("Failed to parse stored user", e);
        return null;
      }
    }
    return null;
  });

  // Rehydration Effect: Fetch the true single source of truth from SQLite!
  useEffect(() => {
    if (!user?.email) return;

    let isMounted = true;
    const hydrateFromDb = async () => {
      try {
        const dbProfile = await userApi.getProfile(user.email);
        if (dbProfile && isMounted) {
          setUser(prev => {
            if (!prev) return prev;
            const verifiedRole = isAdminEmail(prev.email) ? 'admin' : 'user';
            const merged: User = {
              ...prev,
              name: dbProfile.name || prev.name,
              avatar_url: dbProfile.avatar || prev.avatar_url,
              bio: (dbProfile.bio !== undefined && dbProfile.bio !== null) ? dbProfile.bio : prev.bio,
              role: verifiedRole
            };
            localStorage.setItem('roamlocal_user', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.error("Failed to hydrate user from SQLite:", err);
      }
    };

    hydrateFromDb();
    return () => { isMounted = false; };
  }, [user?.email]);

  const login = async (userData: User, token: string) => {
    const verifiedRole = isAdminEmail(userData.email) ? 'admin' : 'user';
    const sanitizedUser: User = { ...userData, role: verifiedRole };
    
    localStorage.setItem(TOKEN_KEY, token);

    // Immediately consult SQLite to hydrate custom bio and avatar before rendering
    try {
      const dbProfile = await userApi.getProfile(userData.email);
      if (dbProfile) {
        if (dbProfile.name) sanitizedUser.name = dbProfile.name;
        if (dbProfile.avatar) sanitizedUser.avatar_url = dbProfile.avatar;
        if (dbProfile.bio) sanitizedUser.bio = dbProfile.bio;
      }
    } catch (err) {
      console.error("Failed to fetch initial profile from DB on login", err);
    }

    setUser(sanitizedUser);
    localStorage.setItem('roamlocal_user', JSON.stringify(sanitizedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('roamlocal_user');
    localStorage.removeItem(TOKEN_KEY);
  };

  // Backend rejected the session (expired or invalid): sign out so the user can log in again
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const updateUser = async (updatedData : Partial<User>) => {
    if(!user) return ; 

    const updatedUser : User = {
      ...user , 
      ...updatedData
    };

    setUser(updatedUser);
    localStorage.setItem("roamlocal_user", JSON.stringify(updatedUser));

    // Persist to real SQLite database!
    try {
      await userApi.updateProfile({
        email: user.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar_url,
        bio: updatedUser.bio
      });
    } catch (err) {
      console.error("Failed to sync profile to database:", err);
    }
  };


  const isAdmin = !!user && user.role === 'admin' && isAdminEmail(user.email);
  const isStudent = !!user && (isStudentEmail(user.email) || isAdmin);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin,
      isStudent,
      login, 
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
