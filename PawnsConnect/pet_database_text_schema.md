# 寵物管理系統資料庫結構

## 1. 用戶相關表格

### auth.users (認證用戶)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 用戶ID |

### profiles (用戶資料)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY, FOREIGN KEY | 用戶ID |
| updated_at | timestamp with time zone | | 更新時間 |
| full_name | text | | 姓名 |
| avatar_url | text | | 頭像網址 |
| role | USER-DEFINED | NOT NULL | 角色 |

### user_fcm_tokens (推播令牌)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | integer | PRIMARY KEY | 令牌ID |
| user_id | uuid | FOREIGN KEY, NOT NULL | 用戶ID |
| fcm_token | text | NOT NULL | 推播令牌 |
| created_at | timestamp with time zone | DEFAULT now() | 建立時間 |
| updated_at | timestamp with time zone | DEFAULT now() | 更新時間 |
| device_type | text | DEFAULT 'web' | 裝置類型 |

## 2. 寵物相關表格

### pets (寵物)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 寵物ID |
| user_id | uuid | FOREIGN KEY, NOT NULL | 飼主ID |
| name | text | NOT NULL | 寵物名稱 |
| birth_date | date | | 生日 |
| weight | numeric | | 體重 |
| photos | ARRAY | | 照片 |
| breed | text | | 品種 |
| description | text | | 描述 |
| location | text | | 位置 |
| personality_traits | ARRAY | | 個性特徵 |
| live_stream_url | text | | 直播網址 |
| created_at | timestamp with time zone | DEFAULT now() | 建立時間 |

### user_dog_likes (用戶喜歡的寵物)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| user_id | uuid | PRIMARY KEY, FOREIGN KEY, NOT NULL | 用戶ID |
| dog_id | uuid | PRIMARY KEY, FOREIGN KEY, NOT NULL | 寵物ID |
| liked_at | timestamp with time zone | NOT NULL, DEFAULT now() | 按讚時間 |

## 3. 餵食相關表格

### feeding_records (餵食記錄)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 餵食記錄ID |
| pet_id | uuid | FOREIGN KEY, NOT NULL | 寵物ID |
| food_type | text | NOT NULL | 食物類型 |
| amount | numeric | NOT NULL | 餵食量 |
| weight | numeric | | 重量 |
| laser_distance | numeric | | 雷射距離 |
| power | numeric | | 功率 |
| fed_at | timestamp with time zone | DEFAULT now() | 餵食時間 |
| calories | real | NOT NULL | 卡路里 |

### feeding_schedules (餵食排程)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 排程ID |
| pet_id | uuid | FOREIGN KEY | 寵物ID |
| time | time without time zone | NOT NULL | 餵食時間 |
| food_type | text | NOT NULL | 食物類型 |
| amount | numeric | NOT NULL | 餵食量 |
| days | ARRAY | NOT NULL, DEFAULT '{}' | 排程日期 |
| enabled | boolean | DEFAULT true | 是否啟用 |
| created_at | timestamp with time zone | DEFAULT now() | 建立時間 |
| updated_at | timestamp with time zone | DEFAULT now() | 更新時間 |

### food_data (食物營養資料)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| food_type | text | PRIMARY KEY | 食物類型 |
| id | bigint | NOT NULL | 食物ID |
| protein | numeric | | 蛋白質 |
| fat | numeric | | 脂肪 |
| fiber | numeric | | 纖維 |
| calcium | numeric | | 鈣質 |
| moisture | numeric | | 水分 |
| phosphorus | numeric | | 磷 |

## 4. 健康記錄表格

### health_records (健康記錄)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 健康記錄ID |
| pet_id | uuid | FOREIGN KEY, NOT NULL | 寵物ID |
| temperature | numeric | | 體溫 |
| heart_rate | integer | | 心跳 |
| oxygen_level | numeric | | 血氧濃度 |
| power | numeric | | 功率 |
| steps_value | numeric | | 步數 |
| condition_description | text | | 健康狀況描述 |
| recorded_at | timestamp with time zone | DEFAULT now() | 記錄時間 |

## 5. 提醒相關表格

### reminders (提醒)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 提醒ID |
| user_id | uuid | FOREIGN KEY, NOT NULL | 用戶ID |
| pet_id | uuid | FOREIGN KEY, NOT NULL | 寵物ID |
| type | text | NOT NULL, CHECK | 提醒類型 |
| title | text | NOT NULL | 標題 |
| description | text | | 描述 |
| scheduled_time | time without time zone | NOT NULL | 排程時間 |
| repeat_days | ARRAY | NOT NULL, DEFAULT '{}' | 重複日期 |
| active | boolean | DEFAULT true | 是否啟用 |
| created_at | timestamp with time zone | DEFAULT now() | 建立時間 |
| updated_at | timestamp with time zone | DEFAULT now() | 更新時間 |

