#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
distance_mqtt_test.py：獨立測試 VL53L1X 距離感測資料 MQTT 上傳
"""

import time
import json
import paho.mqtt.client as mqtt
from RaspberryPI.Backend.Archive.sensor import init_sensor, get_realtime_distance

# MQTT 設定
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/feeding"  # 可區別於餵食紀錄
MQTT_USERNAME = "petmanager"
MQTT_PASSWORD = "petmanager"

# 初始化感測器
init_sensor()

# 建立 MQTT 客戶端
client = mqtt.Client()
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] 連線成功")
    else:
        print(f"[MQTT] 連線失敗，錯誤碼: {rc}")


client.on_connect = on_connect
client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
client.loop_start()

try:
    while True:
        cm, mm = get_realtime_distance()
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        payload = {
            "timestamp": timestamp,
            "distance_cm": cm,
            "distance_mm": mm
        }
        client.publish(MQTT_TOPIC, json.dumps(payload))
        print(f"[MQTT] 發送距離資料: {payload}")
        time.sleep(1)
except KeyboardInterrupt:
    print("\n[MQTT] 中止距離資料上傳")
finally:
    client.loop_stop()
    client.disconnect()
