from modules.servo import feed, feed_until_weight, open_waste_gate, close_waste_gate
from modules.sensor_dual import get_dual_distance
from modules.scale import get_filtered_weight
from datetime import datetime
import threading
import time

scheduled_task = None
scheduled_info = None

def feed_once():
    grams = feed()
    h1, h2 = get_dual_distance()
    timestamp = datetime.now().isoformat()
    return {
        "timestamp": timestamp,
        "pet_id": "4bec8a69-6190-4094-b506-73aacd47e562", # 如果沒登入，可設為 demo 預設值
        "amount": 10,                   # 對應為 angle 傳給前端
        "height_waste": h1,               # 廚餘重量 = 廚餘感測距離 h1
        "height_feed": h2,                # 飼料剩餘高度 = h2
        "power": 3.7,                     # 可選：電池電量（假設）
        "food_type": "default_food",
        "calories": grams * 2             # 可選：熱量估算
    }

def feed_until_target(target_grams):
    feed_until_weight(target_grams)
    h1, h2 = get_dual_distance()
    grams = get_filtered_weight()
    timestamp = datetime.now().isoformat()
    return {
        "timestamp": timestamp,
        "pet_id": "4bec8a69-6190-4094-b506-73aacd47e562", # 如果沒登入，可設為 demo 預設值
        "amount": target_grams,                   # 對應為 angle 傳給前端
        "height_waste": h1,               # 廚餘重量 = 廚餘感測距離 h1
        "height_feed": h2,                # 飼料剩餘高度 = h2
        "power": 3.7,                     # 可選：電池電量（假設）
        "food_type": "default_food",
        "calories": grams * 2             # 可選：熱量估算
    }

def check_status():
    grams = get_filtered_weight()
    h1, h2 = get_dual_distance()
    timestamp = datetime.now().isoformat()
    return {
        "timestamp": timestamp,
        "pet_id": "4bec8a69-6190-4094-b506-73aacd47e562", # 如果沒登入，可設為 demo 預設值
        "angle": grams,                   # 對應為 angle 傳給前端
        "height_waste": h1,               # 廚餘重量 = 廚餘感測距離 h1
        "height_feed": h2,                # 飼料剩餘高度 = h2

    }
def open_gate():
    open_waste_gate()
    return {
        "status": "gate_opened"
    }

def close_gate():
    close_waste_gate()
    return {
        "status": "gate_closed"
    }

def schedule_feeding(datetime_str, grams):
    '''
    datetime_str: "YYYY-MM-DD HH:MM" 格式
    grams: 餵食重量
    '''
    global scheduled_task, scheduled_info
    cancel_scheduled_feeding()  # 先取消舊任務
    try:
        target_time = time.strptime(datetime_str, "%Y-%m-%d %H:%M")
        now_sec = time.time()
        target_sec = time.mktime(target_time)
        delay = target_sec - now_sec
        
        if delay <= 0:
            # 若時間已過，返回錯誤
            return False
            
        def task():
            feed_until_target(grams)
            # 餵食後自動清除排程
            cancel_scheduled_feeding()
            
        scheduled_task = threading.Timer(delay, task)
        scheduled_task.start()
        scheduled_info = {"datetime": datetime_str, "grams": grams}
        return True
    except ValueError:
        return False

def cancel_scheduled_feeding():
    global scheduled_task, scheduled_info
    if scheduled_task:
        scheduled_task.cancel()
    scheduled_task = None
    scheduled_info = None

def get_scheduled_feeding():
    global scheduled_info
    return scheduled_info