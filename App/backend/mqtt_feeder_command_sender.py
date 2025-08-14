import paho.mqtt.client as mqtt

BROKER = "broker.emqx.io"
PORT = 1883
USERNAME = "petmanager"
PASSWORD = "petmanager"
TOPIC = "feeder/command"  # 餵食器控制指令主題

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
    client.username_pw_set(USERNAME, PASSWORD)
    client.connect(BROKER, PORT, 60)
    client.loop_start()
    client.publish(TOPIC, command)
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