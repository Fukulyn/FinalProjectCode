# 📧 SMTP 郵件服務設定指南

## 🚀 **快速設定 (推薦 - Gmail)**

### 步驟 1: 準備 Gmail 帳戶
1. **啟用兩步驟驗證**
   - 前往 [Google 帳戶設定](https://myaccount.google.com/security)
   - 點選「兩步驟驗證」並啟用

2. **產生應用程式密碼**
   - 在「兩步驟驗證」頁面，找到「應用程式密碼」
   - 選擇「其他 (自訂名稱)」，輸入「PawsConnect」
   - **重要：複製產生的 16 位密碼，這是您的 SMTP_PASSWORD**

### 步驟 2: 建立環境設定檔
```bash
# 在 backend 資料夾中
cd backend
cp .env.example .env
```

### 步驟 3: 編輯 .env 檔案
```env
# 使用 Gmail SMTP
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=abcd-efgh-ijkl-mnop  # 您的應用程式密碼
FROM_EMAIL=your-email@gmail.com
```

### 步驟 4: 安裝相依套件
```bash
pip install python-dotenv
```

### 步驟 5: 重新啟動後端服務
```bash
python app.py
```

---

## 📋 **其他 SMTP 服務選項**

### 選項 1: SendGrid (推薦用於生產環境)
```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
```

**設定步驟：**
1. 註冊 [SendGrid 帳戶](https://sendgrid.com/)
2. 建立 API 金鑰
3. 設定寄件人驗證

### 選項 2: AWS SES
```env
SMTP_SERVER=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USERNAME=your-aws-access-key
SMTP_PASSWORD=your-aws-secret-key
FROM_EMAIL=verified@yourdomain.com
```

### 選項 3: Outlook/Hotmail
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
FROM_EMAIL=your-email@outlook.com
```

---

## 🧪 **測試 SMTP 設定**

### 測試指令
```bash
# 執行疫苗提醒測試
python vaccine_reminder_scheduler.py --single
```

### 手動測試 API
```bash
curl -X POST http://localhost:3001/api/send-vaccine-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "vaccine_name": "狂犬病疫苗",
    "pet_name": "小白",
    "due_date": "2024-09-01"
  }'
```

---

## 🔧 **常見問題解決**

### 問題 1: Gmail 驗證失敗
**解決方案：**
- 確保啟用兩步驟驗證
- 使用應用程式密碼，而非一般密碼
- 檢查帳戶是否啟用「低安全性應用程式存取」

### 問題 2: 郵件被標記為垃圾郵件
**解決方案：**
- 設定 SPF/DKIM 記錄
- 使用專業的 SMTP 服務 (SendGrid/AWS SES)
- 避免使用個人 Gmail 發送大量郵件

### 問題 3: 連線逾時
**解決方案：**
- 檢查防火��設定
- 確認 SMTP 伺服器和連接埠正確
- 嘗試使用不同的網路環境

---

## 📊 **SMTP 服務比較**

| 服務商 | 免費額度 | 適用情境 | 設定難度 | 可靠性 |
|--------|----------|----------|----------|--------|
| Gmail | 無限制* | 開發測試 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| SendGrid | 100封/日 | 生產環境 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| AWS SES | 200封/日 | 企業級 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Outlook | 無限制* | 個人專案 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

*有每日傳送限制

---

## 🎯 **建議設定流程**

1. **開發階段**：使用 Gmail SMTP (5 分鐘設定)
2. **測試階段**：切換到 SendGrid (免費方案)
3. **生產階段**：使用 AWS SES 或付費 SendGrid

---

## ✅ **設定檢查清單**

- [ ] 建立 `.env` 檔案
- [ ] 填入正確的 SMTP 設定
- [ ] 安裝 `python-dotenv` 套件
- [ ] 重新啟動後端服務
- [ ] 執行測試命令確認功能正常
- [ ] 檢查郵件是否成功送達

**完成後，您的疫苗提醒功能將擁有完整的郵件通知能力！** 📧✨
