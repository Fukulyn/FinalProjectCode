import time
from datetime import datetime
import RPi.GPIO as GPIO

# --- 常數設定 ---
SERVO_PIN       = 5       # 可依實際腳位調整
SERVO_FREQUENCY = 50      # MG90S 建議 50Hz
FIXED_DUTY      = 7.76   # 固定 DutyCycle
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

from modules.scale import get_filtered_weight

def feed_until_weight(target_grams, max_loops=20):
    """
    根據目標重量持續餵食，直到達標或達到安全上限次數。
    """
    print(f"[目標餵食] {target_grams:.1f} g")
    loop = 0
    while loop < max_loops:
        current = get_filtered_weight()
        print(f"目前重量：{current:.1f} g")

        if current >= target_grams:
            print("✅ 達到目標餵食重量！")
            break

        pwm.ChangeDutyCycle(FIXED_DUTY)
        time.sleep(5)
        pwm.ChangeDutyCycle(0)
        time.sleep(2)

        loop += 1

    if loop >= max_loops:
        print("⚠️ 已達最大餵食次數上限，強制停止")
