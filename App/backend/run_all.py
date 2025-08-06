import subprocess
import os

# 切換工作目錄到 backend 目錄
os.chdir(os.path.dirname(__file__))

# 使用絕對路徑呼叫三個 Python 腳本
subprocess.Popen(["python", "mqtt_collar_client.py"])
subprocess.Popen(["python", "mqtt_feeding_client.py"])
subprocess.Popen(["python", "mqtt_status_client.py"])
