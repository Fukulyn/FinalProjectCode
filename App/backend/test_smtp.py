#!/usr/bin/env python3
"""
SMTP 郵件功能測試腳本
快速測試您的 SMTP 設定是否正常運作
"""

import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

def test_smtp_connection():
    """測試 SMTP 連線"""
    print("🧪 測試 SMTP 連線設定...")
    print("=" * 50)
    
    # 檢查環境變數
    smtp_server = os.getenv('SMTP_SERVER')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME')
    smtp_password = os.getenv('SMTP_PASSWORD')
    from_email = os.getenv('FROM_EMAIL')
    
    print(f"SMTP 伺服器: {smtp_server}:{smtp_port}")
    print(f"使用者名稱: {smtp_username}")
    print(f"寄件人: {from_email}")
    
    if not all([smtp_server, smtp_username, smtp_password, from_email]):
        print("❌ 缺少必要的 SMTP 設定")
        print("請確認 .env 檔案包含以下設定:")
        print("- SMTP_SERVER")
        print("- SMTP_PORT")
        print("- SMTP_USERNAME")
        print("- SMTP_PASSWORD")
        print("- FROM_EMAIL")
        return False
    
    try:
        # 測試連線
        print("🔗 嘗試連接到 SMTP 伺服器...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.quit()
        
        print("✅ SMTP 連線測試成功!")
        return True
        
    except Exception as e:
        print(f"❌ SMTP 連線失敗: {e}")
        print("\n🔧 常見問題解決:")
        if "gmail" in smtp_server.lower():
            print("- Gmail 需要應用程式密碼，不是一般密碼")
            print("- 確認已啟用兩步驟驗證")
            print("- 網址: https://myaccount.google.com/security")
        elif "outlook" in smtp_server.lower():
            print("- 確認帳號密碼正確")
            print("- 檢查是否啟用低安全性應用程式存取")
        else:
            print("- 檢查 SMTP 伺服器位址和連接埠")
            print("- 確認使用者名稱和密碼正確")
        return False

def send_test_email():
    """發送測試郵件"""
    if not test_smtp_connection():
        return False
    
    print("\n📧 發送測試郵件...")
    
    # 詢問收件人
    recipient = input("請輸入測試郵件收件人信箱: ").strip()
    if not recipient:
        print("❌ 請輸入有效的收件人信箱")
        return False
    
    try:
        # 載入設定
        smtp_server = os.getenv('SMTP_SERVER')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_username = os.getenv('SMTP_USERNAME')
        smtp_password = os.getenv('SMTP_PASSWORD')
        from_email = os.getenv('FROM_EMAIL')
        
        # 建立郵件
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "🐾 PawsConnect SMTP 測試郵件"
        msg['From'] = from_email
        msg['To'] = recipient
        
        # 郵件內容
        text_content = """
PawsConnect SMTP 測試郵件

恭喜！您的 SMTP 設定已經正常運作。

這是一封測試郵件，確認疫苗提醒功能的郵件發送機制正常。

測試時間: {time}
發送者: {sender}

---
PawsConnect 寵物健康管理系統
        """.format(
            time=__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            sender=from_email
        )
        
        html_content = f"""
        <html>
        <head></head>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                    <h1>🐾 PawsConnect</h1>
                    <h2>SMTP 測試郵件</h2>
                </div>
                <div style="padding: 20px; background: #f9f9f9;">
                    <h3>🎉 恭喜！</h3>
                    <p>您的 SMTP 設定已經正常運作。</p>
                    <p>這是一封測試郵件，確認疫苗提醒功能的郵件發送機制正常。</p>
                    
                    <div style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
                        <p><strong>測試資訊</strong></p>
                        <p>測試時間: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                        <p>發送者: {from_email}</p>
                    </div>
                    
                    <p>現在您可以開始使用疫苗提醒功能了！</p>
                </div>
                <div style="padding: 10px; text-align: center; font-size: 12px; color: #666;">
                    PawsConnect 寵物健康管理系統
                </div>
            </div>
        </body>
        </html>
        """
        
        text_part = MIMEText(text_content, 'plain', 'utf-8')
        html_part = MIMEText(html_content, 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # 發送郵件
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ 測試郵件已成功發送至 {recipient}")
        print("📬 請檢查您的收件匣 (也請檢查垃圾郵件資料夾)")
        return True
        
    except Exception as e:
        print(f"❌ 測試郵件發送失敗: {e}")
        return False

def main():
    """主程式"""
    print("🐾 PawsConnect SMTP 測試工具")
    print("=" * 50)
    
    # 檢查 .env 檔案
    if not os.path.exists('.env'):
        print("❌ 找不到 .env 檔案")
        print("請先執行 setup_smtp.ps1 或手動建立 .env 檔案")
        return
    
    print("✅ 找到 .env 檔案")
    
    while True:
        print("\n選擇測試項目:")
        print("1. 測試 SMTP 連線")
        print("2. 發送測試郵件")
        print("3. 退出")
        
        choice = input("\n請選擇 (1-3): ").strip()
        
        if choice == '1':
            test_smtp_connection()
        elif choice == '2':
            send_test_email()
        elif choice == '3':
            print("👋 測試結束")
            break
        else:
            print("❌ 無效的選擇")

if __name__ == "__main__":
    main()
