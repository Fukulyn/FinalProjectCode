-- =================================================================
-- 新增指定寵物的餵食記錄 (Feeding Records)
-- 食物類型：S30低敏狗飼料、優格-經典系列-高齡犬羊肉+米、全齡犬無穀低敏犬糧
-- =================================================================

-- 新增餵食記錄資料
INSERT INTO public.feeding_records (pet_id, food_type, amount, calories, fed_at, weight, laser_distance, power) VALUES

-- 寵物 43c23d4a-4235-4395-8384-73dbdd7a7ad8 的餵食記錄
('43c23d4a-4235-4395-8384-73dbdd7a7ad8', 'S30低敏狗飼料', 85.00, 315.0, NOW() - INTERVAL '2 hours', 4.2, 12.5, 88),
('43c23d4a-4235-4395-8384-73dbdd7a7ad8', '優格-經典系列-高齡犬羊肉+米', 120.00, 280.0, NOW() - INTERVAL '8 hours', 4.2, 11.8, 85),
('43c23d4a-4235-4395-8384-73dbdd7a7ad8', '全齡犬無穀低敏犬糧', 75.00, 295.0, NOW() - INTERVAL '1 day', 4.1, 12.2, 82),
('43c23d4a-4235-4395-8384-73dbdd7a7ad8', 'S30低敏狗飼料', 80.00, 298.0, NOW() - INTERVAL '1 day 6 hours', 4.1, 12.0, 84),
('43c23d4a-4235-4395-8384-73dbdd7a7ad8', '優格-經典系列-高齡犬羊肉+米', 110.00, 260.0, NOW() - INTERVAL '2 days', 4.0, 11.9, 86),

-- 寵物 6de0c5de-31af-4125-802e-d4e6b653d462 的餵食記錄
('6de0c5de-31af-4125-802e-d4e6b653d462', '全齡犬無穀低敏犬糧', 150.00, 590.0, NOW() - INTERVAL '1 hour', 12.8, 8.5, 92),
('6de0c5de-31af-4125-802e-d4e6b653d462', 'S30低敏狗飼料', 180.00, 665.0, NOW() - INTERVAL '7 hours', 12.7, 8.2, 89),
('6de0c5de-31af-4125-802e-d4e6b653d462', '優格-經典系列-高齡犬羊肉+米', 200.00, 465.0, NOW() - INTERVAL '1 day 2 hours', 12.6, 8.8, 87),
('6de0c5de-31af-4125-802e-d4e6b653d462', '全齡犬無穀低敏犬糧', 145.00, 570.0, NOW() - INTERVAL '1 day 9 hours', 12.5, 8.3, 90),
('6de0c5de-31af-4125-802e-d4e6b653d462', 'S30低敏狗飼料', 175.00, 648.0, NOW() - INTERVAL '2 days 3 hours', 12.4, 8.1, 88),

-- 寵物 6e5c5a03-a908-4407-97e4-588190d2ca78 的餵食記錄
('6e5c5a03-a908-4407-97e4-588190d2ca78', 'S30低敏狗飼料', 65.00, 240.0, NOW() - INTERVAL '3 hours', 2.1, 15.2, 79),
('6e5c5a03-a908-4407-97e4-588190d2ca78', '優格-經典系列-高齡犬羊肉+米', 90.00, 210.0, NOW() - INTERVAL '9 hours', 2.1, 14.8, 76),
('6e5c5a03-a908-4407-97e4-588190d2ca78', '全齡犬無穀低敏犬糧', 70.00, 275.0, NOW() - INTERVAL '15 hours', 2.0, 15.0, 78),
('6e5c5a03-a908-4407-97e4-588190d2ca78', 'S30低敏狗飼料', 60.00, 222.0, NOW() - INTERVAL '1 day 4 hours', 2.0, 14.9, 80),
('6e5c5a03-a908-4407-97e4-588190d2ca78', '優格-經典系列-高齡犬羊肉+米', 85.00, 198.0, NOW() - INTERVAL '2 days 1 hour', 1.9, 15.1, 77),

