# Gmail SMTP 設定指南

## 問題說明
出現錯誤：`535 5.7.8 Username and Password not accepted` 表示 Gmail 的 SMTP 認證失敗。

## 解決方案

### 選項 1：更新 Gmail 應用程式密碼（推薦）

1. **開啟 Google 帳戶安全設定**
   - 前往：https://myaccount.google.com/security
   - 確保已啟用「2步驟驗證」

2. **建立新的應用程式密碼**
   - 在安全設定中找到「應用程式密碼」
   - 選擇「郵件」和「其他（自訂名稱）」
   - 輸入「PawsConnect」作為應用程式名稱
   - 複製生成的 16 位元密碼（格式：xxxx xxxx xxxx xxxx）

3. **更新 .env 檔案**
   ```
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # 新的應用程式密碼
   ```

### 選項 2：使用 OAuth2（進階）

如果應用程式密碼仍有問題，可以使用 OAuth2 認證：

```python
# 需要安裝額外套件
pip install google-auth google-auth-oauthlib google-auth-httplib2
```

### 選項 3：使用其他 SMTP 服務

#### Outlook/Hotmail
```
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your_email@outlook.com
SMTP_PASSWORD=your_password
```

#### SendGrid（免費額度：100封/天）
```
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your_sendgrid_api_key
```

#### AWS SES
```
SMTP_SERVER=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your_access_key_id
SMTP_PASSWORD=your_secret_access_key
```

## 測試步驟

1. 更新 .env 檔案後重啟後端服務
2. 在前端嘗試發送疫苗提醒
3. 檢查後端控制台是否顯示成功訊息

## 疑難排解

### 常見錯誤碼
- `535 5.7.8`: 用戶名或密碼錯誤
- `534 5.7.9`: 應用程式密碼必須使用
- `535 5.7.1`: 帳戶被鎖定或停用

### 檢查清單
- [ ] Gmail 帳戶已啟用 2步驟驗證
- [ ] 使用正確格式的應用程式密碼
- [ ] .env 檔案中沒有額外空格
- [ ] 後端服務已重啟

## 立即修正

如果您想立即修正，請執行以下步驟：

1. 前往 Google 帳戶設定：https://myaccount.google.com/apppasswords
2. 生成新的應用程式密碼
3. 將新密碼更新到 `.env` 檔案
4. 重啟後端服務

## 備用方案

如果 Gmail 持續有問題，我建議切換到 SendGrid（免費）：

1. 註冊 SendGrid 帳戶：https://sendgrid.com/
2. 獲取 API 密鑰
3. 更新 .env 設定為 SendGrid
4. 每天可免費發送 100 封郵件
