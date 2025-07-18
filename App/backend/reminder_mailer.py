import requests
import json
import os
from sqlalchemy import create_engine
import pandas as pd
import datetime

# 1. 資料庫連線設定（請填入你的 Supabase/Postgres 連線資訊）
DB_USER = '你的資料庫帳號'
DB_PASS = '你的資料庫密碼'
DB_HOST = '你的資料庫主機'
DB_PORT = '5432'
DB_NAME = 'postgres'
engine = create_engine(f'postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}')

# 2. FCM 設定
FCM_SERVER_KEY = '你的_FCM_server_key'
FCM_TOKEN_FILE = 'fcm_tokens.json'

# 發送 FCM 推播
def send_push_notification(token, title, body):
    url = 'https://fcm.googleapis.com/fcm/send'
    headers = {
        'Authorization': f'key={FCM_SERVER_KEY}',
        'Content-Type': 'application/json'
    }
    data = {
        'to': token,
        'notification': {
            'title': title,
            'body': body
        }
    }
    response = requests.post(url, headers=headers, json=data)
    print('FCM response:', response.json())

def load_tokens():
    if os.path.exists(FCM_TOKEN_FILE):
        with open(FCM_TOKEN_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def main():
    today = datetime.date.today()
    soon = today + datetime.timedelta(days=7)  # 7天內到期

    # 3. 查詢即將到期的疫苗紀錄
    sql = """
    SELECT v.id, v.vaccine_name, v.next_due_date, p.name AS pet_name, u.id AS user_id
    FROM vaccine_records v
    JOIN pets p ON v.pet_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE v.next_due_date <= %s AND v.next_due_date >= %s
    """
    df = pd.read_sql(sql, engine, params=[soon, today])
    tokens = load_tokens()

    for _, row in df.iterrows():
        user_id = str(row['user_id'])
        token = tokens.get(user_id)
        if not token:
            print(f'找不到 user_id={user_id} 的 FCM token，略過')
            continue
        title = f"【疫苗提醒】{row['pet_name']} 的疫苗即將到期"
        body = f"您的寵物 {row['pet_name']} 的疫苗「{row['vaccine_name']}」預計於 {row['next_due_date']} 到期，請記得安排接種！"
        try:
            send_push_notification(token, title, body)
            print(f"已推播給 user_id={user_id} ({row['pet_name']})")
        except Exception as e:
            print(f"推播失敗：user_id={user_id}，錯誤：{e}")

if __name__ == '__main__':
    main() 