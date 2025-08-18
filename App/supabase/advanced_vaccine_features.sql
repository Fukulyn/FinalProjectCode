-- =================================================================
-- 第二批：進階功能 (可稍後執行)
-- =================================================================

-- 1. 疫苗提醒記錄表
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

-- 2. 通用提醒系統
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

-- 3. 提醒執行記錄
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  executed_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'missed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. 啟用 RLS
ALTER TABLE public.vaccine_reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- 5. 建立進階 RLS 政策
CREATE POLICY "Users can view their own vaccine reminder logs"
  ON public.vaccine_reminder_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert vaccine reminder logs"
  ON public.vaccine_reminder_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can manage their own reminders"
  ON public.reminders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. 建立進階索引
CREATE INDEX IF NOT EXISTS idx_vaccine_reminder_logs_user_id 
  ON public.vaccine_reminder_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id 
  ON public.reminders(user_id);

CREATE INDEX IF NOT EXISTS idx_reminders_active 
  ON public.reminders(active) WHERE active = true;
