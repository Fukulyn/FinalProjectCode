-- 新增 type 欄位到現有的 pets 表
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS type text;

-- 為現有資料設定預設值（根據品種推斷寵物類型）
UPDATE public.pets 
SET type = CASE 
  WHEN breed IN ('黃金獵犬', '拉布拉多', '德國牧羊犬', '比格犬', '柴犬', '博美犬', '吉娃娃', '法國鬥牛犬', '邊境牧羊犬', '哈士奇', '米克斯') THEN '狗'
  WHEN breed IN ('英國短毛貓', '美國短毛貓', '波斯貓', '暹羅貓', '緬因貓', '布偶貓', '俄羅斯藍貓', '蘇格蘭摺耳貓', '孟加拉貓', '阿比西尼亞貓') THEN '貓'
  ELSE '狗' -- 預設為狗
END
WHERE type IS NULL;

-- 添加欄位註釋
COMMENT ON COLUMN public.pets.type IS '寵物類型：狗、貓等';

-- 重新整理 schema cache
NOTIFY pgrst, 'reload schema';
