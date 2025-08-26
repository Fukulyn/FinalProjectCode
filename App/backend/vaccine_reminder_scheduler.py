#!/usr/bin/env python3
"""
疫苗提醒自動化排程器
這個腳本會定期檢查即將到期的疫苗，並發送推播通知和郵件提醒
"""

import os
import json
import requests
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import time
import threading

# 資料庫連線設定
DATABASE_URL = "postgresql://postgres.hkjclbdisriyqsvcpmnp:LaRLgZWac1t3NHFh@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# API 端點設定
WEBPUSH_API_URL = "https://7jjl14w0-3001.asse.devtunnels.ms/api/send-webpush"
EMAIL_API_URL = "https://7jjl14w0-3001.asse.devtunnels.ms/api/send-vaccine-reminder"

def get_database_connection():
    """建立資料庫連線"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"資料庫連線失敗: {e}")
        return None

def check_upcoming_vaccines():
    """檢查即將到期的疫苗"""
    conn = get_database_connection()
    if not conn:
        return []
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 查詢7天內到期的疫苗
            today = datetime.now().date()
            upcoming_date = today + timedelta(days=7)
            
            query = """
            SELECT 
                vr.id,
                vr.vaccine_name,
                vr.next_due_date,
                p.name as pet_name,
                p.user_id,
                au.email
            FROM vaccine_records vr
            JOIN pets p ON vr.pet_id = p.id  
            JOIN auth.users au ON p.user_id = au.id
            WHERE vr.next_due_date BETWEEN %s AND %s
            AND vr.next_due_date IS NOT NULL
            ORDER BY vr.next_due_date ASC
            """
            
            cur.execute(query, (today, upcoming_date))
            results = cur.fetchall()
            return results
            
    except Exception as e:
        print(f"查詢疫苗記錄時發生錯誤: {e}")
        return []
    finally:
        conn.close()

def send_webpush_notification(user_id, title, body):
    """發送推播通知"""
    try:
        payload = {
            'userId': str(user_id),
            'title': title,
            'body': body
        }
        
        response = requests.post(
            WEBPUSH_API_URL,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"推播通知發送成功 - User ID: {user_id}")
            return True
        else:
            print(f"推播通知發送失敗 - User ID: {user_id}, Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"發送推播通知時發生錯誤: {e}")
        return False

def send_email_reminder(email, vaccine_name, pet_name, due_date):
    """發送郵件提醒"""
    try:
        payload = {
            'email': email,
            'vaccine_name': vaccine_name,
            'pet_name': pet_name,
            'due_date': str(due_date)
        }
        
        response = requests.post(
            EMAIL_API_URL,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"郵件提醒發送成功 - Email: {email}")
            return True
        else:
            print(f"郵件提醒發送失敗 - Email: {email}, Status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"發送郵件提醒時發生錯誤: {e}")
        return False

def calculate_days_until_due(due_date):
    """計算距離到期的天數"""
    today = datetime.now().date()
    if isinstance(due_date, str):
        due_date = datetime.strptime(due_date, '%Y-%m-%d').date()
    
    delta = due_date - today
    return delta.days

def process_vaccine_reminders():
    """處理疫苗提醒的主要邏輯"""
    print(f"\n=== 疫苗提醒檢查開始 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===")
    
    upcoming_vaccines = check_upcoming_vaccines()
    
    if not upcoming_vaccines:
        print("沒有找到即將到期的疫苗記錄")
        return
    
    print(f"找到 {len(upcoming_vaccines)} 個即將到期的疫苗記錄")
    
    for vaccine in upcoming_vaccines:
        try:
            user_id = vaccine['user_id']
            pet_name = vaccine['pet_name']
            vaccine_name = vaccine['vaccine_name']
            due_date = vaccine['next_due_date']
            email = vaccine['email']
            
            days_until_due = calculate_days_until_due(due_date)
            
            # 構建通知內容
            if days_until_due <= 0:
                title = f"🚨 疫苗已到期"
                body = f"{pet_name} 的疫苗「{vaccine_name}」已過期，請立即安排接種！"
            elif days_until_due <= 3:
                title = f"⚠️ 疫苗即將到期"
                body = f"{pet_name} 的疫苗「{vaccine_name}」將於 {days_until_due} 天後到期，請儘快安排接種"
            else:
                title = f"📅 疫苗提醒"
                body = f"{pet_name} 的疫苗「{vaccine_name}」將於 {days_until_due} 天後到期"
            
            print(f"\n處理提醒: {pet_name} - {vaccine_name} (距離到期: {days_until_due} 天)")
            
            # 發送推播通知
            webpush_success = send_webpush_notification(user_id, title, body)
            
            # 發送郵件提醒
            email_success = send_email_reminder(email, vaccine_name, pet_name, due_date)
            
            if webpush_success or email_success:
                print(f"✅ 提醒發送完成")
            else:
                print(f"❌ 提醒發送失敗")
                
        except Exception as e:
            print(f"處理疫苗提醒時發生錯誤: {e}")
    
    print("=== 疫苗提醒檢查完成 ===\n")

def run_scheduler():
    """執行排程器 - 每天檢查一次"""
    print("疫苗提醒排程器已啟動")
    print("每天會在設定的時間檢查即將到期的疫苗並發送提醒")
    
    while True:
        try:
            # 立即執行一次檢查
            process_vaccine_reminders()
            
            # 等待24小時後再次執行 (86400秒 = 24小時)
            print(f"下次檢查時間: {(datetime.now() + timedelta(hours=24)).strftime('%Y-%m-%d %H:%M:%S')}")
            time.sleep(86400)  # 24小時
            
        except KeyboardInterrupt:
            print("\n排程器已停止")
            break
        except Exception as e:
            print(f"排程器執行時發生錯誤: {e}")
            # 發生錯誤時等待1小時後重試
            time.sleep(3600)

def run_single_check():
    """執行單次檢查 (用於測試)"""
    process_vaccine_reminders()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--single":
        # 執行單次檢查
        run_single_check()
    else:
        # 執行持續排程
        run_scheduler()
