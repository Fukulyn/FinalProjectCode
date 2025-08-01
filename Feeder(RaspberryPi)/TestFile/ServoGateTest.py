import RPi.GPIO as GPIO
import time

# **設定 GPIO 腳位**
SERVO_PIN = 5  # 你可以改成 12, 13, 18, 19（建議）
FREQ = 50  # MG90S 伺服馬達使用 50Hz PWM 頻率

# **初始化 GPIO**
GPIO.setmode(GPIO.BCM)
GPIO.setup(SERVO_PIN, GPIO.OUT)

# **建立 PWM 物件**
pwm = GPIO.PWM(SERVO_PIN, FREQ)  # PWM 頻率 50Hz
pwm.start(0)  # 初始狀態，避免抖動

pwm.ChangeDutyCycle(4) # 關廚餘閘門
time.sleep(1)
pwm.ChangeDutyCycle(9)
time.sleep(1)
