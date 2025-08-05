# modules/sensor_dual.py

import board
import busio
import adafruit_tca9548a
import adafruit_vl53l1x

i2c = busio.I2C(board.SCL, board.SDA)
tca = adafruit_tca9548a.TCA9548A(i2c)

sensor1 = None
sensor2 = None

def init_dual_sensor():
    global sensor1, sensor2
    try:
        sensor1 = adafruit_vl53l1x.VL53L1X(tca[2])
        sensor2 = adafruit_vl53l1x.VL53L1X(tca[6])
        sensor1.start_ranging()
        sensor2.start_ranging()
        print("雙感測器初始化完成")
    except Exception as e:
        print(f"感測器初始化失敗：{e}")
        sensor1, sensor2 = None, None

def get_dual_distance():
    if sensor1 is None or sensor2 is None:
        raise RuntimeError("雙感測器未正確初始化")
    return sensor1.distance, sensor2.distance

def calibrate_distance():
    if sensor1 is None or sensor2 is None:
        print("感測器未初始化，無法校正")
        return
    print("請確保兩顆感測器面前是固定平面，按 Enter 開始校正")
    input(">> ")
    print(f"Sensor1 原始距離：{sensor1.distance} mm")
    print(f"Sensor2 原始距離：{sensor2.distance} mm")
    print("（此版本為示範，不修改內部參數）")

def stop_dual_sensor():
    if sensor1:
        sensor1.stop_ranging()
    if sensor2:
        sensor2.stop_ranging()
