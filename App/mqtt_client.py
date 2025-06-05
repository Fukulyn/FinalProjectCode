import paho.mqtt.client as mqtt
from datetime import datetime
from supabase import create_client
import json

# MQTT 配置
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/collar"
MQTT_USERNAME = "petmanager"  # MQTT 用戶名
MQTT_PASSWORD = "petmanager"  # MQTT 密碼

# Supabase 配置
SUPABASE_URL = "https://hkjclbdisriyqsvcpmnp.supabase.co"
# 使用 service_role key 来绕过 RLS
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramNsYmRpc3JpeXFzdmNwbW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk1MzU3NCwiZXhwIjoyMDU1NTI5NTc0fQ.CVRbG_UEoesN6n0Ofz1TPx66mOKqK09pvDu5vFkg0as"  # 替换为你的 service_role key

# 初始化 Supabase 客户端，使用 service role key
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def store_health_record(payload):
    try:
        # 解析接收到的 JSON 数据
        data = json.loads(payload)
        
        # 准备要插入的数据
        health_record = {
            'pet_id': data['pet_id'],
            'temperature': data.get('temperature'),
            'heart_rate': data.get('heart_rate'),
            'oxygen_level': data.get('oxygen_level'),
            'recorded_at': datetime.now().isoformat()
        }
        
        # 使用 service role 插入数据到 health_records 表
        response = supabase.table('health_records').insert(health_record).execute()
        print(f"健康记录已存储: {health_record}")
        
    except json.JSONDecodeError as e:
        print(f"JSON 解析错误: {e}")
    except Exception as e:
        print(f"存储健康记录时出错: {e}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("已成功连接到 MQTT Broker!")
        client.subscribe(MQTT_TOPIC)
        print(f"已订阅主题: {MQTT_TOPIC}")
    else:
        print(f"连接失败，返回代码 {rc}")

def on_message(client, userdata, msg):
    print(f"收到消息 - 主题: {msg.topic}")
    try:
        message = msg.payload.decode()
        print(f"消息内容: {message}")
        store_health_record(message)
    except Exception as e:
        print(f"处理消息时出错: {e}")

def main():
    client = mqtt.Client(client_id="health_records_client", callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        print(f"正在连接到 {MQTT_BROKER_URL}...")
        client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
        client.loop_forever()
    except Exception as e:
        print(f"连接失败: {e}")

if __name__ == "__main__":
    main() 