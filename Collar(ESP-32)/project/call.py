import sys
import time
from project.wifi import InitWifi
from project.mqtt_client import InitMqtt

def main():
    # WiFi 和 MQTT 配置
    wifi_config = {
        "ssid": "S24Ultra",
        "passwd": "0909025146"
    }
    mqtt_config = {
        "mpu_scl": 10,
        "mpu_sda": 11,
        "max_scl": 44,
        "max_sda": 43,
        "battery_pin": 14
    }
    max_retries = 3
    retry_delay = 5  # 秒

    # 初始化 WiFi
    for attempt in range(max_retries):
        try:
            wifi = InitWifi(**wifi_config)
            if wifi.run():
                print(" * [通知] WiFi 初始化成功")
                break
            else:
                print(f" * [警告] WiFi 初始化失敗，嘗試 {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    print(" * [錯誤] 無法連接到 WiFi，退出")
                    sys.exit(-1)
        except Exception as e:
            print(f" * [錯誤] WiFi 初始化錯誤: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                print(" * [錯誤] WiFi 重試次數耗盡，退出")
                sys.exit(-1)

    # 初始化 MQTT
    for attempt in range(max_retries):
        try:
            mqtt = InitMqtt(**mqtt_config)
            mqtt.run()
            break  # run 是一個阻塞呼叫
        except Exception as e:
            print(f" * [錯誤] MQTT 初始化錯誤: {e}")
            if attempt < max_retries - 1:
                print(f" * [通知] 正在重試 MQTT 初始化，嘗試 {attempt + 1}/{max_retries}")
                time.sleep(retry_delay)
            else:
                print(" * [錯誤] MQTT 重試次數耗盡，退出")
                sys.exit(-1)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(" * [通知] 用戶中斷程式")
        sys.exit(0)
    except Exception as e:
        print(f" * [錯誤] 主程式錯誤: {e}")
        sys.exit(-1)