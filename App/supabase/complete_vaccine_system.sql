-- =================================================================
-- PawsConnect 疫苗提醒系統 - 缺少的資料庫結構補充
-- =================================================================

-- 1. 新增疫苗紀錄的狀態和備註欄位
ALTER TABLE public.vaccine_records 
ADD COLUMN IF NOT EXISTS status text DEFAULT '待接種' 
CHECK (status IN ('待接種', '已接種', '已過期'));

ALTER TABLE public.vaccine_records 
ADD COLUMN IF NOT EXISTS notes text;

-- 2. 建立疫苗提醒設定表
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

-- 3. 建立疫苗提醒記錄表
CREATE TABLE IF NOT EXISTS public.vaccine_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_record_id uuid NOT NULL REFERENCES public.vaccine_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('email', 'push', 'sms')),
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- 4. 建立提醒系統通用表 (如果不存在)
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('feeding', 'medicine', 'cleaning', 'vaccine')),
  title text NOT NULL,
  description text,
  scheduled_time time NOT NULL,
  repeat_days integer[] NOT NULL DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. 建立提醒執行記錄表
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  executed_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'missed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 6. 修正 user_fcm_tokens 表結構 (新增 device_type 欄位)
ALTER TABLE public.user_fcm_tokens 
ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'web';



-- =================================================================
-- 啟用 Row Level Security (RLS)
-- =================================================================

-- 啟用新表的 RLS
ALTER TABLE public.vaccine_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- 建立 RLS 安全政策
-- =================================================================

-- 疫苗提醒設定 - 用戶只能管理自己的設定
DROP POLICY IF EXISTS "Users can manage their own vaccine reminder settings" ON public.vaccine_reminder_settings;
CREATE POLICY "Users can manage their own vaccine reminder settings"
  ON public.vaccine_reminder_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 疫苗提醒記錄 - 用戶只能查看自己的提醒記錄
DROP POLICY IF EXISTS "Users can view their own vaccine reminder logs" ON public.vaccine_reminder_logs;
CREATE POLICY "Users can view their own vaccine reminder logs"
  ON public.vaccine_reminder_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 系統可以插入提醒記錄
DROP POLICY IF EXISTS "System can insert vaccine reminder logs" ON public.vaccine_reminder_logs;
CREATE POLICY "System can insert vaccine reminder logs"
  ON public.vaccine_reminder_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 通用提醒 - 用戶只能管理自己的提醒
DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.reminders;
CREATE POLICY "Users can manage their own reminders"
  ON public.reminders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 提醒執行記錄
DROP POLICY IF EXISTS "Users can manage reminder logs for their reminders" ON public.reminder_logs;
CREATE POLICY "Users can manage reminder logs for their reminders"
  ON public.reminder_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminders
      WHERE reminders.id = reminder_logs.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );


-- FCM tokens - 用戶只能管理自己的 token
DROP POLICY IF EXISTS "Users can manage their own fcm tokens" ON public.user_fcm_tokens;
CREATE POLICY "Users can manage their own fcm tokens"
  ON public.user_fcm_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =================================================================
-- 建立索引以提升查詢效能
-- =================================================================

-- 疫苗提醒相關索引
CREATE INDEX IF NOT EXISTS idx_vaccine_reminder_settings_user_id 
  ON public.vaccine_reminder_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_vaccine_reminder_logs_user_id 
  ON public.vaccine_reminder_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_vaccine_reminder_logs_vaccine_record_id 
  ON public.vaccine_reminder_logs(vaccine_record_id);

CREATE INDEX IF NOT EXISTS idx_vaccine_records_next_due_date 
  ON public.vaccine_records(next_due_date);

CREATE INDEX IF NOT EXISTS idx_vaccine_records_status 
  ON public.vaccine_records(status) WHERE status IS NOT NULL;

-- 提醒系統索引
CREATE INDEX IF NOT EXISTS idx_reminders_user_id 
  ON public.reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_reminders_pet_id 
  ON public.reminders(pet_id);

CREATE INDEX IF NOT EXISTS idx_reminders_type 
  ON public.reminders(type);

CREATE INDEX IF NOT EXISTS idx_reminders_active 
  ON public.reminders(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id 
  ON public.reminder_logs(reminder_id);

-- FCM tokens 索引
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id 
  ON public.user_fcm_tokens(user_id);

-- =================================================================
-- 建立自動更新 updated_at 欄位的函數和觸發器
-- =================================================================

-- 建立更新 updated_at 的函數 (如果不存在)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 為相關表建立觸發器
DO $$
BEGIN
    -- 疫苗提醒設定
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vaccine_reminder_settings_updated_at') THEN
        CREATE TRIGGER update_vaccine_reminder_settings_updated_at 
            BEFORE UPDATE ON public.vaccine_reminder_settings 
            FOR EACH ROW 
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- 提醒系統
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reminders_updated_at') THEN
        CREATE TRIGGER update_reminders_updated_at 
            BEFORE UPDATE ON public.reminders 
            FOR EACH ROW 
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    

    -- FCM tokens
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_fcm_tokens_updated_at') THEN
        CREATE TRIGGER update_user_fcm_tokens_updated_at 
            BEFORE UPDATE ON public.user_fcm_tokens 
            FOR EACH ROW 
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- =================================================================
-- 建立檢視表 (Views) 以簡化複雜查詢
-- =================================================================

-- 疫苗到期狀況檢視
CREATE OR REPLACE VIEW public.vaccine_status_view AS
SELECT 
    vr.*,
    p.name as pet_name,
    p.user_id,
    CASE 
        WHEN vr.next_due_date < CURRENT_DATE THEN 'expired'
        WHEN vr.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        WHEN vr.next_due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'upcoming'
        ELSE 'normal'
    END as urgency_level,
    (vr.next_due_date - CURRENT_DATE) as days_until_due
FROM public.vaccine_records vr
JOIN public.pets p ON vr.pet_id = p.id
WHERE vr.status != '已接種';

-- 用戶疫苗提醒總覽
CREATE OR REPLACE VIEW public.user_vaccine_alerts AS
SELECT 
    u.id as user_id,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN urgency_level = 'expired' THEN 1 END) as expired_count,
    COUNT(CASE WHEN urgency_level = 'due_soon' THEN 1 END) as due_soon_count,
    COUNT(CASE WHEN urgency_level = 'upcoming' THEN 1 END) as upcoming_count
FROM auth.users u
LEFT JOIN public.vaccine_status_view vsv ON u.id = vsv.user_id
GROUP BY u.id;

-- =================================================================
-- 插入預設資料 (如果需要)
-- =================================================================

-- 預設疫苗類型資料 (範例，實際使用時請移除此區塊)
-- INSERT INTO public.vaccine_records (pet_id, vaccine_name, date, next_due_date, status) 
-- VALUES 
-- (gen_random_uuid(), '範例疫苗', '2024-01-01', '2025-01-01', '待接種')
-- ON CONFLICT DO NOTHING;

-- =================================================================
-- 授予必要權限 (如果需要特定角色)
-- =================================================================

-- 授予 authenticated 角色對新表的權限
GRANT ALL ON public.vaccine_reminder_settings TO authenticated;
GRANT ALL ON public.vaccine_reminder_logs TO authenticated;
GRANT ALL ON public.reminders TO authenticated;
GRANT ALL ON public.reminder_logs TO authenticated;



-- =================================================================
-- 完成訊息
-- =================================================================
-- 執行完成後，您的資料庫將具備完整的疫苗提醒系統功能！
