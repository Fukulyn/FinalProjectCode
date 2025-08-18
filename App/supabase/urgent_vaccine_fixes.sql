-- =================================================================
-- 第一批：疫苗系統核心功能 (立即需要執行)
-- =================================================================

-- 1. 新增疫苗紀錄的狀態欄位 (修復當前錯誤)
ALTER TABLE public.vaccine_records 
ADD COLUMN IF NOT EXISTS status text DEFAULT '待接種' 
CHECK (status IN ('待接種', '已接種', '已過期'));

-- 2. 新增疫苗紀錄備註欄位
ALTER TABLE public.vaccine_records 
ADD COLUMN IF NOT EXISTS notes text;

-- 3. 建立疫苗提醒設定表
CREATE TABLE IF NOT EXISTS public.vaccine_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vaccine_reminder_days integer NOT NULL DEFAULT 7,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  reminder_time time NOT NULL DEFAULT '09:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT vaccine_reminder_settings_user_unique UNIQUE(user_id)
);

-- 4. 啟用 RLS
ALTER TABLE public.vaccine_reminder_settings ENABLE ROW LEVEL SECURITY;

-- 5. 建立 RLS 政策
CREATE POLICY "Users can manage their own vaccine reminder settings"
  ON public.vaccine_reminder_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. 建立索引
CREATE INDEX IF NOT EXISTS idx_vaccine_reminder_settings_user_id 
  ON public.vaccine_reminder_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_vaccine_records_next_due_date 
  ON public.vaccine_records(next_due_date);

-- 7. 修正 FCM tokens 表
ALTER TABLE public.user_fcm_tokens 
ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'web';

-- 8. FCM tokens RLS 政策 (如果不存在)
DROP POLICY IF EXISTS "Users can manage their own fcm tokens" ON public.user_fcm_tokens;
CREATE POLICY "Users can manage their own fcm tokens"
  ON public.user_fcm_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
