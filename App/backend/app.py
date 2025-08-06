from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import os
import requests
from pywebpush import webpush, WebPushException
import json
import socket
import paho.mqtt.client as mqtt
import threading
from mqtt_status_client import get_latest_status

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

# MQTT 配置
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_USERNAME = "petmanager"
MQTT_PASSWORD = "petmanager"

# 全域 MQTT 客戶端
mqtt_client = None

def init_mqtt():
    global mqtt_client
    client = mqtt.Client()
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
    mqtt_client = client
    return client

def send_mqtt_command(command):
    if mqtt_client:
        mqtt_client.publish("feeder/command", command)
        print(f"已發送 MQTT 指令: {command}")
        return True
    return False

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

@app.route('/api/schedule_feed', methods=['POST'])
def schedule_feed():
    data = request.get_json()
    date_str = data.get('date')  # "YYYY-MM-DD" 格式
    time_str = data.get('time')  # "HH:MM" 格式
    grams = data.get('grams')
    
    if not date_str or not time_str or not grams:
        return jsonify({'error': '缺少 date、time 或 grams 參數'}), 400
    
    try:
        grams = float(grams)
        # 組合日期和時間
        datetime_str = f"{date_str} {time_str}"
        command = f"schedule_feed {datetime_str} {grams}"
        success = send_mqtt_command(command)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'已設定 {date_str} {time_str} 餵食 {grams}g'
            })
        else:
            return jsonify({'error': 'MQTT 連線失敗'}), 500
            
    except ValueError:
        return jsonify({'error': 'grams 必須是數字'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/cancel_schedule', methods=['POST'])
def cancel_schedule():
    try:
        success = send_mqtt_command("cancel_schedule")
        
        if success:
            return jsonify({
                'success': True,
                'message': '已取消定時餵食'
            })
        else:
            return jsonify({'error': 'MQTT 連線失敗'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/check_status', methods=['GET'])
def check_status():
    try:
        success = send_mqtt_command("status")
        
        if success:
            return jsonify({
                'success': True,
                'message': '已發送狀態查詢指令'
            })
        else:
            return jsonify({'error': 'MQTT 連線失敗'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_status', methods=['GET'])
def get_status():
    try:
        status_data = get_latest_status()
        if status_data["status"]:
            return jsonify({
                'success': True,
                'data': status_data
            })
        else:
            return jsonify({
                'success': False,
                'message': '尚未收到狀態信息，請先查詢狀態'
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # 初始化 MQTT 連線
    try:
        init_mqtt()
        print("MQTT 連線已初始化")
    except Exception as e:
        print(f"MQTT 連線失敗: {e}")
    
    app.run(port=3001, debug=True) 