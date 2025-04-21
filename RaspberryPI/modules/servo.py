# modules/servo.py

import time
from datetime import datetime
import RPi.GPIO as GPIO

# --- 常數設定 ---
SERVO_PIN        = 24     # BCM 腳位
SERVO_FREQUENCY  = 50     # Hz
SERVO_MIN_DUTY   = 2.5    # 0° 對應佔空比
SERVO_MAX_DUTY   = 12.5   # 180° 對應佔空比
ANGLE_TO_GRAM    = 0.25   # 每度約等於 0.25 g

# PWM 物件 (延後初始化)
pwm = None

def init_servo():
    """
    初始化伺服馬達：設定 GPIO、建立並啟動 PWM，
    請在主程式開頭呼叫一次。
    """
    GPIO.setwarnings(False)      # 關閉重複使用腳位警告
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(SERVO_PIN, GPIO.OUT)

    global pwm
    pwm = GPIO.PWM(SERVO_PIN, SERVO_FREQUENCY)
    pwm.start(0)
    print("🔧 伺服馬達已初始化")

def feed(angle=45):
    """
    控制伺服馬達轉動到指定角度並回傳估算餵食重量 (g)。

    參數：
      angle (int/float) – 0~180°，超出範圍自動截斷
    返回：
      float – 本次餵食估算克數 (保留 2 位小數)
    """
    # 確保角度在合法範圍
    try:
        angle = float(angle)
    except ValueError:
        angle = 90.0
    angle = max(0.0, min(180.0, angle))

    # 線性映射到佔空比
    duty = SERVO_MIN_DUTY + (angle / 180.0) * (SERVO_MAX_DUTY - SERVO_MIN_DUTY)
    print(f"🔄 伺服轉動 → 角度: {angle:.1f}° | DutyCycle: {duty:.2f}%")

    # 發送 PWM
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)  # 停止訊號防止抖動

    # 計算估算餵食量
    grams = round(angle * ANGLE_TO_GRAM, 2)
    print(f"✅ 餵食完成：{grams} g @ {datetime.now().isoformat()}")
    return grams
