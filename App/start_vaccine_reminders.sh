#!/bin/bash
# 疫苗提醒功能快速啟動腳本

echo "=== 🐾 PawsConnect 疫苗提醒功能啟動 ==="
echo ""

# 1. 檢查並啟動後端服務
echo "📡 1. 檢查後端服務..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ 後端服務已在運行 (Port 3001)"
else
    echo "🟡 啟動後端服務..."
    cd backend
    python app.py &
    echo "✅ 後端服務已啟動"
    cd ..
fi

# 2. 測試推播通知功能
echo ""
echo "📱 2. 測試推播通知..."
echo "請在瀏覽器中打開 https://7jjl14w0-5173.asse.devtunnels.ms/"
echo "並點擊 Dashboard 中的 '🔔 通知' 按鈕來註冊推播通知"

# 3. 執行一次疫苗檢查
echo ""
echo "💉 3. 執行疫苗提醒檢查..."
cd backend
python vaccine_reminder_scheduler.py --single
cd ..

# 4. 啟動持續監控 (可選)
echo ""
echo "⏰ 4. 是否啟動持續監控? (y/N)"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🚀 啟動疫苗提醒排程器 (每24小時檢查一次)..."
    cd backend
    nohup python vaccine_reminder_scheduler.py > vaccine_scheduler.log 2>&1 &
    echo $! > vaccine_scheduler.pid
    echo "✅ 排程器已在背景運行 (PID: $(cat vaccine_scheduler.pid))"
    echo "📄 日誌檔案: backend/vaccine_scheduler.log"
    cd ..
else
    echo "⏸️ 跳過持續監控啟動"
fi

echo ""
echo "=== 🎉 疫苗提醒功能啟動完成! ==="
echo ""
echo "📋 功能檢查清單:"
echo "✅ 資料庫架構 (vaccine_records, vaccine_reminder_settings)"
echo "✅ 前端疫苗提醒設定頁面"
echo "✅ 推播通知基礎架構"
echo "✅ Dashboard 疫苗警示"
echo "✅ 自動化排程器"
echo ""
echo "🔗 重要連結:"
echo "📱 主應用程式: https://7jjl14w0-5173.asse.devtunnels.ms/"
echo "⚙️ 疫苗提醒設定: https://7jjl14w0-5173.asse.devtunnels.ms/vaccine-reminder-settings"
echo "📊 後端 API: https://7jjl14w0-3001.asse.devtunnels.ms/"
echo ""
echo "📝 使用說明:"
echo "1. 在 Dashboard 點擊 '疫苗提醒設定' 配置個人偏好"
echo "2. 在 '疫苗紀錄' 頁面新增疫苗記錄"
echo "3. 系統會自動在設定的天數前發送提醒"
echo ""
echo "⚠️ 注意事項:"
echo "- 郵件提醒需要設定 SMTP 服務器"
echo "- 推播通知需要用戶授權"
echo "- 排程器在背景持續運行"
