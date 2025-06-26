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

        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(GMAIL_USER, GMAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"邮件已发送到 {to_email}")
    except Exception as e:
        print(f"发送邮件时出错: {e}")

def check_reminders():
    try:
        # 获取当前时间
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_weekday = now.weekday()  # 0-6 表示周一到周日

        # 从数据库获取活动的提醒
        response = supabase.table('reminders').select(
            '*,pets(name,owner_email)'
        ).eq('active', True).execute()

        if response.data:
            for reminder in response.data:
                scheduled_time = reminder['scheduled_time']
                repeat_days = reminder['repeat_days']
                
                # 检查时间和星期是否匹配
                if (scheduled_time == current_time and 
                    (current_weekday in repeat_days or not repeat_days)):
                    
                    pet_name = reminder['pets']['name']
                    owner_email = reminder['pets']['owner_email']
                    
                    # 准备邮件内容
                    subject = f"寵物提醒 - {reminder['title']}"
                    body = f"""
您的寵物 {pet_name} 需要注意：

類型：{reminder['type']}
標題：{reminder['title']}
時間：{reminder['scheduled_time']}
描述：{reminder['description'] or '無'}

請及時處理！
"""
                    # 发送邮件
                    send_email(owner_email, subject, body)

    except Exception as e:
        print(f"检查提醒时出错: {e}")

def main():
    print("提醒邮件服务已启动...")
    
    # 每分钟检查一次提醒
    schedule.every().minute.do(check_reminders)
    
    while True:
        schedule.run_pending()
        time.sleep(30)

if __name__ == "__main__":
    main() 