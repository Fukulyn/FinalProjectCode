
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "【 Firebase Studio 環境設定錯誤 】：必要的環境變數 'NEXT_PUBLIC_SUPABASE_URL' 未設定或應用程式未正確讀取。\n\n" +
    "請在您的【Firebase Studio 專案設定】中執行以下操作：\n" +
    "1. 檢查 Firebase Studio 環境變數：確認 'NEXT_PUBLIC_SUPABASE_URL' 已設定為您的 Supabase 專案 URL (例如：https://<project-id>.supabase.co)。\n" +
    "2. 【關鍵步驟】重新啟動/重新部署：在 Firebase Studio 中儲存任何環境變數的變更後，您【必須】依照 Firebase Studio 的指示，完整「重新啟動」或「重新部署」您的應用程式。僅儲存變數是不夠的。\n" +
    "3. 查閱 Firebase Studio 文件：若不確定如何設定或使環境變數生效，請參考 Firebase Studio 的官方文件。\n\n" +
    "(對於本地 .env.local 使用者：若您在本地執行，請確保 .env.local 檔案正確無誤且已重新啟動開發伺服器。)"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "【 Firebase Studio 環境設定錯誤 】：必要的環境變數 'NEXT_PUBLIC_SUPABASE_ANON_KEY' 未設定或應用程式未正確讀取。\n\n" +
    "請在您的【Firebase Studio 專案設定】中執行以下操作：\n" +
    "1. 檢查 Firebase Studio 環境變數：確認 'NEXT_PUBLIC_SUPABASE_ANON_KEY' 已設定為您的 Supabase 專案的公開匿名金鑰 (public anon key)。\n" +
    "2. 【關鍵步驟】重新啟動/重新部署：在 Firebase Studio 中儲存任何環境變數的變更後，您【必須】依照 Firebase Studio 的指示，完整「重新啟動」或「重新部署」您的應用程式。僅儲存變數是不夠的。\n" +
    "3. 查閱 Firebase Studio 文件：若不確定如何設定或使環境變數生效，請參考 Firebase Studio 的官方文件。\n\n" +
    "(對於本地 .env.local 使用者：若您在本地執行，請確保 .env.local 檔案正確無誤且已重新啟動開發伺服器。)"
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    