import paho.mqtt.client as mqtt
from datetime import datetime
from supabase import create_client
import json

# MQTT 配置
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/feeding"  # 专门用于喂食记录的主题
MQTT_USERNAME = "petmanager"  # MQTT 用戶名
MQTT_PASSWORD = "petmanager"  # MQTT 密碼

# Supabase 配置
SUPABASE_URL = "https://hkjclbdisriyqsvcpmnp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramNsYmRpc3JpeXFzdmNwbW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NTM1NzQsImV4cCI6MjA1NTUyOTU3NH0.kcKKU2u_FioHElJBTcV6uDVJjOL6nWDlZ0hz1r26_AQ"

# 初始化 Supabase 客户端
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 存储喂食记录到 Supabase
def store_feeding_record(topic, payload, timestamp, pet_id):
    try:
        # 假设 payload 是 JSON 格式的字符串，包含喂食相关信息
        # 例如: {"amount": 100, "food_type": "dry", "device_id": "feeder_01"}
        data = {
            'timestamp': timestamp,
            'topic': topic,
            'feeding_data': payload,
            'pet_id': pet_id
        }
        
        # 插入数据到 feeding_records 表
        response = supabase.table('feeding_records').insert(data).execute()
        print(f"喂食记录已存储到 Supabase: {data}")
        
    except Exception as e:
        print(f"存储喂食记录时出错: {e}")

# MQTT 回调函数
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("已成功连接到 MQTT Broker!")
        client.subscribe(MQTT_TOPIC)
        print(f"已订阅喂食记录主题: {MQTT_TOPIC}")
    else:
        print(f"连接失败，返回代码 {rc}")

def on_message(client, userdata, msg):
    timestamp = datetime.now().isoformat()
    message = msg.payload.decode()
    print(f"收到喂食记录 - {timestamp}: {msg.topic} - {message}")
    
    # 解析消息
    try:
        data = json.loads(message)
        angle = data.get('angle')
        weight = data.get('weight')
        laser_distance = data.get('laser_distance')
        pet_id = data.get('pet_id')

        if angle is not None:
            print(f"角度: {angle}°")
        if weight is not None:
            print(f"厨余重量: {weight}g")
        if laser_distance is not None:
            print(f"雷射感应距离: {laser_distance}mm")

        # 构建喂食记录数据
        feeding_data = {
            'timestamp': timestamp,
            'topic': msg.topic,
            'feeding_data': message,
            'pet_id': pet_id
        }
        
        # 存储到 Supabase
        store_feeding_record(msg.topic, message, timestamp, pet_id)
        
    except Exception as e:
        print(f"解析消息时出错: {e}")

def main():
    # 创建 MQTT 客户端实例，添加 callback_api_version 参数
    client = mqtt.Client(client_id="feeding_records_client", callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
    
    # 设置回调函数
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        print(f"正在连接到 {MQTT_BROKER_URL}...")
        client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
        
        # 开始循环
        client.loop_forever()
        
    except Exception as e:
        print(f"连接失败: {e}")

if __name__ == "__main__":
    main() 