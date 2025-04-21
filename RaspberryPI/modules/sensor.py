# modules/sensor.py

import time
import json
import board
import busio
import adafruit_vl53l1x
from statistics import mean

CONFIG_FILE   = 'config.json'
DEFAULT_SCALE = 1.0
NUM_SAMPLES   = 30
TRIM_RATIO    = 0.05  # 修剪前後各 5%，保留中間 90%

def load_scale():
    try:
        cfg = json.load(open(CONFIG_FILE))
        return cfg.get('distance_scale', DEFAULT_SCALE)
    except:
        return DEFAULT_SCALE

def save_scale(s):
    try:
        cfg = {}
        try:
            cfg = json.load(open(CONFIG_FILE))
        except:
            pass
        cfg['distance_scale'] = s
        json.dump(cfg, open(CONFIG_FILE, 'w'))
    except Exception as e:
        print(f"⚠️ 無法寫入設定：{e}")

# 全域倍率
distance_scale = load_scale()

# 初始化感測器
i2c = busio.I2C(board.SCL, board.SDA)
sensor = adafruit_vl53l1x.VL53L1X(i2c)

def init_sensor():
    """啟動 VL53L1X 並開始連續量測"""
    sensor.distance_mode = 1
    sensor.timing_budget = 200
    sensor.start_ranging()

def get_realtime_distance():
    """
    不做平均，立即回傳 (cm, mm)
    若 data_ready=False 則回傳 (0.0, 0.0)
    自動乘上 distance_scale
    """
    if not sensor.data_ready:
        return 0.0, 0.0

    raw_cm = sensor.distance
    sensor.clear_interrupt()
    
    scaled_cm = raw_cm * distance_scale
    cm = round(scaled_cm , 1)
    mm = round(scaled_cm * 10.0, 2)
    return cm, mm

def calibrate_distance():
    """透過已知距離校正 distance_scale"""
    global distance_scale
    try:
        actual = float(input("請輸入實際距離(cm)："))
        actual *= 10  # 轉換為 mm
    except ValueError:
        print("❌ 輸入錯誤，請輸入數字。")
        return

    print("🔄 放置物體並靜置 2 秒…")
    time.sleep(2)

    raw = []
    for _ in range(NUM_SAMPLES):
        if sensor.data_ready:
            raw.append(sensor.distance)
            sensor.clear_interrupt()
        time.sleep(sensor.timing_budget / 1000.0)

    if len(raw) < 5:
        print("⚠️ 校正讀取不足")
        return

    raw.sort()
    trim = max(1, int(len(raw) * TRIM_RATIO))
    if 2 * trim >= len(raw):
        print("⚠️ 修剪比例過高，導致有效樣本為 0")
        return

    trimmed = raw[trim:-trim]
    raw_avg = mean(trimmed)

    if raw_avg <= 0:
        print("⚠️ 平均距離無效，使用預設倍率")
        distance_scale = DEFAULT_SCALE
    else:
        distance_scale = actual / raw_avg

    save_scale(distance_scale)

    print(f"✅ 校正完成：")
    print(f"🔢 raw_avg = {raw_avg:.1f} mm")
    print(f"📏 actual  = {actual:.1f} mm")
    print(f"📐 新倍率  = {distance_scale:.4f}")
