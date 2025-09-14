-- =================================================================
-- 修復 pets 表的 schema cache 問題
-- =================================================================

-- 檢查 pets 表是否存在 type 欄位
DO $$
BEGIN
    -- 如果 type 欄位不存在，則新增它
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pets' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.pets ADD COLUMN type text;
        RAISE NOTICE 'Added type column to pets table';
    ELSE
        RAISE NOTICE 'Type column already exists in pets table';
    END IF;
END $$;

-- 確保 pets 表有完整的結構
CREATE TABLE IF NOT EXISTS public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('狗', '貓', 'dog', 'cat')),
  breed text,
  birth_date date,
  weight numeric(5,2),
  photos text[],
  location text,
  live_stream_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 如果表已經存在，確保所有必要的欄位都存在
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('狗', '貓', 'dog', 'cat'));

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS breed text;

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS birth_date date;

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS weight numeric(5,2);

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS photos text[];

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS live_stream_url text;

ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 確保 RLS 已啟用
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- 重新建立 RLS 政策
DROP POLICY IF EXISTS "Users can manage their own pets" ON public.pets;
CREATE POLICY "Users can manage their own pets"
  ON public.pets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_type ON public.pets(type);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON public.pets(created_at);

-- 重新整理 schema cache
NOTIFY pgrst, 'reload schema';

-- 顯示 pets 表的結構
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pets'
ORDER BY ordinal_position;
