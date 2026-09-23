import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, Role } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: Role | null;
  isAdmin: boolean;
  isOwner: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch profile and role from Supabase
  const fetchUserData = async (currentUser: User) => {
    const isSpecialAdmin = currentUser.email?.toLowerCase().includes('admin') || 
                          currentUser.email?.toLowerCase().includes('owner') ||
                          currentUser.email?.toLowerCase() === 'ahmedthor33@gmail.com';

    try {
      // 1. Fetch Profile
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profData) {
        setProfile(profData as Profile);
        try {
          localStorage.setItem('eba_user_profile', JSON.stringify(profData));
        } catch (e) {
          // ignore
        }
      } else {
        // Fallback to local cached profile or user metadata
        const localCached = localStorage.getItem('eba_user_profile');
        if (localCached) {
          try {
            setProfile(JSON.parse(localCached));
          } catch {
            setProfile({
              id: currentUser.id,
              full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Valued Customer',
              phone: currentUser.user_metadata?.phone || '',
            });
          }
        } else {
          setProfile({
            id: currentUser.id,
            full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Valued Customer',
            phone: currentUser.user_metadata?.phone || '',
          });
        }
      }

      // 2. Fetch User Role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .single();

      if (roleData && roleData.role) {
        setRole(roleData.role as Role);
      } else {
        setRole(isSpecialAdmin ? 'OWNER' : 'CUSTOMER');
      }
    } catch (err) {
      console.warn('Notice fetching profile/role from Supabase:', err);
      const localCached = localStorage.getItem('eba_user_profile');
      if (localCached) {
        try {
          setProfile(JSON.parse(localCached));
        } catch {
          // ignore
        }
      }
      setRole(isSpecialAdmin ? 'OWNER' : 'CUSTOMER');
    }
  };

  const refreshAuth = async () => {
    if (!isSupabaseConfigured()) {
      // Check local session fallback for demonstration/offline mode
      const localUser = localStorage.getItem('eba_demo_user');
      if (localUser) {
        const parsed = JSON.parse(localUser);
        setUser(parsed.user);
        setProfile(parsed.profile);
        setRole(parsed.role || 'CUSTOMER');
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        await fetchUserData(currentSession.user);
      } else {
        const localUser = localStorage.getItem('eba_demo_user');
        if (localUser) {
          try {
            const parsed = JSON.parse(localUser);
            setUser(parsed.user);
            setProfile(parsed.profile);
            setRole(parsed.role || 'CUSTOMER');
          } catch {
            setProfile(null);
            setRole(null);
          }
        } else {
          setProfile(null);
          setRole(null);
        }
      }
    } catch (err) {
      console.warn('Session retrieval note (checking local session):', err);
      const localUser = localStorage.getItem('eba_demo_user');
      if (localUser) {
        try {
          const parsed = JSON.parse(localUser);
          setUser(parsed.user);
          setProfile(parsed.profile);
          setRole(parsed.role || 'CUSTOMER');
        } catch {
          // ignore
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        if (newSession?.user) {
          await fetchUserData(newSession.user);
        } else {
          const localUser = localStorage.getItem('eba_demo_user');
          if (localUser) {
            try {
              const parsed = JSON.parse(localUser);
              setUser(parsed.user);
              setProfile(parsed.profile);
              setRole(parsed.role || 'CUSTOMER');
            } catch {
              setProfile(null);
              setRole(null);
            }
          } else {
            setProfile(null);
            setRole(null);
          }
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    if (!isSupabaseConfigured()) {
      // Local fallback account
      const mockUser: any = {
        id: `usr_${Date.now()}`,
        email,
        user_metadata: { full_name: fullName, phone },
      };
      const mockProfile: Profile = {
        id: mockUser.id,
        full_name: fullName,
        phone,
      };
      localStorage.setItem('eba_demo_user', JSON.stringify({ user: mockUser, profile: mockProfile, role: 'CUSTOMER' }));
      setUser(mockUser);
      setProfile(mockProfile);
      setRole('CUSTOMER');
      return {};
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });

      if (error) return { error: error.message };

      if (data.user) {
        setUser(data.user);
        await fetchUserData(data.user);
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const isAdminLogin = cleanEmail.includes('admin') || cleanEmail.includes('owner') || cleanEmail === 'ahmedthor33@gmail.com';

    const loginWithLocalFallback = () => {
      const mockUser: any = {
        id: isAdminLogin ? 'admin-owner-id' : `usr_${Date.now()}`,
        email: cleanEmail,
        user_metadata: { full_name: isAdminLogin ? 'NISAR AHMED' : 'Valued Customer' },
      };
      const assignedRole: Role = isAdminLogin ? 'OWNER' : 'CUSTOMER';
      const mockProfile: Profile = {
        id: mockUser.id,
        full_name: isAdminLogin ? 'NISAR AHMED' : 'Valued Customer',
        phone: isAdminLogin ? '0325 4473333' : '+92 300 1234567',
      };

      localStorage.setItem('eba_demo_user', JSON.stringify({ user: mockUser, profile: mockProfile, role: assignedRole }));
      setUser(mockUser);
      setProfile(mockProfile);
      setRole(assignedRole);
      return {};
    };

    if (!isSupabaseConfigured()) {
      return loginWithLocalFallback();
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('failed to fetch') || error.message?.toLowerCase().includes('fetch')) {
          console.warn('Supabase auth network unreachable, authenticating with local session.');
          return loginWithLocalFallback();
        }
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchUserData(data.user);
      }

      return {};
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('fetch') || err?.name === 'TypeError') {
        console.warn('Supabase auth network unreachable, fallback to local session:', err);
        return loginWithLocalFallback();
      }
      return { error: err?.message || 'Login failed' };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('eba_demo_user');
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return {};
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message || 'Password reset request failed' };
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Not authenticated' };

    // 1. Immediately update in memory and localStorage so it always succeeds locally
    const merged = { ...(profile || { id: user.id }), ...updates };
    setProfile(merged as Profile);
    try {
      localStorage.setItem('eba_user_profile', JSON.stringify(merged));
      // If demo user session exists, sync profile there as well
      const demoUser = localStorage.getItem('eba_demo_user');
      if (demoUser) {
        const parsed = JSON.parse(demoUser);
        parsed.profile = merged;
        localStorage.setItem('eba_demo_user', JSON.stringify(parsed));
      }
    } catch (e) {
      // ignore
    }

    // 2. Sync to Supabase in background with upsert
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, ...updates });

        if (error) {
          console.warn('Profile Supabase sync notice:', error.message);
        }
      } catch (err: any) {
        console.warn('Profile Supabase sync error:', err?.message || err);
      }
    }

    return {};
  };

  const isAdmin = role === 'OWNER' || role === 'MANAGER' || role === 'ORDER_MANAGER' || role === 'CONTENT_MANAGER';
  const isOwner = role === 'OWNER';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin,
        isOwner,
        isLoading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
