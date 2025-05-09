from flask_mqtt import Mqtt
import time, json

mqtt = Mqtt()
client = None

def init_mqtt(app):
    global client
    mqtt.init_app(app)
    client = mqtt

@mqtt.on_connect()
def handle_connect(client, userdata, flags, rc):
    print("[MQTT] Connected with result code", rc)

@mqtt.on_message()
def handle_message(client, userdata, msg):
    print(f"[MQTT] Message received: {msg.topic} → {msg.payload.decode()}")

def publish_feed_log(grams):
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    payload = {
        "timestamp": timestamp,
        "amount": grams
    }
    mqtt.publish("pet/manager/topic/feeding", json.dumps(payload))
    print(f"[MQTT] 餵食紀錄已發送：{payload}")