-- 修正 pets 表的 RLS 政策 - 移除危險的 "view all pets" 政策
-- 這個政策允許用戶查看所有寵物，這是安全漏洞

-- 1. 刪除危險的政策
DROP POLICY IF EXISTS "Users with a profile can view all pets" ON public.pets;

-- 2. 建立新的政策：有 profile 的使用者可以查看所有寵物，但只能管理自己的
-- 查看政策：有 profile 的使用者可以看所有寵物
DROP POLICY IF EXISTS "Users with profile can view all pets" ON public.pets;
CREATE POLICY "Users with profile can view all pets"
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- 管理政策：只能新增/修改/刪除自己的寵物
DROP POLICY IF EXISTS "Users can insert their own pets" ON public.pets;
CREATE POLICY "Users can insert their own pets"
  ON public.pets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pets" ON public.pets;
CREATE POLICY "Users can update their own pets"
  ON public.pets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pets" ON public.pets;
CREATE POLICY "Users can delete their own pets"
  ON public.pets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. 確保 RLS 已啟用
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- 4. 檢查其他相關表的政策
-- vaccine_records 表 - 有 profile 的使用者可以查看所有疫苗記錄
DROP POLICY IF EXISTS "Users with profile can view all vaccine records" ON public.vaccine_records;
CREATE POLICY "Users with profile can view all vaccine records"
  ON public.vaccine_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- 但只能新增/修改/刪除自己寵物的疫苗記錄
DROP POLICY IF EXISTS "Users can insert their pets' vaccine records" ON public.vaccine_records;
CREATE POLICY "Users can insert their pets' vaccine records"
  ON public.vaccine_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = vaccine_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their pets' vaccine records" ON public.vaccine_records;
CREATE POLICY "Users can update their pets' vaccine records"
  ON public.vaccine_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = vaccine_records.pet_id
      AND pets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = vaccine_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their pets' vaccine records" ON public.vaccine_records;
CREATE POLICY "Users can delete their pets' vaccine records"
  ON public.vaccine_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = vaccine_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- 5. feeding_records 表 - 有 profile 的使用者可以查看所有餵食記錄
DROP POLICY IF EXISTS "Users with profile can view all feeding records" ON public.feeding_records;
CREATE POLICY "Users with profile can view all feeding records"
  ON public.feeding_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- 但只能管理自己寵物的餵食記錄
DROP POLICY IF EXISTS "Users can manage their pets' feeding records" ON public.feeding_records;
CREATE POLICY "Users can manage their pets' feeding records"
  ON public.feeding_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = feeding_records.pet_id
      AND pets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = feeding_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- 6. 確保所有寵物相關表都啟用 RLS
ALTER TABLE public.vaccine_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_records ENABLE ROW LEVEL SECURITY;
