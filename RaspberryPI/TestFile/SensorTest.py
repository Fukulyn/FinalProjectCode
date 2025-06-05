import time
import board
import busio
from adafruit_vl53l1x import VL53L1X

# 初始化 I2C 介面
i2c = busio.I2C(board.SCL, board.SDA)

# 創建 VL53L1X 物件
sensor = VL53L1X(i2c)

# 設定測量時間
sensor.measurement_timing_budget = 200000  # 200ms

# 啟動測量
sensor.start_ranging()

try:
    while True:
        if sensor.data_ready:
            distance_cm = sensor.distance  # 取得距離，單位是 mm
            distance_m = round(distance_cm / 100, 2)   # 轉換為 cm
            distance_mm = distance_cm * 10  # 轉換為公尺
            
            print(f"距離: {distance_mm} mm | {distance_cm} cm | {distance_m} m")
            
            sensor.clear_interrupt()
        time.sleep(3)  # 每 100ms 更新一次
except KeyboardInterrupt:
    print("程式終止")
finally:
    sensor.stop_ranging()
