from modules.servo import feed, feed_until_weight, open_waste_gate, close_waste_gate
from modules.sensor_dual import get_dual_distance
from modules.scale import get_filtered_weight
from datetime import datetime

def feed_once():
    grams = feed()
    h1, h2 = get_dual_distance()
    timestamp = datetime.now().isoformat()
    return {
        "timestamp": timestamp,
        "pet_id": "43c23d4a-4235-4395-8384-73dbdd7a7ad8", # 如果沒登入，可設為 demo 預設值
        "angle": 45,                   # 對應為 angle 傳給前端
        "height_waste": h1,               # 廚餘重量 = 廚餘感測距離 h1
        "height_feed": h2,                # 飼料剩餘高度 = h2
        "power": 3.7,                     # 可選：電池電量（假設）
        "food_type": "default_food",
        "calories": grams * 2             # 可選：熱量估算
    }

def feed_until_target(target_grams):
    feed_until_weight(target_grams)
    h1, h2 = get_dual_distance()
    final = get_filtered_weight()
    return {
        "status": "fed_until",
        "target": target_grams,
        "actual": final,
        "height_feed": h2,
        "height_waste": h1
    }

def check_status():
    grams = get_filtered_weight()
    h1, h2 = get_dual_distance()
    timestamp = datetime.now().isoformat()
    return {
        "timestamp": timestamp,
        "pet_id": "43c23d4a-4235-4395-8384-73dbdd7a7ad8", # 如果沒登入，可設為 demo 預設值
        "angle": grams,                   # 對應為 angle 傳給前端
        "height_waste": h1,               # 廚餘重量 = 廚餘感測距離 h1
        "height_feed": h2,                # 飼料剩餘高度 = h2
        "power": 3.7,                     # 可選：電池電量（假設）
        "food_type": "default_food",
        "calories": grams * 2             # 可選：熱量估算
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