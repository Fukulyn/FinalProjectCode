from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import os
import requests
from pywebpush import webpush, WebPushException
import json
import socket
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

app = Flask(__name__)
CORS(app)  # 啟用 CORS 支援

# SMTP 設定
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')  # 您的 Gmail 地址
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')  # 應用程式密碼
FROM_EMAIL = os.getenv('FROM_EMAIL', SMTP_USERNAME)

# 使用 Supabase URI 連線格式
DATABASE_URL = os.getenv('DATABASE_URL')
conn = None
SUPABASE_AVAILABLE = False

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("資料庫連線成功")
    SUPABASE_AVAILABLE = True
except Exception as e:
    print("資料庫連線失敗：", e)
    print("⚠️  將在離線模式運行 - 部分功能將無法使用")
    SUPABASE_AVAILABLE = False

# VAPID 設定
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIMS = {"sub": os.getenv("VAPID_CLAIMS_SUB")}

@app.route('/api/save-subscription', methods=['POST', 'OPTIONS'])
def save_subscription():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
    data = request.get_json()
    user_id = data.get('userId')
    subscription = data.get('subscription')
    if not user_id or not subscription:
        return jsonify({'error': '缺少 userId 或 subscription'}), 400
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO user_fcm_tokens (user_id, fcm_token)
                    VALUES (%s, %s)
                    ON CONFLICT (user_id, fcm_token)
                    DO UPDATE SET updated_at = now()
                """, (user_id, json.dumps(subscription)))
        return jsonify({'success': True})
    except Exception as e:
        print(f"資料庫錯誤: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/send-webpush', methods=['POST'])
def send_webpush():
    data = request.get_json()
    user_id = data.get('userId')
    title = data.get('title')
    body = data.get('body')
    if not user_id or not title or not body:
        return jsonify({'error': '缺少參數'}), 400
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT fcm_token FROM user_fcm_tokens WHERE user_id = %s", (user_id,))
                tokens = [row[0] for row in cur.fetchall()]
        if not tokens:
            return jsonify({'error': '找不到訂閱'}), 404
        results = []
        for token in tokens:
            try:
                subscription = json.loads(token)
                webpush(
                    subscription_info=subscription,
                    data=json.dumps({"title": title, "body": body}),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims=VAPID_CLAIMS
                )
                results.append({'success': True})
            except WebPushException as ex:
                results.append({'error': str(ex)})
            except Exception as e:
                results.append({'error': str(e)})
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        print(f"發送推播錯誤: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/send-vaccine-reminder', methods=['POST'])
def send_vaccine_reminder():
    data = request.get_json()
    email = data.get('email')
    vaccine_name = data.get('vaccine_name')
    
    if not email or not vaccine_name:
        return jsonify({'error': '缺少郵件地址或疫苗名稱'}), 400
    
    # 防止重複發送 - 使用簡單的內存快取（實際應用中可使用 Redis）
    import time
    cache_key = f"{email}_{vaccine_name}"
    current_time = time.time()
    
    # 檢查是否在過去 60 秒內已發送過相同的郵件
    if hasattr(send_vaccine_reminder, 'email_cache'):
        if cache_key in send_vaccine_reminder.email_cache:
            last_sent = send_vaccine_reminder.email_cache[cache_key]
            if current_time - last_sent < 60:  # 60秒內不重複發送
                print(f"🚫 防止重複發送: {email} - {vaccine_name} (距上次發送 {current_time - last_sent:.1f} 秒)")
                return jsonify({
                    'success': True, 
                    'message': '郵件已在近期發送過，避免重複發送'
                })
    else:
        send_vaccine_reminder.email_cache = {}
    
    # 記錄發送時間
    send_vaccine_reminder.email_cache[cache_key] = current_time
    
    # 臨時關閉郵件發送功能，避免 SMTP 錯誤影響主要功能
    # TODO: 修正 Gmail SMTP 設定後重新啟用
    SKIP_EMAIL = os.getenv('SKIP_EMAIL', 'true').lower() == 'true'
    
    if SKIP_EMAIL:
        print(f"📧 跳過郵件發送（SMTP 設定待修正）: {email} - {vaccine_name}")
        return jsonify({
            'success': True, 
            'message': f'疫苗提醒已記錄（郵件功能暫時關閉）'
        })
    
    try:
        # 發送疫苗提醒郵件
        pet_name = data.get('pet_name', '您的寵物')
        due_date = data.get('due_date', '')
        
        success = send_email(
            to_email=email,
            subject=f"🐾 疫苗提醒：{pet_name} 的疫苗即將到期",
            vaccine_name=vaccine_name,
            pet_name=pet_name,
            due_date=due_date
        )
        
        if success:
            return jsonify({
                'success': True, 
                'message': f'疫苗提醒郵件已發送至 {email}'
            })
        else:
            return jsonify({'error': '郵件發送失敗'}), 500
            
    except Exception as e:
        print(f"郵件發送錯誤: {e}")
        return jsonify({'error': str(e)}), 500

def send_email(to_email, subject, vaccine_name, pet_name, due_date):
    """發送疫苗提醒郵件"""
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print("SMTP 設定不完整，跳過郵件發送")
        return False
    
    print(f"🔄 嘗試發送郵件至 {to_email}")
    print(f"📧 SMTP 設定: {SMTP_SERVER}:{SMTP_PORT}, 用戶: {SMTP_USERNAME}")
        
    try:
        # 建立郵件內容
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email

        # 純文字版本
        text_content = f"""
