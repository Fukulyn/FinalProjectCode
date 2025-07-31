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
# 這裡的參數名稱與 Supabase 欄位名稱保持一致，但實際傳入的值是來自 MQTT 訊息的解析結果
def store_feeding_record(timestamp, pet_id, amount, weight, laser_distance, power, food_type, calories):
    try:
        # 直接使用傳入的參數來構建要插入的數據，這些參數已在 on_message 中處理過映射關係
        data = {
            'fed_at': timestamp,
            'pet_id': pet_id,
            'amount': amount,
            'weight': weight,           # 廚餘重量 (來自 MQTT 的 height_waste)
            'laser_distance': laser_distance, # 測量飼料量的雷射距離 (來自 MQTT 的 height_feed)
            'power': power,
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
    message = msg.payload.decode()
    print(f"收到餵食紀錄: {msg.topic} - {message}")
    
    # 解析消息
    try:
        data = json.loads(message)
        
        # 從接收到的數據中提取欄位。
        # 這裡直接將 MQTT 訊息中的名稱映射到 Supabase 對應的欄位名稱
        timestamp = data.get('timestamp')
        pet_id = data.get('pet_id')
        amount = data.get('angle')             # MQTT 的 'angle' 對應 Supabase 的 'amount'
        weight = data.get('height_waste')      # MQTT 的 'height_waste' 對應 Supabase 的 'weight'
        laser_distance = data.get('height_feed') # MQTT 的 'height_feed' 對應 Supabase 的 'laser_distance'
        power = data.get('power')
        food_type = data.get('food_type', 'default_food')
        calories = data.get('calories', 0)
        
        # 打印解析後的數據
        if timestamp:
            print(f"時間戳: {timestamp}")
        if pet_id:
            print(f"寵物 ID: {pet_id}")
        if amount is not None:
            print(f"餵食角度 (amount): {amount}°")
        if weight is not None:
            print(f"廚餘高度 (weight): {weight}mm")
        if laser_distance is not None:
            print(f"飼料高度 (laser_distance): {laser_distance}mm")
        if power is not None:
            print(f"電量: {power}V")
        if food_type:
            print(f"食物類型: {food_type}")
        if calories is not None:
            print(f"卡路里: {calories}")

        # 存储到 Supabase，直接傳遞已映射好名稱的變數
        store_feeding_record(timestamp, pet_id, amount, weight, laser_distance, power, food_type, calories)
        
    except json.JSONDecodeError as e:
        print(f"解析 JSON 消息時出錯: {e}")
    except Exception as e:
        print(f"處理消息時出錯: {e}")

def main():
    # 创建 MQTT 客户端实例
    client = mqtt.Client(client_id="feeding_records_client", callback_api_version=CallbackAPIVersion.VERSION1)
    
    # 设置回调函数
    client.on_connect = on_connect
    client.on_message = on_message
    
    # 如果 MQTT Broker 需要用戶名和密碼，請取消註釋下方兩行
    # client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    try:
        print(f"正在連接到 {MQTT_BROKER_URL}...")
        client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
        
        # 開始循環，保持連接
        client.loop_forever()
        
    except Exception as e:
        print(f"連接失敗: {e}")

if __name__ == "__main__":
    main()