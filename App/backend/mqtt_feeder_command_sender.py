import os
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

# 載入 .env
load_dotenv()

# MQTT 設定
MQTT_BROKER_URL = os.getenv("MQTT_BROKER_URL")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "petmanager")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "petmanager")

# 主題統一命名
MQTT_TOPIC_COMMAND = os.getenv("MQTT_TOPIC_COMMAND", "feeder/command")

COMMANDS = {
    "start": "啟動餵食器",
    "stop": "停止餵食器",
    "feed": "執行一次餵食",
    "feed_until <目標重量>": "持續餵食直到達到目標重量（如 feed_until 25）",
    "status": "查詢狀態",
    "open_gate": "開啟閘門",
    "close_gate": "關閉閘門"
}

def print_command_menu():
    print("\n可用指令:")
    for cmd, desc in COMMANDS.items():
        print(f"  {cmd:22s} - {desc}")

def send_command(command):
    client = mqtt.Client()
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
    client.loop_start()
    client.publish(MQTT_TOPIC_COMMAND, command)  
    print(f"已傳送指令: {command}")
    client.loop_stop()
    client.disconnect()

if __name__ == "__main__":
    while True:
        print_command_menu()
        user_input = input("\n請輸入控制指令（或輸入 q 離開）：\n> ").strip()
        if user_input.lower() in ["q", "quit", "exit"]:
            print("已離開程式。")
            break
        if user_input == "":
            continue
        # feed_until 需有參數
        if user_input.startswith("feed_until") and len(user_input.split()) == 1:
            print("請輸入格式：feed_until <目標重量>，例如 feed_until 25")
            continue
        send_command(user_input) 