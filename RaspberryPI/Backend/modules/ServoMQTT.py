#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
servo_mqtt_test.py：獨立測試伺服馬達控制並透過 MQTT 上傳餵食結果
"""

import time
import json
import paho.mqtt.client as mqtt
from servo import init_servo, feed

# MQTT 設定
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/feeding"
MQTT_USERNAME = "petmanager"
MQTT_PASSWORD = "petmanager"

# 初始化伺服馬達
init_servo()

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
        inp = input("\n按 Enter 餵食（角度 45°），或輸入自訂角度 >> ").strip()
        try:
            angle = float(inp) if inp else 45.0
        except ValueError:
            angle = 45.0
        grams = feed(angle)
        payload = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "angle": angle,
            "amount": grams
        }
        client.publish(MQTT_TOPIC, json.dumps(payload))
        print(f"[MQTT] 發送餵食資料: {payload}")
        time.sleep(1)
except KeyboardInterrupt:
    print("\n[MQTT] 中止餵食測試")
finally:
    client.loop_stop()
    client.disconnect()