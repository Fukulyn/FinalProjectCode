from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import os
import requests
from pywebpush import webpush, WebPushException
import json
import socket

app = Flask(__name__)
CORS(app)  # 啟用 CORS 支援

# 測試能否連上 Supabase 5432 port
host = "db.hkjclbdisriyqsvcpmnp.supabase.co"
port = 5432
try:
    s = socket.create_connection((host, port), timeout=10)
    print("可以連到 Supabase 5432 port")
    s.close()
except Exception as e:
    print("無法連到 Supabase 5432 port：", e)

# 使用 Supabase URI 連線格式
DATABASE_URL = "postgresql://postgres:LaRLgZWac1t3NHFh@db.hkjclbdisriyqsvcpmnp.supabase.co:5432/postgres?sslmode=require"
try:
    conn = psycopg2.connect(DATABASE_URL)
    print("資料庫連線成功")
except Exception as e:
    print("資料庫連線失敗：", e)
    raise

# VAPID 設定
VAPID_PUBLIC_KEY = "BPkjF5Q8CJx9B4i5rC_0INNb1w66HWZSw4TEd-laFk_OrmWvOirz24LuhJYUx1DoXRHhGY6NFSCDGEHfwLdZnGY"
VAPID_PRIVATE_KEY = "GXJHwmJpMzUbqh5LDvfO0vruc63Y4sTVHkgPcyWT0lE"
VAPID_CLAIMS = {"sub": "mailto:your@email.com"}

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

if __name__ == '__main__':
    app.run(port=3001, debug=True) 