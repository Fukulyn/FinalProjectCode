# 🐾 PawsConnect 寵物管理系統資料庫分析報告

## 📊 系統概覽

PawsConnect是一個全方位的寵物健康管理系統，整合了IoT設備監控、疫苗提醒、餵食管理等功能。本文件詳細分析了系統的資料庫結構、規模和複雜度。

## 🔍 綜合分析摘要

PawsConnect寵物管理系統採用了完整的關聯式資料庫架構，共包含13個資料表和99個欄位，形成8個核心業務實體的完整生態系統。系統以auth.users和pets兩個表為核心樞紐，透過14個外鍵關聯建立了緊密的資料關係網，其中auth.users被7個表參照作為系統核心，pets被6個表參照作為業務核心。

在資料表設計上，系統涵蓋了從用戶管理(profiles)、寵物檔案(pets)到即時監控(health_records、feeding_records)的完整業務流程，同時包含提醒系統(reminders、vaccine_records)和系統支援功能(user_fcm_tokens、food_data)。欄位分佈以UUID(39個,39.4%)和Text(24個,24.2%)為主要資料類型，搭配Timestamp(14個,14.1%)和Numeric(12個,12.1%)來處理時序性和數值型資料。

從資料量規模來看，系統呈現明顯的分層特性：health_records和feeding_records屬於大容量表，預估可達數十萬筆並以指數或線性模式高頻增長；pets、vaccine_records、reminders等中容量表預估達數千至數萬筆規模；而profiles、food_data等小容量表維持在數百至數千筆的穩定規模。整體系統依部署規模可支援從小型(<1GB)到大型(10-100GB)的不同需求，具備良好的擴展性和實用性。

---

## 🗃️ 資料表統計

### 資料表總數：**13個**

| 序號 | 資料表名稱 | 中文說明 | 功能類型 |
|------|------------|----------|----------|
| 1 | `feeding_records` | 餵食記錄 | 事務記錄 |
| 2 | `feeding_schedules` | 餵食排程 | 配置管理 |
| 3 | `food_data` | 食物營養資料 | 參考資料 |
| 4 | `health_records` | 健康記錄 | 事務記錄 |
| 5 | `pets` | 浪浪檔案 | 核心實體 |
| 6 | `profiles` | 用戶資料 | 核心實體 |
| 7 | `reminder_logs` | 提醒執行記錄 | 系統日誌 |
| 8 | `reminders` | 提醒設定 | 配置管理 |
| 9 | `user_dog_likes` | 用戶喜好配對 | 關聯資料 |
| 10 | `user_fcm_tokens` | 推播令牌 | 系統支援 |
| 11 | `vaccine_records` | 疫苗記錄 | 事務記錄 |
| 12 | `vaccine_reminder_logs` | 疫苗提醒記錄 | 系統日誌 |
| 13 | `vaccine_reminder_settings` | 疫苗提醒設定 | 配置管理 |

---

## 🏗️ 實體分析

### 核心實體總數：**8個**

#### 主要實體

1. **用戶（User）**
   - 主表：`profiles`
   - 說明：系統使用者基本資料
   - 關聯：系統核心樞紐

2. **寵物（Pet）**
   - 主表：`pets`
   - 說明：浪浪基本檔案資料
   - 關聯：業務核心樞紐

3. **餵食記錄（Feeding Record）**
   - 主表：`feeding_records`
   - 說明：每次餵食的詳細記錄
   - 特性：高頻率資料產生

4. **健康記錄（Health Record）**
   - 主表：`health_records`
   - 說明：IoT設備生理監測資料
   - 特性：即時資料流

#### 輔助實體

5. **疫苗記錄（Vaccine Record）**
   - 主表：`vaccine_records`
   - 說明：疫苗接種追蹤記錄

6. **提醒（Reminder）**
   - 主表：`reminders`
   - 說明：各類型提醒設定

7. **食物資料（Food Data）**
   - 主表：`food_data`
   - 說明：營養成分參考資料

8. **用戶偏好（User Preference）**
   - 主表：`user_dog_likes`
   - 說明：浪浪配對喜好記錄

---

## 🔢 欄位詳細統計

