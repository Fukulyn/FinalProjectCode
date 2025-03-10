from machine import Pin, SoftI2C
from time import sleep_ms, ticks_ms
import network
import ujson
import sys
import math
import random
from umqtt.simple import MQTTClient

# MPU6050 類別
class MPU6050:
    def __init__(self, i2c, addr=0x68):
        self.iic = i2c
        self.addr = addr
        
        if addr not in self.iic.scan():
            raise RuntimeError("找不到 MPU6050 設備")
            
        self.iic.writeto_mem(self.addr, 0x6B, b'\x00')
        sleep_ms(100)
    
    def read_raw_data(self, addr):
        h = self.iic.readfrom_mem(self.addr, addr, 1)[0]
        l = self.iic.readfrom_mem(self.addr, addr + 1, 1)[0]
        value = (h << 8) + l
        
        if value >= 0x8000:
            value = -((65535 - value) + 1)
        return value
    
    def get_acceleration(self):
        ax = self.read_raw_data(0x3B) / 16384.0
        ay = self.read_raw_data(0x3D) / 16384.0
        az = self.read_raw_data(0x3F) / 16384.0
        return ax, ay, az

# 計步器類別
class StepCounter:
    def __init__(self):
        self.threshold = 1.5  # 提高閾值
        self.last_magnitude = 0
        self.step_count = 0
        self.last_step_time = ticks_ms()
        self.peak_detected = False
        self.magnitudes = []  # 用於保存最近的加速度值
        
    def calculate_magnitude(self, ax, ay, az):
        return math.sqrt(ax*ax + ay*ay + az*az)
    
    def detect_step(self, ax, ay, az):
        current_time = ticks_ms()
        magnitude = self.calculate_magnitude(ax, ay, az)
        
        # 保存最近的加速度值
        self.magnitudes.append(magnitude)
        if len(self.magnitudes) > 5:  # 保持5個樣本的移動平均
            self.magnitudes.pop(0)
            
        # 計算平均加速度
        avg_magnitude = sum(self.magnitudes) / len(self.magnitudes)
        
        # 檢測峰值，使用更嚴格的條件
        if magnitude > self.threshold and magnitude > avg_magnitude * 1.2 and not self.peak_detected:
            if current_time - self.last_step_time > 500:
                self.step_count += 1
                self.last_step_time = current_time
                self.peak_detected = True
        
        # 重置峰值檢測
        if magnitude < self.threshold * 0.8:
            self.peak_detected = False
            
        self.last_magnitude = magnitude
        return self.step_count

# WiFi 連線類別
class InitWifi:
    def __init__(self):
        self.ssid = "S24Ultra"  # 替換為您的 WiFi SSID
        self.passwd = "0909025146"  # 替換為您的 WiFi 密碼
        self.run()
    
    def run(self):
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        if not wlan.isconnected():
            print(' * [通知] 正在連接到 WiFi...')
            wlan.connect(self.ssid, self.passwd)
            for _ in range(10):
                if wlan.isconnected():
                    print(f' * [通知] 連接到 {self.ssid} 成功:', wlan.ifconfig())
                    return True
                sleep_ms(1000)
            print(' * [錯誤] WiFi 連線失敗')
            return False
        return True

# MQTT 類別（僅處理 MPU6050 數據）
class InitMqtt:
    def __init__(self, i2c_mpu):
        self.host = "broker.emqx.io"
        self.port = 1883
        self.topic = "stepcal"
        self.client_id = f'esp-step-{random.randint(0, 1000)}'
        self.user = "host001"
        self.pwd = "0000"
        self.mpu = MPU6050(i2c_mpu)
        self.step_counter = StepCounter()
        
        print("計步器啟動...")
        self.run()

    def connect(self):
        try:
            self.client = MQTTClient(self.client_id, self.host, self.port, self.user, self.pwd)
            self.client.connect()
            print(" * [通知] 已連接到 MQTT Broker!")
            return True
        except Exception as e:
            print(f' * [錯誤] MQTT 連線失敗: {e}')
            return False

    def publish(self):
        last_steps = 0
        
        while True:
            try:
                ax, ay, az = self.mpu.get_acceleration()
                steps = self.step_counter.detect_step(ax, ay, az)
                
                # 當步數改變時發送數據
                if steps != last_steps:
                    data = {
                        "device_id": self.client_id,
                        "timestamp": ticks_ms(),
                        "steps": steps,
                        "status": "active"
                    }
                    json_msg = ujson.dumps(data)
                    self.client.publish(self.topic, json_msg.encode(), qos=0)
                    print(f" * [通知] 步數: {steps}")
                    last_steps = steps
                
                sleep_ms(20)  # 50Hz 取樣率
                
            except Exception as e:
                print(f" * [錯誤] 運行時錯誤: {e}")
                sleep_ms(1000)

    def run(self):
        if self.connect():
            self.publish()

# 主程式
try:
    # 初始化 WiFi
    wifi = InitWifi()
    if not wifi:
        print(" * [錯誤] WiFi 初始化失敗")
        sys.exit(-1)
    
    # 初始化 MPU6050
    i2c_mpu = SoftI2C(scl=Pin(10), sda=Pin(11), freq=400000)
    
    # 初始化 MQTT 並運行
    mqtt = InitMqtt(i2c_mpu)

except Exception as e:
    print(f" * [錯誤] 初始化錯誤: {e}")
    sys.exit(-1)