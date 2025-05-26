from services.feeder_service import feed_once, feed_until_target, check_status
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
            data["status"] = state  # 覆蓋成 active/idle
            mqtt_client.publish("feeder/status", json.dumps(data))
            print(f"[狀態推送] {state} @ {data['timestamp']}")
        except Exception as e:
            print(f"[狀態推送錯誤] {e}")
        time.sleep(interval)

def handle_mqtt_message(client, payload):
    global is_active

    if payload == "start":
        is_active = True
        print("[控制器] 餵食器已啟動")
        client.publish("feeder/status", json.dumps({"status": "started"}))

    elif payload == "stop":
        is_active = False
        print("[控制器] 餵食器已停止")
        client.publish("feeder/status", json.dumps({"status": "stopped"}))

    elif payload == "feed":
        if not is_active:
            print("嘗試餵食但系統未啟動")
            client.publish("feeder/status", json.dumps({
                "status": "error",
                "message": "System not active. Please send 'start' first."
            }))
            return

        result = feed_once()
        client.publish("feeder/status", json.dumps(result))

    elif payload.startswith("feed_until"):
        if not is_active:
            print("嘗試 feed_until 但系統未啟動")
            client.publish("feeder/status", json.dumps({
                "status": "error",
                "message": "System not active. Please send 'start' first."
            }))
            return

        try:
            target = float(payload.split()[1])
            result = feed_until_target(target)
            client.publish("feeder/status", json.dumps(result))
        except:
            client.publish("feeder/status", json.dumps({
                "status": "error",
                "message": "Invalid command. Usage: feed_until 25"
            }))

    elif payload == "status":
        if not is_active:
            print("嘗試 status 但系統未啟動")
            client.publish("feeder/status", json.dumps({
                "status": "error",
                "message": "System not active. Please send 'start' first."
            }))
            return

        result = check_status()
        client.publish("feeder/status", json.dumps(result))

    else:
        client.publish("feeder/status", json.dumps({
            "status": "error",
            "message": f"Unknown command: {payload}"
        }))