### 總欄位數：**99個**

#### 各表欄位分佈

| 資料表 | 欄位數 | 主要資料類型 | 特殊欄位 |
|--------|--------|--------------|----------|
| **feeding_records** | 8 | UUID, numeric, text, timestamp | calories (real) |
| **feeding_schedules** | 9 | UUID, numeric, text, array, boolean | days (array) |
| **food_data** | 7 | bigint, numeric, text | 營養成分欄位群 |
| **health_records** | 9 | UUID, numeric, integer, text | 生理監測數據群 |
| **pets** | 12 | UUID, text, date, numeric, array | photos, personality_traits |
| **profiles** | 5 | UUID, text, timestamp, user-defined | role (enum) |
| **reminder_logs** | 6 | UUID, text, timestamp | status (check constraint) |
| **reminders** | 11 | UUID, text, time, array, boolean | repeat_days, type (enum) |
| **user_dog_likes** | 3 | UUID, timestamp | 複合主鍵 |
| **user_fcm_tokens** | 6 | UUID, text, integer, timestamp | fcm_token |
| **vaccine_records** | 7 | UUID, text, date | status (check constraint) |
| **vaccine_reminder_logs** | 8 | UUID, text, timestamp | reminder_type (enum) |
| **vaccine_reminder_settings** | 8 | UUID, integer, boolean, time | 個人化設定群 |

#### 資料類型分佈

- **UUID**: 39個 (39.4%)
- **Text**: 24個 (24.2%)
- **Timestamp**: 14個 (14.1%)
- **Numeric**: 12個 (12.1%)
- **Boolean**: 4個 (4.0%)
- **其他**: 6個 (6.1%)

---

## 🔗 關聯性分析

### 外鍵關聯：**14個**

#### 關聯樞紐分析

**auth.users（系統核心）**
- 被參照次數：7次
- 關聯表：profiles, user_fcm_tokens, reminders, user_dog_likes, vaccine_reminder_logs, vaccine_reminder_settings

**pets（業務核心）**
- 被參照次數：6次
- 關聯表：feeding_records, feeding_schedules, health_records, reminders, user_dog_likes, vaccine_records

#### 關聯密度評估

```
高密度關聯 (5+ 關聯)
├── auth.users (7個關聯)
└── pets (6個關聯)

中密度關聯 (2-4 關聯)
├── vaccine_records (1個關聯)
└── reminders (1個關聯)

低密度關聯 (1 關聯)
└── 其他獨立表
```

---

## 📈 資料量規模分析

### 預估資料量等級

#### 🔴 大容量表（萬級以上）

| 表名 | 預估筆數 | 增長頻率 | 備註 |
|------|----------|----------|------|
| `health_records` | 10萬+ | 每分鐘 | IoT即時監測 |
| `feeding_records` | 5萬+ | 每日 | 餵食事件記錄 |

#### 🟡 中容量表（千級）

| 表名 | 預估筆數 | 增長頻率 | 備註 |
|------|----------|----------|------|
| `pets` | 5,000+ | 用戶驅動 | 每用戶1-5隻 |
| `vaccine_records` | 10,000+ | 定期 | 每隻浪浪年均2-3次 |
| `reminders` | 8,000+ | 用戶驅動 | 多類型提醒設定 |
| `user_dog_likes` | 15,000+ | 用戶互動 | 配對功能資料 |

#### 🟢 小容量表（百級）

| 表名 | 預估筆數 | 增長頻率 | 備註 |
|------|----------|----------|------|
| `profiles` | 1,000+ | 新用戶註冊 | 用戶基數 |
| `food_data` | 200+ | 很少 | 參考資料庫 |
| `feeding_schedules` | 3,000+ | 用戶設定 | 排程配置 |

### 資料增長特性

#### 📊 增長模式分類

**指數增長型**
- `health_records`: IoT設備24小時監測
- 預估：每日新增1000+筆記錄

**線性增長型**
- `feeding_records`: 定時餵食
- 預估：每日新增100+筆記錄

**階段增長型**
- `vaccine_records`: 季節性疫苗接種
- 預估：特定時期爆發增長

