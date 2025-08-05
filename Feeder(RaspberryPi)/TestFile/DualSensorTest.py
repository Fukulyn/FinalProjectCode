import board
import busio
import adafruit_tca9548a
import adafruit_vl53l1x
import time
import os

# 初始化 I2C 與 TCA 多工器
i2c = busio.I2C(board.SCL, board.SDA)
tca = adafruit_tca9548a.TCA9548A(i2c)

# 初始化感測器
sensor1 = adafruit_vl53l1x.VL53L1X(tca[2])
sensor2 = adafruit_vl53l1x.VL53L1X(tca[6])
sensor1.start_ranging()
sensor2.start_ranging()

# 清除畫面
def clear():
    os.system('clear')  # 如果是 Windows 改成 'cls'

print("即時感測器資料面板（按 Ctrl+C 離開）\n")

try:
    while True:
        dist1 = sensor1.distance
        dist2 = sensor2.distance

        clear()
        print("┌────────────────────────────┐")
        print("│     Sensor Dashboard       │")
        print("├────────────────────────────┤")
        print(f"│ Sensor1 @ TCA0 : {dist1:>5.1f} cm  │")
        print(f"│ Sensor2 @ TCA1 : {dist2:>5.1f} cm  │")
        print("└────────────────────────────┘")

        time.sleep(0.3)
except KeyboardInterrupt:
    print("\n結束監測")
finally:
    sensor1.stop_ranging()
    sensor2.stop_ranging()
