import time
from datetime import datetime
import RPi.GPIO as GPIO

# --- 常數設定 ---
SERVO_PIN       = 5       # 可依實際腳位調整
SERVO_FREQUENCY = 50      # MG90S 建議 50Hz
FIXED_DUTY      = 7.55   # 固定 DutyCycle
ESTIMATED_GRAM  = 5.0     # 假設每次餵這樣的克數（可自訂）

# PWM 物件
pwm = None

def init_servo():
    """
    初始化伺服馬達：設定 GPIO、啟動 PWM。
    """
    global pwm
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(SERVO_PIN, GPIO.OUT)

    pwm = GPIO.PWM(SERVO_PIN, SERVO_FREQUENCY)
    pwm.start(0)
    print("伺服馬達已初始化")

def feed():
    """
    餵食一次，直接送出固定 DutyCycle。
    返回估算餵食克數。
    """
    print(f"[餵食中] 伺服馬達輸出 DutyCycle: {FIXED_DUTY}")
    pwm.ChangeDutyCycle(FIXED_DUTY)
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)  # 停止防止抖動

    print(f"[完成] 餵食 {ESTIMATED_GRAM} g @ {datetime.now().isoformat()}")
    return ESTIMATED_GRAM
