import time
from datetime import datetime
import RPi.GPIO as GPIO

# --- 常數設定 ---
SERVO_FEED_PIN    = 16       # 餵食馬達 GPIO 腳位
SERVO_WASTE_PIN   = 6       # 廚餘閘門 GPIO 腳位
SERVO_FREQUENCY   = 50      # MG90S 建議 50Hz
FIXED_DUTY        = 12     # 餵食用固定 DutyCycle
FIXED_DUTY_2      = 4
ESTIMATED_GRAM    = 10    # 假設每次餵這樣的克數（可自訂）

# PWM 物件
pwm_feed = None
pwm_waste = None

def init_servo():
    """
    初始化餵食與廚餘閘門伺服馬達：設定 GPIO、啟動 PWM。
    """
    global pwm_feed, pwm_waste
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(SERVO_FEED_PIN, GPIO.OUT)
    GPIO.setup(SERVO_WASTE_PIN, GPIO.OUT)

    pwm_feed = GPIO.PWM(SERVO_FEED_PIN, SERVO_FREQUENCY)
    pwm_feed.start(0)
    print("[伺服馬達] 餵食器已初始化")

    pwm_waste = GPIO.PWM(SERVO_WASTE_PIN, SERVO_FREQUENCY)
    pwm_waste.start(0)
    print("[伺服馬達] 廚餘閘門已初始化")

def feed():
    """
    餵食一次，直接送出固定 DutyCycle。
    返回估算餵食克數。
    """
    print(f"[餵食中] DutyCycle: {FIXED_DUTY}")
    pwm_feed.ChangeDutyCycle(0)
    pwm_feed.ChangeDutyCycle(FIXED_DUTY)
    time.sleep(2)
    pwm_feed.ChangeDutyCycle(0)
    time.sleep(0.5)
    pwm_feed.ChangeDutyCycle(FIXED_DUTY_2)
    time.sleep(2)
    pwm_feed.ChangeDutyCycle(0)
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

        pwm_feed.ChangeDutyCycle(FIXED_DUTY)
        time.sleep(2)
        pwm_feed.ChangeDutyCycle(0)
        time.sleep(0.5)
        pwm_feed.ChangeDutyCycle(FIXED_DUTY_2)
        time.sleep(2)
        pwm_feed.ChangeDutyCycle(0)
        time.sleep(1)

        loop += 1

    if loop >= max_loops:
        print("⚠️ 已達最大餵食次數上限，強制停止")

def open_waste_gate():
    print("[閘門] 開啟廚餘閘門")
    pwm_waste.ChangeDutyCycle(2)  # 開門位置
    time.sleep(0.5)
    pwm_waste.ChangeDutyCycle(0)

def close_waste_gate():
    print("[閘門] 關閉廚餘閘門")
    pwm_waste.ChangeDutyCycle(12)  # 關門位置
    time.sleep(0.5)
    pwm_waste.ChangeDutyCycle(0)
