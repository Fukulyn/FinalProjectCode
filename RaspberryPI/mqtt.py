import paho.mqtt.client as mqtt
import time

# MQTT Broker配置
BROKER = "broker.hivemq.com"  # 使用這些公共broker之一進行測試
# BROKER = "broker.emqx.io"
# BROKER = "test.mosquitto.org"
PORT = 1883
TOPIC = "your/topic"  # 替換為您的主題

# 當連接到伺服器時的回調函數
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"成功連接到MQTT Broker: {BROKER}")
        # 連接成功後訂閱主題
        client.subscribe(TOPIC)
        print(f"已訂閱主題: {TOPIC}")
    else:
        print(f"連接失敗，返回碼: {rc}")

# 當接收到訊息時的回調函數
def on_message(client, userdata, msg):
    message = msg.payload.decode()
    print(f"收到訊息[{msg.topic}]: {message}")

# 連接丟失時的回調函數
def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"意外斷開連接，返回碼: {rc}")
    else:
        print("成功斷開連接")

try:
    # 初始化MQTT客戶端 - 使用新API版本
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    
    # 設置回調函數
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    
    # 嘗試連接到broker
    print(f"正在連接到MQTT Broker: {BROKER}...")
    client.connect(BROKER, PORT, 60)
    
    # 開始循環
    client.loop_start()
    
    # 發送訊息
    count = 0
    while True:
        message = f"測試訊息 #{count}"
        client.publish(TOPIC, message)
        print(f"已發送: {message}")
        count += 1
        time.sleep(5)
    
except KeyboardInterrupt:
    print("程序被用戶中斷")
except Exception as e:
    print(f"發生錯誤: {e}")
finally:
    # 停止循環並斷開連接
    client.loop_stop()
    client.disconnect()
    print("已斷開MQTT連接")