-- 檢查並修正 pets 表的 RLS 安全政策
-- 這個問題非常嚴重：用戶可以看到其他人的寵物資料

-- 1. 檢查 pets 表是否啟用了 RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'pets';

-- 2. 檢查現有的 RLS 政策
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'pets';

-- 3. 檢查 pets 表結構
\d pets

-- 4. 測試查詢 - 應該只返回當前用戶的寵物
SELECT id, name, user_id, created_at 
FROM pets 
WHERE user_id = auth.uid()
LIMIT 5;

-- 5. 如果 RLS 未正確設置，立即修正
DO $$
BEGIN
    -- 啟用 RLS
    ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
    
    -- 刪除可能存在的舊政策
    DROP POLICY IF EXISTS "Users can only see their own pets" ON public.pets;
    DROP POLICY IF EXISTS "Users can manage their own pets" ON public.pets;
    DROP POLICY IF EXISTS "pets_policy" ON public.pets;
    
    -- 建立正確的 RLS 政策
    CREATE POLICY "Users can manage their own pets"
        ON public.pets
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
        
    RAISE NOTICE 'pets 表 RLS 政策已修正';
END $$;
