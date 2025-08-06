# 餵食器狀態查詢功能說明

## 功能概述

狀態查詢功能允許前端應用程式查詢餵食器的即時狀態，包括：
- 系統運行狀態（active/idle）
- 當前重量
- 飼料高度
- 廚餘高度
- 電量
- 食物類型
- 卡路里
- 定時餵食設定狀態

## 系統架構

### 1. 後端組件

#### `mqtt_status_client.py`
- 專門處理狀態查詢回應的 MQTT 客戶端
- 訂閱 `pet/manager/topic/status` 主題
- 將接收到的狀態信息存儲在記憶體中

#### `app.py` 新增 API 端點
- `/api/check_status` (GET): 發送狀態查詢指令到餵食器
- `/api/get_status` (GET): 獲取最新的狀態信息

### 2. 樹莓派組件

#### `feeder_controller.py`
- 處理 `payload == "status"` 的 MQTT 指令
- 調用 `feeder_service.check_status()` 獲取狀態
- 添加系統狀態和定時餵食信息
- 發布狀態回應到 `pet/manager/topic/status`

#### `feeder_service.py`
- `check_status()`: 獲取感測器數據並返回狀態信息
- `get_scheduled_feeding()`: 返回當前定時餵食設定

### 3. 前端組件

#### `FeedingRecord.tsx`
- 新增「餵食器狀態查詢」區塊
- 「查詢狀態」按鈕：發送查詢指令
- 「獲取狀態」按鈕：顯示最新狀態信息

## 使用方法

### 1. 啟動系統

```bash
# 在 App/backend 目錄下執行
python run_all.py
```

這會啟動：
- 主 MQTT 客戶端
- 餵食記錄 MQTT 客戶端
- 狀態查詢 MQTT 客戶端

### 2. 前端操作

1. 打開前端應用程式
2. 進入「餵食記錄」頁面
3. 點擊「查詢狀態」按鈕發送查詢指令
4. 等待 2-3 秒後點擊「獲取狀態」按鈕查看結果

### 3. API 測試

可以使用提供的測試腳本：

```bash
python test_status.py
```

## 數據流程

1. **前端發送查詢請求** → `app.py` `/api/check_status`
2. **主後端發送 MQTT 指令** → `feeder/command` 主題
3. **樹莓派接收指令** → `feeder_controller.py` 處理 `status` 指令
4. **樹莓派獲取狀態** → `feeder_service.check_status()`
5. **樹莓派發布回應** → `pet/manager/topic/status` 主題
6. **狀態客戶端接收** → `mqtt_status_client.py` 存儲狀態
7. **前端獲取狀態** → `app.py` `/api/get_status`
8. **前端顯示結果** → 用戶界面顯示狀態信息

## 狀態信息格式

```json
{
  "timestamp": "2024-01-01T12:00:00",
  "pet_id": "43c23d4a-4235-4395-8384-73dbdd7a7ad8",
  "angle": 25.5,
  "height_waste": 15.2,
  "height_feed": 45.8,
  "power": 3.7,
  "food_type": "default_food",
  "calories": 51.0,
  "system_status": "active",
  "scheduled_feeding": {
    "datetime": "2024-01-01 18:00",
    "grams": 30
  }
}
```

## 注意事項

1. **MQTT 連線**: 確保所有 MQTT 客戶端都能正常連接到 broker
2. **時序**: 查詢狀態後需要等待 2-3 秒再獲取結果
3. **記憶體存儲**: 狀態信息僅存儲在記憶體中，重啟後會丟失
4. **錯誤處理**: 如果餵食器離線，會顯示相應的錯誤信息

## 故障排除

### 常見問題

1. **無法獲取狀態**
   - 檢查 MQTT 連線是否正常
   - 確認餵食器是否在線
   - 檢查 `mqtt_status_client.py` 是否正在運行

2. **狀態信息過舊**
   - 重新點擊「查詢狀態」按鈕
   - 檢查餵食器是否正常回應

3. **前端顯示錯誤**
   - 檢查瀏覽器控制台錯誤信息
   - 確認後端 API 服務是否正常運行 