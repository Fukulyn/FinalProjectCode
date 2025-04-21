# modules/scale.py

import RPi.GPIO as GPIO
import time
from statistics import median
from hx711 import HX711

# 引腳與參數設置
DT_PIN = 19  # HX711 DT Pin
SCK_PIN = 26  # HX711 SCK Pin
REFERENCE_UNIT = 99  # 可從校正寫入設定檔

hx = None  # 全域 HX711 物件

def init_scale():
    global hx
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)
    print("[Scale] 初始化 HX711 模組...")
    hx = HX711(DT_PIN, SCK_PIN)
    hx.set_reference_unit(REFERENCE_UNIT)
    hx.reset()
    time.sleep(0.2)
    hx.tare()
    print("[Scale] 去皮完成")

def get_realtime_weight():
    """讀取單筆原始重量（不濾波，保留即時性）"""
    try:
        weight = hx.get_weight(1)
        hx.power_down(); time.sleep(0.01); hx.power_up()
        return round(max(0.0, weight), 1)
    except:
        return 0.0

def get_filtered_weight(samples=20):
    """讀取多筆數據並進行中位數濾波"""
    readings = []
    for _ in range(samples):
        try:
            val = hx.get_weight(1)
            readings.append(val)
        except:
            pass
        time.sleep(0.03)
    if len(readings) < 5:
        return 0.0
    readings.sort()
    trimmed = readings[1:-1] if len(readings) > 3 else readings
    avg = median(trimmed)
    hx.power_down(); time.sleep(0.01); hx.power_up()
    return round(max(0.0, avg), 1)

def calibrate_weight():
    global REFERENCE_UNIT
    try:
        known = float(input("請輸入已知重量 (g)："))
        print("請放置砝碼並保持靜止...")
        time.sleep(2)
        raw = [hx.get_value(1) for _ in range(10)]
        raw.sort()
        raw_avg = sum(raw[2:-2]) / len(raw[2:-2])  # 去頭尾後平均
        REFERENCE_UNIT = raw_avg / known
        hx.set_reference_unit(REFERENCE_UNIT)
        print(f"✅ 新比例因子：{REFERENCE_UNIT:.2f} ADC/g")
        input("移除砝碼後按 Enter 繼續...")
        hx.tare()
    except Exception as e:
        print(f"⚠️ 校正失敗：{e}")
