# PawsConnect SMTP 設定腳本
# 執行方式: ./setup_smtp.ps1

Write-Host "=== 🐾 PawsConnect SMTP 郵件服務設定 ===" -ForegroundColor Green
Write-Host ""

# 檢查是否在正確的目錄
if (-not (Test-Path "backend")) {
    Write-Host "❌ 請在專案根目錄執行此腳本" -ForegroundColor Red
    Write-Host "目前位置: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "應該要有 backend 資料夾"
    exit 1
}

# 進入 backend 目錄
Set-Location backend

Write-Host "📧 選擇 SMTP 服務提供商:" -ForegroundColor Cyan
Write-Host "1. Gmail (推薦用於開發測試)" -ForegroundColor White
Write-Host "2. SendGrid (推薦用於生產環境)" -ForegroundColor White  
Write-Host "3. Outlook/Hotmail" -ForegroundColor White
Write-Host "4. 手動輸入設定" -ForegroundColor White
Write-Host ""

$choice = Read-Host "請選擇 (1-4)"

switch ($choice) {
    "1" {
        Write-Host "📩 設定 Gmail SMTP..." -ForegroundColor Yellow
        $email = Read-Host "請輸入您的 Gmail 地址"
        Write-Host ""
        Write-Host "⚠️  重要提醒:" -ForegroundColor Red
        Write-Host "1. 請先到 Google 帳戶設定啟用【兩步驟驗證】"
        Write-Host "2. 然後產生【應用程式密碼】(16位字符)"
        Write-Host "3. 網址: https://myaccount.google.com/security"
        Write-Host ""
        $password = Read-Host "請輸入應用程式密碼 (格式: abcd-efgh-ijkl-mnop)" -AsSecureString
        $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
        
        $envContent = @"
# Gmail SMTP 設定
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=$email
SMTP_PASSWORD=$passwordPlain
FROM_EMAIL=$email

# 資料庫設定
DATABASE_URL=postgresql://postgres:LaRLgZWac1t3NHFh@db.hkjclbdisriyqsvcpmnp.supabase.co:5432/postgres?sslmode=require

# 推播通知設定
VAPID_PUBLIC_KEY=BPkjF5Q8CJx9B4i5rC_0INNb1w66HWZSw4TEd-laFk_OrmWvOirz24LuhJYUx1DoXRHhGY6NFSCDGEHfwLdZnGY
VAPID_PRIVATE_KEY=GXJHwmJpMzUbqh5LDvfO0vruc63Y4sTVHkgPcyWT0lE
"@
    }
    "2" {
        Write-Host "📨 設定 SendGrid SMTP..." -ForegroundColor Yellow
        $apiKey = Read-Host "請輸入 SendGrid API 金鑰" -AsSecureString
        $apiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($apiKey))
        $fromEmail = Read-Host "請輸入寄件人信箱 (例: noreply@yourdomain.com)"
        
        $envContent = @"
# SendGrid SMTP 設定
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USERNAME=apikey
SMTP_PASSWORD=$apiKeyPlain
FROM_EMAIL=$fromEmail

# 資料庫設定
DATABASE_URL=postgresql://postgres:LaRLgZWac1t3NHFh@db.hkjclbdisriyqsvcpmnp.supabase.co:5432/postgres?sslmode=require

# 推播通知設定
VAPID_PUBLIC_KEY=BPkjF5Q8CJx9B4i5rC_0INNb1w66HWZSw4TEd-laFk_OrmWvOirz24LuhJYUx1DoXRHhGY6NFSCDGEHfwLdZnGY
VAPID_PRIVATE_KEY=GXJHwmJpMzUbqh5LDvfO0vruc63Y4sTVHkgPcyWT0lE
"@
    }
    "3" {
        Write-Host "📫 設定 Outlook SMTP..." -ForegroundColor Yellow
        $email = Read-Host "請輸入您的 Outlook/Hotmail 地址"
        $password = Read-Host "請輸入密碼" -AsSecureString
        $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
        
        $envContent = @"
# Outlook SMTP 設定
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=$email
SMTP_PASSWORD=$passwordPlain
FROM_EMAIL=$email

# 資料庫設定
DATABASE_URL=postgresql://postgres:LaRLgZWac1t3NHFh@db.hkjclbdisriyqsvcpmnp.supabase.co:5432/postgres?sslmode=require

# 推播通知設定
VAPID_PUBLIC_KEY=BPkjF5Q8CJx9B4i5rC_0INNb1w66HWZSw4TEd-laFk_OrmWvOirz24LuhJYUx1DoXRHhGY6NFSCDGEHfwLdZnGY
VAPID_PRIVATE_KEY=GXJHwmJpMzUbqh5LDvfO0vruc63Y4sTVHkgPcyWT0lE
"@
    }
    default {
        Write-Host "❌ 無效的選擇" -ForegroundColor Red
        exit 1
    }
}

# 寫入 .env 檔案
$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host "✅ .env 檔案已建立" -ForegroundColor Green

# 安裝相依套件
Write-Host ""
Write-Host "📦 安裝 Python 相依套件..." -ForegroundColor Cyan
try {
    python -m pip install python-dotenv
    Write-Host "✅ python-dotenv 安裝完成" -ForegroundColor Green
}
catch {
    Write-Host "❌ 套件安裝失敗，請手動執行: pip install python-dotenv" -ForegroundColor Red
}

# 測試 SMTP 設定
Write-Host ""
Write-Host "🧪 是否要測試 SMTP 設定? (y/N): " -NoNewline -ForegroundColor Yellow
$test = Read-Host
if ($test -eq "y" -or $test -eq "Y") {
    Write-Host "執行疫苗提醒測試..." -ForegroundColor Cyan
    python vaccine_reminder_scheduler.py --single
}

Write-Host ""
Write-Host "=== 🎉 SMTP 設定完成! ===" -ForegroundColor Green
Write-Host ""
Write-Host "📋 接下來的步驟:" -ForegroundColor Cyan
Write-Host "1. 重新啟動後端服務: python app.py" -ForegroundColor White
Write-Host "2. 在應用程式中新增疫苗記錄" -ForegroundColor White
Write-Host "3. 設定疫苗提醒偏好" -ForegroundColor White
Write-Host "4. 系統將自動發送提醒郵件" -ForegroundColor White
Write-Host ""
Write-Host "🔗 應用程式網址: https://7jjl14w0-5173.asse.devtunnels.ms/" -ForegroundColor Blue

# 返回原目錄
Set-Location ..