親愛的寵物主人，

您好！這是來自 PawsConnect 的疫苗提醒通知。

🐾 寵物名稱：{pet_name}
💉 疫苗名稱：{vaccine_name}
📅 到期日期：{due_date}

請記得安排疫苗接種，以確保您的寵物健康！

如有任何問題，請聯繫您的獸醫。

此致
PawsConnect 團隊
        """

        # HTML 版本
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .highlight {{ background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; }}
                .button {{ display: inline-block; background: #4CAF50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🐾 PawsConnect 疫苗提醒</h1>
                </div>
                <div class="content">
                    <h2>親愛的寵物主人，您好！</h2>
                    <p>這是來自 PawsConnect 的疫苗提醒通知。</p>
                    
                    <div class="highlight">
                        <h3>📋 疫苗資訊</h3>
                        <p><strong>🐾 寵物名稱：</strong>{pet_name}</p>
                        <p><strong>💉 疫苗名稱：</strong>{vaccine_name}</p>
                        <p><strong>📅 到期日期：</strong>{due_date}</p>
                    </div>
                    
                    <p>請記得安排疫苗接種，以確保您的寵物健康！</p>
                    
                    <p>如有任何問題，請聯繫您的獸醫。</p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                    <p style="font-size: 12px; color: #666;">
                        此郵件由 PawsConnect 自動發送<br>
                        如需取消訂閱，請登入您的帳戶進行設定
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        # 附加文字和 HTML 版本
        text_part = MIMEText(text_content, 'plain', 'utf-8')
        html_part = MIMEText(html_content, 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)

        # 發送郵件
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        print(f"✅ 疫苗提醒郵件已發送至 {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ 郵件發送失敗: {e}")
        return False

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康檢查端點"""
    return jsonify({
        'status': 'healthy' if SUPABASE_AVAILABLE else 'limited',
        'timestamp': str(datetime.now()),
        'version': '1.0.0',
        'services': {
            'database': 'connected' if SUPABASE_AVAILABLE else 'offline',
            'email': 'disabled' if os.getenv('SKIP_EMAIL', 'false').lower() == 'true' else 'enabled',
            'network': 'connected' if SUPABASE_AVAILABLE else 'limited'
        },
        'mode': 'online' if SUPABASE_AVAILABLE else 'offline',
        'message': 'All services operational' if SUPABASE_AVAILABLE else 'Running in offline mode - limited functionality'
    })

if __name__ == '__main__':
    app.run(port=3001, debug=True) 