import paho.mqtt.client as mqtt
from controllers.feeder_controller import handle_mqtt_message

def on_connect(client, userdata, flags, rc):
    print("[MQTT] 已連線")
    client.subscribe("feeder/command")

def on_message(client, userdata, msg):
    payload = msg.payload.decode()
    print(f"[MQTT] 收到訊息: {payload}")
    handle_mqtt_message(client, payload)

def init_mqtt():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect("localhost", 1883, 60)
    return client
