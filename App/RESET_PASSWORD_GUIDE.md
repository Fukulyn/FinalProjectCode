# 重設密碼功能說明

## 功能概述
此專案現在具備完整的重設密碼功能，包含以下流程：

### 1. 申請重設密碼
- 用戶在登入頁面點擊「忘記密碼？」
- 輸入註冊的電子郵件地址
- 系統發送重設密碼連結到用戶郵箱

### 2. 重設密碼
- 用戶點擊郵件中的重設連結
- 系統導向到重設密碼頁面 (`/reset-password`)
- 用戶輸入新密碼並確認
- 系統更新密碼並導向登入頁面

## 技術實現

### 新增檔案
1. **`/src/pages/ResetPassword.tsx`**
   - 重設密碼確認頁面
   - 處理 URL 參數中的認證令牌
   - 提供新密碼輸入表單
   - 包含密碼顯示/隱藏功能
   - 完整的錯誤處理和用戶反饋

### 修改檔案
1. **`/src/store/authStore.ts`**
   - 新增 `updatePassword` 函數
   - 修改 `resetPassword` 重定向 URL 為應用程式內部路由
   - 使用 Supabase 的 `updateUser` API

2. **`/src/App.tsx`**
   - 新增 `/reset-password` 路由
   - 導入 ResetPassword 組件

3. **`/src/pages/Login.tsx`**
   - 改善重設密碼成功訊息
   - 延長訊息顯示時間為 5 秒
   - 重設完成後清空郵件欄位

## 安全特性

### 令牌驗證
- 檢查 URL 中的 `access_token` 和 `refresh_token`
- 使用 Supabase 的 `setSession` 建立安全會話
- 令牌無效時自動導向登入頁面

### 密碼驗證
- 最少 6 個字元長度要求
- 密碼確認一致性檢查
- 即時錯誤提示

### 用戶體驗
- 密碼顯示/隱藏切換
- 載入狀態指示
- 清楚的成功/錯誤訊息
- 自動導向功能

## 使用流程

### 對於用戶：
1. 在登入頁面點擊「忘記密碼？」
2. 輸入註冊的電子郵件
3. 檢查郵箱（包含垃圾郵件資料夾）
4. 點擊郵件中的重設連結
5. 輸入新密碼（至少 6 個字元）
6. 確認新密碼
7. 點擊「設定新密碼」
8. 系統成功後自動導向登入頁面

### 對於開發者：
- 重設連結有效期為 24 小時（Supabase 預設）
- 每個重設連結只能使用一次
- 系統會自動清理過期的重設請求

## 錯誤處理

### 常見錯誤情況
1. **無效的重設連結**
   - 連結已過期（超過 24 小時）
   - 連結已被使用
   - URL 參數缺失或格式錯誤

2. **密碼驗證失敗**
   - 密碼長度不足
   - 確認密碼不一致
   - 網絡連接問題

3. **系統錯誤**
   - Supabase 服務暫時不可用
   - 資料庫連接問題

### 錯誤處理機制
- 所有錯誤都有中文提示訊息
- 自動導向機制避免用戶卡在錯誤頁面
- 控制台日誌記錄詳細錯誤信息供開發調試

## 配置說明

### 重定向 URL
- **公開網址**：`https://7jjl14w0-5173.asse.devtunnels.ms/reset-password`
- **開發環境**：`http://localhost:5173/reset-password`
- **重要**：需要在 Supabase 後台將這些 URL 加入允許的重定向列表

### 郵件模板
- Supabase 使用預設的重設密碼郵件模板
- 可在 Supabase 後台自定義郵件內容和樣式

## Supabase 後台設定步驟

### 必要設定
1. 登入 Supabase 後台：`https://app.supabase.com/`
2. 選擇您的專案：`hkjclbdisriyqsvcpmnp`
3. 進入 **Authentication** > **URL Configuration**
4. 在 **Redirect URLs** 欄位中加入：
   ```
   https://7jjl14w0-5173.asse.devtunnels.ms/reset-password
   http://localhost:5173/reset-password
   ```
5. 點擊 **Save** 儲存設定

### 驗證設定
- 確保 Site URL 設定為：`https://7jjl14w0-5173.asse.devtunnels.ms`
- 檢查 Redirect URLs 包含上述兩個網址

## 測試建議

### 功能測試
1. 訪問：`https://7jjl14w0-5173.asse.devtunnels.ms/login`
2. 點擊「忘記密碼？」測試重設流程
3. 使用有效郵件地址測試
4. 檢查郵箱中的重設連結
5. 測試密碼驗證規則和錯誤訊息

### 安全測試
1. 驗證重設連結的時效性（24小時）
2. 確認連結只能使用一次
3. 測試無效/過期連結的處理

## 網址資訊
- **主要網址**：`https://7jjl14w0-5173.asse.devtunnels.ms/`
- **登入頁面**：`https://7jjl14w0-5173.asse.devtunnels.ms/login`
- **重設密碼**：`https://7jjl14w0-5173.asse.devtunnels.ms/reset-password`

這個實現提供了完整、安全且用戶友好的重設密碼功能，現在可以透過公開網址進行測試。
