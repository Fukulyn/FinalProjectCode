# 智慧餵食器：終端機互動版（最終最佳化）
# 功能：
#   0) 去皮並重啟距離感測器
#   1) 手動餵食（可指定角度並估算克數）
#   2) 連續顯示狀態 (重量 & 飼料高度)，按 Enter 停止
#   3) 校正重量比例因子 (已知砝碼)
#   4) 校正距離比例 (已知實際距離)
#   5) 退出程式

import time
import sys
import select
import board
import busio
import RPi.GPIO as GPIO
from datetime import datetime
from statistics import median
from hx711 import HX711
import adafruit_vl53l1x

# --- 常數設定 ---
DOUT_PIN = 5      # HX711 資料腳位
SCK_PIN = 6       # HX711 時脈腳位
SERVO_PIN = 17    # 伺服馬達控制腳位 (BCM編號)
REFERENCE_UNIT = 92  # 初始重量比例因子 (ADC per g)
ANGLE_TO_GRAM = 0.25 # 每度轉動對應飼料克數

distance_scale = 1.0  # 距離校正比例

# --- 初始化 GPIO 與伺服馬達 ---
GPIO.setmode(GPIO.BCM)
GPIO.setup(SERVO_PIN, GPIO.OUT)
pwm = GPIO.PWM(SERVO_PIN, 50)  # 50Hz PWM
pwm.start(0)

def feed(angle=90):
    """控制伺服馬達轉動並返回估算克數"""
    duty = 2.5 + (angle/180.0)*10.0
    print(f"伺服馬達轉至 {angle}°，Duty = {duty:.2f}")
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)
    grams = round(angle * ANGLE_TO_GRAM, 2)
    print(f"餵食完成：{grams} g @ {datetime.now().isoformat()}")
    return grams

# --- 初始化並去皮秤重模組 ---
hx = HX711(DOUT_PIN, SCK_PIN)
hx.set_reference_unit(REFERENCE_UNIT)

def init_scale():
    """清空去皮，設置零點"""
    print("開始秤重去皮...")
    hx.reset()
    time.sleep(0.5)
    hx.tare()
    print("去皮完成")

def get_weight():
    """讀取多筆重量，去除極端值後回傳平均值 (g)"""
    samples = []
    for _ in range(30):
        try:
            samples.append(hx.get_weight(1))
        except:
            pass
        time.sleep(0.05)
    if len(samples) < 10:
        print("無法讀取足夠秤重資料")
        return 0.0
    samples.sort()
    trim = max(1, int(len(samples)*0.1))
    trimmed = samples[trim:-trim]
    avg = sum(trimmed)/len(trimmed)
    weight = max(0.0, round(avg,1))
    print(f"目前重量：{weight} g")
    hx.power_down(); time.sleep(0.01); hx.power_up()
    return weight

# --- 初始化並重啟距離感測器 ---
i2c = busio.I2C(board.SCL, board.SDA)
sensor = adafruit_vl53l1x.VL53L1X(i2c)

def init_sensor():
    """重啟距離感測器並設定參數"""
    print("重啟距離感測器...")
    sensor.distance_mode = 1
    sensor.timing_budget = 200
    sensor.start_ranging()
    print("感測器啟動完成")

def get_distance():
    """讀取多筆距離，去除極端值並應用校正，回傳單位 mm"""
    samples = []
    for _ in range(20):
        if sensor.data_ready:
            samples.append(sensor.distance)
            sensor.clear_interrupt()
        time.sleep(0.05)
    if len(samples) < 5:
        print("距離讀取失敗")
        return None
    samples.sort()
    trim = max(1, int(len(samples)*0.1))
    trimmed = samples[trim:-trim]
    raw_avg = sum(trimmed)/len(trimmed)
    corrected = raw_avg * distance_scale
    corrected = max(0.0, corrected)
    cm = round(corrected,1)
    mm = round(corrected * 10.0,2)
    print(f"飼料高度：{cm} cm ({mm} mm)")
    return corrected

# --- 校正重量比例因子 ---
def calibrate_weight():
    """使用已知砝碼校正 ADC/g"""
    try:
        known = float(input("請輸入已知重量 (g)："))
        print("放置砝碼並靜置 2 秒...")
        time.sleep(2)
        raw = []
        for _ in range(20):
            raw.append(hx.get_value(1))
            time.sleep(0.1)
        raw.sort()
        trim = max(1, int(len(raw)*0.1))
        trimmed = raw[trim:-trim]
        raw_avg = sum(trimmed)/len(trimmed)
        new_unit = raw_avg/known
        hx.set_reference_unit(new_unit)
        print(f"新重量比例因子：{new_unit:.2f} ADC/g")
        input("移除砝碼後按 Enter 去皮...")
        init_scale()
    except ValueError:
        print("輸入錯誤，請輸入數字。")

# --- 校正距離比例 ---
def calibrate_distance():
    """使用已知距離校正距離比例"""
    global distance_scale
    try:
        actual = float(input("請輸入實際距離 (mm)："))
        print("放置測試物體並靜置 2 秒...")
        time.sleep(2)
        raw = []
        for _ in range(30):
            if sensor.data_ready:
                raw.append(sensor.distance)
                sensor.clear_interrupt()
            time.sleep(0.05)
        raw.sort()
        trim = max(1, int(len(raw)*0.1))
        trimmed = raw[trim:-trim]
        raw_avg = sum(trimmed)/len(trimmed)
        distance_scale = actual / raw_avg
        print(f"新距離比例：scale = {distance_scale:.4f}")
    except ValueError:
        print("輸入錯誤，請輸入數字。")

# --- 互動式選單 ---
def main_menu():
    # 啟動時初始化一次
    init_scale()
    init_sensor()
    while True:
        print("\n===== 操作選單 =====")
        print("0) 去皮+重啟感測")
        print("1) 餵食")
        print("2) 連續狀態(按 Enter 停止)")
        print("3) 校正重量比例")
        print("4) 校正距離比例")
        print("5) 退出")
        choice = input("選項 (0-5)：")
        if choice=='0':
            init_scale(); init_sensor()
        elif choice=='1':
            try: angle=int(input("角度 (預設90)：") or 90)
            except: angle=90
            feed(angle)
        elif choice=='2':
            print("連續顯示狀態，按 Enter 停止")
            try:
                while True:
                    get_weight(); get_distance()
                    if select.select([sys.stdin],[],[],1)[0]:
                        sys.stdin.readline(); break
            except KeyboardInterrupt:
                pass
        elif choice=='3':
            calibrate_weight()
        elif choice=='4':
            calibrate_distance()
        elif choice=='5':
            print("退出中...")
            break
        else:
            print("無效選項，請重新輸入。")

if __name__ == '__main__':
    try:
        main_menu()
    finally:
        pwm.stop(); GPIO.cleanup(); print("程式結束，清理完成")
