import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import time
from supabase import create_client
import schedule

# Supabase 配置
SUPABASE_URL = "https://hkjclbdisriyqsvcpmnp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramNsYmRpc3JpeXFzdmNwbW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NTM1NzQsImV4cCI6MjA1NTUyOTU3NH0.kcKKU2u_FioHElJBTcV6uDVJjOL6nWDlZ0hz1r26_AQ"

# Gmail 配置
GMAIL_USER = "0966178691wang@gmail.com"
GMAIL_PASSWORD = "leal xuie cmxj qylr"  # 需要在 Gmail 设置中生成应用专用密码

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def send_email(to_email, subject, body):
    try:
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject

# 發送 Web Push
def send_webpush(user_id, title, body):
    url = 'https://7jjl14w0-3001.asse.devtunnels.ms/api/send-webpush'  # 用你的公開網址
    headers = {'Content-Type': 'application/json'}
    data = {
        'userId': user_id,
        'title': title,
        'body': body
    }
    response = requests.post(url, headers=headers, json=data)
    print('WebPush response:', response.json())

def main():
    print("提醒邮件服务已启动...")
    
    # 每分钟检查一次提醒
    schedule.every().minute.do(check_reminders)
    
    while True:
        schedule.run_pending()
        time.sleep(30)

    # 3. 查詢即將到期的疫苗紀錄
    sql = """
    SELECT v.id, v.vaccine_name, v.next_due_date, p.name AS pet_name, u.id AS user_id
    FROM vaccine_records v
    JOIN pets p ON v.pet_id = p.id
    JOIN auth.users u ON p.user_id = u.id
    WHERE v.next_due_date <= %s AND v.next_due_date >= %s
    """
    df = pd.read_sql(sql, engine, params=(soon, today))

    for _, row in df.iterrows():
        user_id = str(row['user_id'])
        title = f"【疫苗提醒】{row['pet_name']} 的疫苗即將到期"
        body = f"您的寵物 {row['pet_name']} 的疫苗「{row['vaccine_name']}」預計於 {row['next_due_date']} 到期，請記得安排接種！"
        try:
            send_webpush(user_id, title, body)
            print(f"已推播給 user_id={user_id} ({row['pet_name']})")
        except Exception as e:
            print(f"推播失敗：user_id={user_id}，錯誤：{e}")

if __name__ == '__main__':
    main()
