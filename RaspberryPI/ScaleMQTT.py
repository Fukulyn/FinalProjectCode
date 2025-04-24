#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
weight_mqtt_test.py：獨立測試電子秤即時重量資料並透過 MQTT 上傳
"""

import time
import json
import paho.mqtt.client as mqtt
from modules.scale import init_scale, get_realtime_weight

# MQTT 設定
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/feeding"
MQTT_USERNAME = "petmanager"
MQTT_PASSWORD = "petmanager"

# 初始化電子秤
init_scale()

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
        weight = get_realtime_weight()
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        payload = {
            "timestamp": timestamp,
            "weight": weight
        }
        client.publish(MQTT_TOPIC, json.dumps(payload))
        print(f"[MQTT] 發送重量資料: {payload}")
        time.sleep(1)
except KeyboardInterrupt:
    print("\n[MQTT] 中止重量資料上傳")
finally:
    client.loop_stop()
    client.disconnect()
