-- 修正 pets 表的 Row Level Security (RLS) 政策
-- 解決用戶看到其他人寵物的安全漏洞

-- 啟用 Row Level Security
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- 刪除可能存在的舊政策（避免衝突）
DROP POLICY IF EXISTS "Users can only see their own pets" ON public.pets;
DROP POLICY IF EXISTS "Users can manage their own pets" ON public.pets;
DROP POLICY IF EXISTS "pets_policy" ON public.pets;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.pets;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.pets;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.pets;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.pets;

-- 建立正確的 RLS 政策：用戶只能管理自己的寵物
CREATE POLICY "Users can manage their own pets"
    ON public.pets
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 確保只有已認證用戶可以存取
REVOKE ALL ON public.pets FROM anon;
GRANT ALL ON public.pets TO authenticated;
