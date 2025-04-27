import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { startReminderCheck, stopReminderCheck } from '../lib/reminderWorker';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
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
      startReminderCheck();
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
      startReminderCheck();
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
    stopReminderCheck();
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
    if (user) {
      startReminderCheck();
    }
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://hkjclbdisriyqsvcpmnp.supabase.co/auth/v1/verify',
    });
    if (error) throw error;
  },
}));