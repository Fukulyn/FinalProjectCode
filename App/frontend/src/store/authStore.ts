import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('登入 API 回傳', data, error);
    if (error) throw error;
    if (data.user) {
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at,
        },
      });
      console.log('✅ 用戶登入成功:', {
        userId: data.user.id,
        email: data.user.email,
        tabId: window.sessionStorage.key(0)?.includes('supabase.auth.token') ? 
               window.sessionStorage.key(0)?.split('.').pop() : 'unknown'
      });
    } else {
      console.log('data.user 為 null', data);
    }
  },

  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at,
        },
      });
    }
  },

  signOut: async () => {
    const currentUser = useAuthStore.getState().user;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
    console.log('🚪 用戶登出成功:', {
      previousUser: currentUser?.email,
      tabId: window.sessionStorage.key(0)?.includes('supabase.auth.token') ? 
             window.sessionStorage.key(0)?.split('.').pop() : 'unknown'
    });
  },

  checkAuth: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    set({ 
      user: user ? {
        id: user.id,
        email: user.email!,
        created_at: user.created_at
      } : null,
      loading: false 
    });
  },

  resetPassword: async (email: string) => {
    // 優先使用環境變數，否則使用當前網站網址
    const redirectUrl = import.meta.env.VITE_RESET_PASSWORD_URL || 
                       `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    if (error) throw error;
  },
}));