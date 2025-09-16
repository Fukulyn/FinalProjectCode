-- 修復 pets 表：添加缺少的 type 欄位
-- 這解決了 "Could not find the 'type' column of 'pets' in the schema cache" 錯誤

-- 添加 type 欄位到 pets 表
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS type text;

-- 為現有資料設定預設值（根據品種推斷）
UPDATE public.pets 
SET type = CASE 
  WHEN breed IN ('黃金獵犬', '拉布拉多', '德國牧羊犬', '比格犬', '柴犬', '博美犬', '吉娃娃', '法國鬥牛犬', '邊境牧羊犬', '哈士奇') THEN '狗'
  WHEN breed IN ('英國短毛貓', '美國短毛貓', '波斯貓', '暹羅貓', '緬因貓', '布偶貓', '俄羅斯藍貓', '蘇格蘭摺耳貓', '孟加拉貓', '阿比西尼亞貓') THEN '貓'
  ELSE '狗' -- 預設為狗
END
WHERE type IS NULL;

-- 添加註釋
COMMENT ON COLUMN public.pets.type IS '寵物類型：狗、貓等';

-- 重新整理 schema cache
NOTIFY pgrst, 'reload schema';

-- 驗證欄位是否成功添加
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pets' 
  AND column_name = 'type';

-- 顯示 pets 表的完整結構
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'pets'
ORDER BY ordinal_position;