-- 寵物 85cb507a-9fbc-4f99-b0aa-91c8049090fe 的餵食記錄
('85cb507a-9fbc-4f99-b0aa-91c8049090fe', '全齡犬無穀低敏犬糧', 125.00, 490.0, NOW() - INTERVAL '1.5 hours', 7.5, 10.2, 91),
('85cb507a-9fbc-4f99-b0aa-91c8049090fe', 'S30低敏狗飼料', 140.00, 518.0, NOW() - INTERVAL '6 hours', 7.4, 9.8, 88),
('85cb507a-9fbc-4f99-b0aa-91c8049090fe', '優格-經典系列-高齡犬羊肉+米', 160.00, 372.0, NOW() - INTERVAL '12 hours', 7.3, 10.5, 85),
('85cb507a-9fbc-4f99-b0aa-91c8049090fe', '全齡犬無穀低敏犬糧', 120.00, 472.0, NOW() - INTERVAL '1 day 8 hours', 7.2, 10.0, 89),
('85cb507a-9fbc-4f99-b0aa-91c8049090fe', 'S30低敏狗飼料', 135.00, 500.0, NOW() - INTERVAL '2 days 5 hours', 7.1, 9.9, 87),

-- 寵物 8fef796c-5a6b-4c9f-bb06-81fd146b9ea9 的餵食記錄
('8fef796c-5a6b-4c9f-bb06-81fd146b9ea9', 'S30低敏狗飼料', 160.00, 592.0, NOW() - INTERVAL '45 minutes', 9.2, 9.2, 93),
('8fef796c-5a6b-4c9f-bb06-81fd146b9ea9', '全齡犬無穀低敏犬糧', 145.00, 570.0, NOW() - INTERVAL '5 hours', 9.1, 8.9, 90),
('8fef796c-5a6b-4c9f-bb06-81fd146b9ea9', '優格-經典系列-高齡犬羊肉+米', 180.00, 418.0, NOW() - INTERVAL '11 hours', 9.0, 9.5, 87),
('8fef796c-5a6b-4c9f-bb06-81fd146b9ea9', 'S30低敏狗飼料', 155.00, 574.0, NOW() - INTERVAL '1 day 7 hours', 8.9, 9.1, 91),
('8fef796c-5a6b-4c9f-bb06-81fd146b9ea9', '全齡犬無穀低敏犬糧', 140.00, 550.0, NOW() - INTERVAL '2 days 4 hours', 8.8, 8.8, 89),

-- 寵物 b07c0d53-f142-414f-9df1-4487e623ad31 的餵食記錄
('b07c0d53-f142-414f-9df1-4487e623ad31', '優格-經典系列-高齡犬羊肉+米', 130.00, 302.0, NOW() - INTERVAL '2 hours', 5.8, 11.5, 86),
('b07c0d53-f142-414f-9df1-4487e623ad31', 'S30低敏狗飼料', 115.00, 426.0, NOW() - INTERVAL '8 hours', 5.7, 11.2, 83),
('b07c0d53-f142-414f-9df1-4487e623ad31', '全齡犬無穀低敏犬糧', 100.00, 393.0, NOW() - INTERVAL '14 hours', 5.6, 11.8, 80),
('b07c0d53-f142-414f-9df1-4487e623ad31', '優格-經典系列-高齡犬羊肉+米', 125.00, 290.0, NOW() - INTERVAL '1 day 6 hours', 5.5, 11.3, 84),
('b07c0d53-f142-414f-9df1-4487e623ad31', 'S30低敏狗飼料', 110.00, 407.0, NOW() - INTERVAL '2 days 2 hours', 5.4, 11.0, 81);

-- 驗證新增結果
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT pet_id) as unique_pets,
    food_type,
    COUNT(*) as records_per_food_type
FROM public.feeding_records 
WHERE pet_id IN (
    '43c23d4a-4235-4395-8384-73dbdd7a7ad8',
    '6de0c5de-31af-4125-802e-d4e6b653d462',
    '6e5c5a03-a908-4407-97e4-588190d2ca78',
    '85cb507a-9fbc-4f99-b0aa-91c8049090fe',
    '8fef796c-5a6b-4c9f-bb06-81fd146b9ea9',
    'b07c0d53-f142-414f-9df1-4487e623ad31'
)
GROUP BY food_type
ORDER BY food_type;

-- 完成訊息
SELECT 'Successfully inserted 30 feeding records for 6 pets with 3 food types!' as status;