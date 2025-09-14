import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing. Please set up your environment variables.');
}

// 為每個分頁生成唯一的儲存鍵值，實現多分頁獨立登入
const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// 在開發環境下顯示分頁識別碼，方便調試
if (import.meta.env.DEV) {
  console.log(`🏷️ 分頁識別碼: ${tabId}`);
  console.log(`📦 使用 sessionStorage 儲存鍵值: supabase.auth.token.${tabId}`);
}

export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co',
  supabaseKey || 'your-anon-key',
  {
    auth: {
      storage: window.sessionStorage, // 使用 sessionStorage 替代 localStorage
      storageKey: `supabase.auth.token.${tabId}`, // 每個分頁使用唯一的儲存鍵值
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);