**緩慢增長型**
- `pets`, `profiles`: 用戶增長驅動
- 預估：月增長率5-10%

---

## 💾 儲存空間評估

### 容量預估分析

#### 單筆記錄大小估算

| 資料表 | 平均記錄大小 | 主要佔用欄位 |
|--------|--------------|--------------|
| `health_records` | ~200 bytes | 數值型監測資料 |
| `feeding_records` | ~150 bytes | 餵食詳細資訊 |
| `pets` | ~500 bytes | photos陣列, 文字描述 |
| `vaccine_records` | ~180 bytes | 疫苗資訊, 日期 |
| `profiles` | ~120 bytes | 用戶基本資料 |

#### 部署規模容量預估

| 規模 | 用戶數 | 寵物數 | 儲存需求 | 適用場景 |
|------|--------|--------|----------|----------|
| **小型** | 100-500 | 200-1,000 | < 1GB | 個人開發, 小型寵物店 |
| **中型** | 500-5,000 | 1,000-10,000 | 1-10GB | 地區性服務, 獸醫診所 |
| **大型** | 5,000+ | 10,000+ | 10-100GB | 全國性平台, 企業級 |

#### 月增長預估

```
小型部署: +50-100MB/月
中型部署: +200MB-1GB/月  
大型部署: +1-5GB/月
```

---

## 🎯 系統複雜度評估

### 複雜度矩陣

| 維度 | 評級 | 分數 | 說明 |
|------|------|------|------|
| **實體複雜度** | 中等 | 6/10 | 8個核心實體，關聯適中 |
| **欄位複雜度** | 中高 | 7/10 | 99個欄位，多樣資料類型 |
| **關聯複雜度** | 中等 | 6/10 | 14個外鍵，2個核心樞紐 |
| **查詢複雜度** | 中等 | 6/10 | 需多表聯合查詢 |
| **維護複雜度** | 中等 | 5/10 | 標準CRUD操作為主 |

### 總體評估

**系統複雜度：中等偏高（6.0/10）**

#### 優勢
- ✅ 良好的正規化設計
- ✅ 清晰的業務邏輯分層
- ✅ 適度的功能複雜度
- ✅ 標準的資料庫最佳實踐

#### 挑戰
- ⚠️ IoT資料的高頻寫入需求
- ⚠️ 多表聯合查詢效能優化
- ⚠️ 大量歷史資料的歸檔策略
- ⚠️ 即時通知系統的可靠性

---

## 🔧 技術建議

### 效能優化建議

#### 索引策略
```sql
-- 高頻查詢索引
CREATE INDEX idx_health_records_pet_recorded 
ON health_records(pet_id, recorded_at);

CREATE INDEX idx_feeding_records_pet_fed 
ON feeding_records(pet_id, fed_at);

-- 關聯查詢索引
CREATE INDEX idx_pets_user_id 
ON pets(user_id);
```

#### 資料分割策略
- `health_records`: 按月分割
- `feeding_records`: 按季分割
- 歷史資料自動歸檔

#### 快取策略
- 用戶基本資料快取
- 寵物檔案資料快取  
- 營養資料靜態快取

### 擴展性建議

#### 水平擴展
- 讀寫分離架構
- 資料庫分片策略
- 微服務拆分考量

#### 監控指標
- 資料庫連接數
- 查詢響應時間
- 儲存空間增長率
- IoT資料延遲監控

---

## 📋 總結

### 系統特色

🎯 **功能完整性**
- 涵蓋寵物管理全生命週期
- 整合IoT設備監控
- 完善的提醒通知系統

🏗️ **架構合理性**  
- 遵循資料庫設計最佳實踐
- 適度的正規化程度
- 清晰的業務邏輯分層

⚡ **技術前瞻性**
- 支援IoT即時資料流
- 現代化的通知系統
- 可擴展的架構設計

### 適用場景

- 🏠 **個人寵物管理**：小型部署，基礎功能
- 🏥 **獸醫診所系統**：中型部署，專業功能  
- 🏢 **企業級平台**：大型部署，完整生態

---

*報告生成時間：2025年9月14日*  
*系統版本：PawsConnect v1.0*  
*分析基準：Production Ready Architecture*