**提醒類型選項**: 'feeding' (餵食), 'medicine' (藥物), 'cleaning' (清潔), 'vaccine' (疫苗)

### reminder_logs (提醒執行記錄)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 記錄ID |
| reminder_id | uuid | FOREIGN KEY, NOT NULL | 提醒ID |
| status | text | NOT NULL, CHECK | 狀態 |
| notes | text | | 備註 |
| executed_at | timestamp with time zone | DEFAULT now() | 執行時間 |
| created_at | timestamp with time zone | DEFAULT now() | 建立時間 |

**狀態選項**: 'pending' (待執行), 'completed' (已完成), 'missed' (已錯過)

## 6. 疫苗相關表格

### vaccine_records (疫苗記錄)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 疫苗記錄ID |
| pet_id | uuid | FOREIGN KEY, NOT NULL | 寵物ID |
| vaccine_name | text | NOT NULL | 疫苗名稱 |
| date | date | NOT NULL | 接種日期 |
| next_due_date | date | NOT NULL | 下次到期日 |
| status | text | DEFAULT '待接種', CHECK | 狀態 |
| notes | text | | 備註 |

**狀態選項**: '待接種', '已接種', '已過期'

### vaccine_reminder_settings (疫苗提醒設定)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 設定ID |
| user_id | uuid | FOREIGN KEY, NOT NULL, UNIQUE | 用戶ID |
| vaccine_reminder_days | integer | NOT NULL, DEFAULT 7 | 提醒天數 |
| email_enabled | boolean | NOT NULL, DEFAULT true | 郵件提醒啟用 |
| push_enabled | boolean | NOT NULL, DEFAULT true | 推播提醒啟用 |
| reminder_time | time without time zone | NOT NULL, DEFAULT '09:00:00' | 提醒時間 |
| created_at | timestamp with time zone | DEFAULT now() | 建立時間 |
| updated_at | timestamp with time zone | DEFAULT now() | 更新時間 |

### vaccine_reminder_logs (疫苗提醒記錄)
| 欄位名稱 | 資料型別 | 約束 | 中文說明 |
|---------|----------|------|----------|
| id | uuid | PRIMARY KEY | 記錄ID |
| vaccine_record_id | uuid | FOREIGN KEY, NOT NULL | 疫苗記錄ID |
| user_id | uuid | FOREIGN KEY, NOT NULL | 用戶ID |
| reminder_type | text | NOT NULL, CHECK | 提醒類型 |
| status | text | NOT NULL, DEFAULT 'sent', CHECK | 狀態 |
| error_message | text | | 錯誤訊息 |
| sent_at | timestamp with time zone | DEFAULT now() | 發送時間 |
| created_at | timestamp with time zone | DEFAULT now() | 建立時間 |

**提醒類型選項**: 'email' (郵件), 'push' (推播), 'sms' (簡訊)
**狀態選項**: 'sent' (已發送), 'failed' (失敗), 'pending' (待發送)

---

## 表格關係說明

### 主要外鍵關係：
- **profiles.id** → **auth.users.id** (一對一)
- **user_fcm_tokens.user_id** → **auth.users.id** (一對多)
- **pets.user_id** → **auth.users.id** (一對多)
- **user_dog_likes.user_id** → **auth.users.id** (多對多)
- **user_dog_likes.dog_id** → **pets.id** (多對多)
- **feeding_records.pet_id** → **pets.id** (一對多)
- **feeding_schedules.pet_id** → **pets.id** (一對多)
- **health_records.pet_id** → **pets.id** (一對多)
- **reminders.user_id** → **auth.users.id** (一對多)
- **reminders.pet_id** → **pets.id** (一對多)
- **reminder_logs.reminder_id** → **reminders.id** (一對多)
- **vaccine_records.pet_id** → **pets.id** (一對多)
- **vaccine_reminder_settings.user_id** → **auth.users.id** (一對一)
- **vaccine_reminder_logs.vaccine_record_id** → **vaccine_records.id** (一對多)
- **vaccine_reminder_logs.user_id** → **auth.users.id** (一對多)

### 核心業務流程：
1. **用戶註冊** → 建立 profiles 和 vaccine_reminder_settings
2. **寵物管理** → 記錄基本資料、照片、特徵
3. **餵食管理** → 排程自動餵食、記錄餵食歷史
4. **健康監控** → 記錄生理數據、健康狀況
5. **提醒系統** → 設定各類提醒、追蹤執行狀況
6. **疫苗管理** → 記錄接種歷史、自動提醒到期