import paho.mqtt.client as mqtt
from paho.mqtt.client import CallbackAPIVersion
from datetime import datetime

# --- MQTT 設定 ---
MQTT_BROKER_URL = "test.mosquitto.org"
MQTT_PORT = 1883
MQTT_TOPIC_FEEDING = "pet/manager/topic/feeding"

# --- MQTT 回呼：連線成功 ---
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ MQTT 已連線")
        client.subscribe(MQTT_TOPIC_FEEDING)
        print(f"📡 已訂閱主題：{MQTT_TOPIC_FEEDING}")
    else:
        print(f"❌ MQTT 連線失敗，錯誤碼：{rc}")

# --- MQTT 回呼：收到訊息 ---
def on_message(client, userdata, msg):
    timestamp = datetime.now().isoformat()
    message = msg.payload.decode()
    print(f"📥 收到訊息：{msg.topic} @ {timestamp} → {message}")

    # 這裡可加入寫入日誌 / 上傳資料庫功能
    # 或觸發 feed(angle) 控制馬達餵食（需小心 thread 安全）
    # 例如：import feed_motor 再呼叫 feed_motor.feed(angle)

# --- 建立 MQTT Client 並回傳 ---
mqtt_client = mqtt.Client(
    client_id="smart_feeder_device",
    callback_api_version=CallbackAPIVersion.V5  # 使用 Enum 而非數字
)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

try:
    mqtt_client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
except Exception as e:
    print(f"MQTT 連線失敗：{e}")
