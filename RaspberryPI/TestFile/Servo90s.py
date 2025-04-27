import RPi.GPIO as GPIO
import time

# **設定 GPIO 腳位**
SERVO_PIN = 18  # 你可以改成 12, 13, 18, 19（建議）
FREQ = 50  # MG90S 伺服馬達使用 50Hz PWM 頻率

# **初始化 GPIO**
GPIO.setmode(GPIO.BCM)
GPIO.setup(SERVO_PIN, GPIO.OUT)

# **建立 PWM 物件**
pwm = GPIO.PWM(SERVO_PIN, FREQ)  # PWM 頻率 50Hz
pwm.start(0)  # 初始狀態，避免抖動

# **函數：角度轉換為 PWM 佔空比**
def angle_to_duty_cycle(angle):
    return 2.5 + (angle / 180.0) * 10  # MG90S 需要 2.5% ~ 12.5%

try:
    while True:
        # **旋轉到 0°**
        print("旋轉到 0°")
        pwm.ChangeDutyCycle(angle_to_duty_cycle(0))
        time.sleep(1)

        # **旋轉到 90°**
        print("旋轉到 90°")
        pwm.ChangeDutyCycle(angle_to_duty_cycle(90))
        time.sleep(1)

        # **旋轉到 180°**
        print("旋轉到 180°")
        pwm.ChangeDutyCycle(angle_to_duty_cycle(180))
        time.sleep(1)

except KeyboardInterrupt:
    print("程式終止")

finally:
    pwm.stop()  # 停止 PWM
    GPIO.cleanup()  # 清理 GPIO 設定
