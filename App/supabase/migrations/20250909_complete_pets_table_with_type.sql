-- 完整的 pets 表結構（包含 type 欄位）
-- 如果需要重新創建表，請使用此腳本

-- 先備份現有資料（如果表存在）
CREATE TABLE IF NOT EXISTS public.pets_backup AS
SELECT * FROM public.pets;

-- 刪除現有表（小心使用！）
-- DROP TABLE IF EXISTS public.pets CASCADE;

-- 創建完整的 pets 表（包含所有必要欄位）
CREATE TABLE IF NOT EXISTS public.pets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text, -- 新增：寵物類型（狗、貓等）
  breed text,
  birth_date date,
  weight numeric(5, 2),
  description text,
  location text,
  personality_traits text[],
  photos text[],
  live_stream_url text,
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT pets_pkey PRIMARY KEY (id),
  CONSTRAINT pets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_pets_type ON public.pets USING btree (type) TABLESPACE pg_default;

-- 添加欄位註釋
COMMENT ON COLUMN public.pets.type IS '寵物類型：狗、貓等';
COMMENT ON COLUMN public.pets.breed IS '寵物品種';
COMMENT ON COLUMN public.pets.location IS '收容所或居住地點';
COMMENT ON COLUMN public.pets.personality_traits IS '個性特徵陣列';
COMMENT ON COLUMN public.pets.photos IS '寵物照片網址陣列';

-- 設定 Row Level Security (RLS)
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- RLS 政策：用戶只能查看和編輯自己的寵物
CREATE POLICY "Users can view own pets" ON public.pets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pets" ON public.pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pets" ON public.pets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pets" ON public.pets
  FOR DELETE USING (auth.uid() = user_id);

-- 重新整理 schema cache
NOTIFY pgrst, 'reload schema';

-- 驗證表結構
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pets'
ORDER BY ordinal_position;
