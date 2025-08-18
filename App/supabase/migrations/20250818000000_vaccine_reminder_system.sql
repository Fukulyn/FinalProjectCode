-- 新增疫苗提醒設定表
CREATE TABLE IF NOT EXISTS vaccine_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  vaccine_reminder_days integer NOT NULL DEFAULT 7,
  email_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  reminder_time time NOT NULL DEFAULT '09:00:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 修正現有的 user_fcm_tokens 表結構 (如果需要)
-- 此表已存在，跳過建立但確保欄位存在
ALTER TABLE user_fcm_tokens 
ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'web';

-- 新增疫苗紀錄狀態欄位 (如果不存在)
ALTER TABLE vaccine_records 
ADD COLUMN IF NOT EXISTS status text DEFAULT '待接種' CHECK (status IN ('待接種', '已接種', '已過期'));

-- 新增疫苗紀錄備註欄位
ALTER TABLE vaccine_records 
ADD COLUMN IF NOT EXISTS notes text;

-- 新增疫苗提醒記錄表
CREATE TABLE IF NOT EXISTS vaccine_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_record_id uuid REFERENCES vaccine_records ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  reminder_type text NOT NULL CHECK (reminder_type IN ('email', 'push', 'sms')),
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 啟用 RLS
ALTER TABLE vaccine_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccine_reminder_logs ENABLE ROW LEVEL SECURITY;

-- 創建 RLS 政策
CREATE POLICY "Users can manage their own reminder settings"
  ON vaccine_reminder_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own FCM tokens"
  ON user_fcm_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own reminder logs"
  ON vaccine_reminder_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 創建自動更新 updated_at 的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 創建觸發器
CREATE TRIGGER update_vaccine_reminder_settings_updated_at 
  BEFORE UPDATE ON vaccine_reminder_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_fcm_tokens_updated_at 
  BEFORE UPDATE ON user_fcm_tokens 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
