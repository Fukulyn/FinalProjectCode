from services.feeder_service import feed_once, feed_until_target, check_status, open_gate, close_gate, schedule_feeding, cancel_scheduled_feeding, get_scheduled_feeding
from flask import jsonify
import json
import time
import threading

is_active = False


def get_active_state():
    global is_active
    return is_active

def broadcast_status_loop(mqtt_client, interval=30):
    while True:
        try:
            state = "active" if is_active else "idle"
            data = check_status()
            data["system_status"] = state  # 使用 system_status 欄位
            data["scheduled_feeding"] = get_scheduled_feeding()
            mqtt_client.publish("pet/manager/topic/status", json.dumps(data))
            print(f"[狀態推送] {state} @ {data['timestamp']}")
        except Exception as e:
            print(f"[狀態推送錯誤] {e}")
        time.sleep(interval)

def handle_mqtt_message(client, payload):
    global is_active

    if payload == "start":
        is_active = True
        print("[控制器] 餵食器已啟動")
        client.publish("pet/manager/topic/start", json.dumps({"status": "started"}))

    elif payload == "stop":
        is_active = False
        print("[控制器] 餵食器已停止")
        client.publish("pet/manager/topic/stop", json.dumps({"status": "stopped"}))

    elif payload == "feed":
        if not is_active:
            print("嘗試餵食但系統未啟動")
            client.publish("pet/manager/topic/feeding", json.dumps({
                "status": "error",
                "message": "System not active. Please send 'start' first."
            }))
            return

        result = feed_once()
        client.publish("pet/manager/topic/feeding", json.dumps(result))

    elif payload.startswith("feed_until"):
        if not is_active:
            print("嘗試 feed_until 但系統未啟動")
            client.publish("pet/manager/topic/feed_until", json.dumps({
                "status": "error",
                "message": "System not active. Please send 'start' first."
            }))
            return

        try:
            target = float(payload.split()[1])
            result = feed_until_target(target)
            client.publish("pet/manager/topic/feed_until", json.dumps(result))
        except:
            client.publish("pet/manager/topic/feed_until", json.dumps({
                "status": "error",
                "message": "Invalid command. Usage: feed_until 25"
            }))

    elif payload == "status":
        result = check_status()
        # 添加系統狀態信息
        result["system_status"] = "active" if is_active else "idle"
        result["scheduled_feeding"] = get_scheduled_feeding()
        client.publish("pet/manager/topic/status", json.dumps(result))
        
    elif payload == "open_gate":
        result = open_gate()
        client.publish("pet/manager/topic/open_gate", json.dumps(result))

    elif payload == "close_gate":
        result = close_gate()
        client.publish("pet/manager/topic/close_gate", json.dumps(result))

    elif payload.startswith("schedule_feed"):
        try:
            # 指令格式: schedule_feed YYYY-MM-DD HH:MM grams
            parts = payload.split()
            if len(parts) >= 4:
                _, date_str, time_str, grams = parts[:4]
                datetime_str = f"{date_str} {time_str}"
                grams = float(grams)
                success = schedule_feeding(datetime_str, grams)
                if success:
                    client.publish("pet/manager/topic/schedule_feed", json.dumps({
                        "status": "scheduled",
                        "datetime": datetime_str,
                        "grams": grams
                    }))
                else:
                    client.publish("pet/manager/topic/schedule_feed", json.dumps({
                        "status": "error",
                        "message": "設定時間已過或格式錯誤"
                    }))
            else:
                client.publish("pet/manager/topic/schedule_feed", json.dumps({
                    "status": "error",
                    "message": "指令格式錯誤，應為: schedule_feed YYYY-MM-DD HH:MM grams"
                }))
        except Exception as e:
            client.publish("pet/manager/topic/schedule_feed", json.dumps({
                "status": "error",
                "message": str(e)
            }))
    elif payload == "cancel_schedule":
        cancel_scheduled_feeding()
        client.publish("pet/manager/topic/schedule_feed", json.dumps({
            "status": "cancelled"
        }))

    else:
        client.publish("pet/manager/topic/status", json.dumps({
            "status": "error",
            "message": f"Unknown command: {payload}"
        }))
        
def open_waste():
    result = open_gate()
    return jsonify(result)

def close_waste():
    result = close_gate()
    return jsonify(result)