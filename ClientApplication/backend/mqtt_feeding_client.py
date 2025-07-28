import paho.mqtt.client as mqtt
from datetime import datetime
from supabase import create_client
import json
from paho.mqtt.enums import CallbackAPIVersion

# MQTT 配置
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/feeding"  # 餵食器數據讀取及記錄
MQTT_USERNAME = "petmanager"  # MQTT 用戶名
MQTT_PASSWORD = "petmanager"  # MQTT 密碼

# Supabase 配置
SUPABASE_URL = "https://hkjclbdisriyqsvcpmnp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhramNsYmRpc3JpeXFzdmNwbW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NTM1NzQsImV4cCI6MjA1NTUyOTU3NH0.kcKKU2u_FioHElJBTcV6uDVJjOL6nWDlZ0hz1r26_AQ"

# 初始化 Supabase 客户端
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 存储喂食记录到 Supabase
def store_feeding_record(timestamp, pet_id, angle, weight, laser_distance, power,food_type,calories):
    try:
        # 構建要插入的數據
        data = {
            'fed_at': timestamp,  # 假設 timestamp 對應到 fed_at 欄位
            'pet_id': pet_id,
            'amount': angle,  # 將角度存放到 amount 欄位
            'weight': weight,  # 將重量存放到 weight 欄位
            'laser_distance': laser_distance,  # 將雷射距離存放到 laser_distance 欄位
            'power': power,  # 新增電量欄位
            'food_type': food_type,
            'calories': calories
        }
        
        # 插入數據到 feeding_records 表
        response = supabase.table('feeding_records').insert(data).execute()
        print(f"餵食紀錄已儲存到 Supabase: {data}")
        
    except Exception as e:
        print(f"儲存餵食紀錄時出錯: {e}")

# MQTT 回调函数
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("已成功連接到 MQTT Broker!")
        client.subscribe(MQTT_TOPIC)
        print(f"已訂閱喂食紀錄主題: {MQTT_TOPIC}")
    else:
        print(f"連接失敗，返回代碼 {rc}")

def on_message(client, userdata, msg):
    timestamp = datetime.now().isoformat()
    message = msg.payload.decode()
    print(f"收到餵食紀錄 - {timestamp}: {msg.topic} - {message}")
    
    # 解析消息
    try:
        data = json.loads(message)
        angle = data.get('angle')
        weight = data.get('weight')
        laser_distance = data.get('laser_distance')
        pet_id = data.get('pet_id')
        power = data.get('power')  # 解析電量
        food_type = data.get('food_type', 'default_food')
        calories = data.get('calories', 0)
        

        if angle is not None:
            print(f"角度: {angle}°")
        if weight is not None:
            print(f"廚餘重量: {weight}g")
        if laser_distance is not None:
            print(f"雷射感應距離: {laser_distance}mm")
        if power is not None:
            print(f"電量: {power}V")  # 假設電量以伏特為單位

        # 存储到 Supabase
        store_feeding_record(timestamp, pet_id, angle, weight, laser_distance, power,food_type,calories)
        
    except Exception as e:
        print(f"解析消息時出錯: {e}")

def main():
    # 创建 MQTT 客户端实例，添加 callback_api_version 参数
    client = mqtt.Client(client_id="feeding_records_client", callback_api_version=CallbackAPIVersion.VERSION1)
    
    # 设置回调函数
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        print(f"正在連接到 {MQTT_BROKER_URL}...")
        client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
        
        # 开始循环
        client.loop_forever()
        
    except Exception as e:
        print(f"連接失敗: {e}")

if __name__ == "__main__":
    main() 