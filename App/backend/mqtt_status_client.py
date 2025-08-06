import paho.mqtt.client as mqtt
from datetime import datetime
import json
from paho.mqtt.enums import CallbackAPIVersion

# MQTT 配置
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/status"  # 狀態查詢回應主題
MQTT_USERNAME = "petmanager"
MQTT_PASSWORD = "petmanager"

# 全域變數來存儲最新的狀態信息
latest_status = None
status_timestamp = None

def get_latest_status():
    """獲取最新的狀態信息"""
    global latest_status, status_timestamp
    return {
        "status": latest_status,
        "timestamp": status_timestamp
    }

# MQTT 回調函數
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("狀態查詢客戶端已成功連接到 MQTT Broker!")
        client.subscribe(MQTT_TOPIC)
        print(f"已訂閱狀態查詢主題: {MQTT_TOPIC}")
    else:
        print(f"狀態查詢客戶端連接失敗，返回代碼 {rc}")

def on_message(client, userdata, msg):
    global latest_status, status_timestamp
    message = msg.payload.decode()
    print(f"收到狀態回應: {msg.topic} - {message}")
    
    try:
        data = json.loads(message)
        latest_status = data
        status_timestamp = datetime.now().isoformat()
        print(f"狀態已更新: {status_timestamp}")
        
    except json.JSONDecodeError as e:
        print(f"解析狀態 JSON 消息時出錯: {e}")
    except Exception as e:
        print(f"處理狀態消息時出錯: {e}")

def main():
    # 創建 MQTT 客戶端實例
    client = mqtt.Client(client_id="status_query_client", callback_api_version=CallbackAPIVersion.VERSION1)
    
    # 設置回調函數
    client.on_connect = on_connect
    client.on_message = on_message
    
    # 設置用戶名和密碼
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    try:
        print(f"狀態查詢客戶端正在連接到 {MQTT_BROKER_URL}...")
        client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
        
        # 開始循環，保持連接
        client.loop_forever()
        
    except Exception as e:
        print(f"狀態查詢客戶端連接失敗: {e}")

if __name__ == "__main__":
    main() 