from machine import I2C, Pin, SoftI2C
import ujson
import time
import random
from umqtt.simple import MQTTClient
from mpu6050 import MPU6050
from max30102 import MAX30102
from step_counter import StepCounter
from battery_monitor import BatteryMonitor
from health_calculations import calculate_heart_rate, calculate_spo2

class InitMqtt:
    def __init__(self, mpu_scl=10, mpu_sda=11, max_scl=44, max_sda=43, battery_pin=14):
        self.host = "broker.emqx.io"
        self.port = 1883
        self.heart_topic = "pet/manager/topic/collar"
        self.battery_topic = "pet/manager/topic/battery"
        self.client_id = f'esp-device-{random.randint(0, 1000)}'
        self.user = "petmanager"
        self.pwd = "petmanager"
        
        # 初始化 I2C 總線
        self.i2c_mpu = SoftI2C(scl=Pin(mpu_scl), sda=Pin(mpu_sda), freq=400000)
        self.i2c_max = I2C(0, scl=Pin(max_scl), sda=Pin(max_sda), freq=400000)
        
        # 初始化感測器
        self.mpu = MPU6050(self.i2c_mpu)
        self.max30102 = MAX30102(self.i2c_max)
        self.step_counter = StepCounter()
        self.battery = BatteryMonitor(battery_pin)
        
        # 資料收集和發送間隔
        self.last_battery_check = 0
        self.battery_check_interval = 60  # 每 60 秒檢查一次電池
        self.data_send_interval = 5  # 每 5 秒發送一次資料
        self.last_data_send = 0
        
        # 待機狀態控制
        self.standby_timeout = 5  # 3 分鐘（180 秒）無有效數值進入待機
        self.standby_check_interval = 10  # 待機時每 10 秒檢查一次
        self.last_valid_data_time = time.time()  # 最後有效數值時間
        self.is_standby = False  # 是否處於待機狀態
        
        # 資料緩衝區
        self.hr_values = []
        self.spo2_values = []
        self.temp_values = []
        self.last_steps = 0
        self.last_battery_percentage = 0
        
        print("多功能設備啟動...")

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
        red_samples = []
        ir_samples = []
        start_time = time.time()
        
        while True:
            current_time = time.time()
            
            if self.is_standby:
                # 待機狀態：僅檢查電池和恢復條件
                print(" * [通知] 設備處於待機狀態")
                
                # 電池監測
                if current_time - self.last_battery_check >= self.battery_check_interval:
                    percentage, voltage = self.battery.get_percentage()
                    self.last_battery_percentage = percentage
                    battery_data = {
                        "device_id": self.client_id,
                        "timestamp": time.time(),
                        "battery_percent": percentage,
                        "battery_voltage": round(voltage, 2),
                        "status": "normal" if percentage > 20 else "low"
                    }
                    battery_json = ujson.dumps(battery_data)
                    self.client.publish(self.battery_topic, battery_json.encode(), qos=0)
                    print(f" * [通知] 電池狀態: {percentage}%, {voltage:.2f}V")
                    self.last_battery_check = current_time
                
                # 檢查是否恢復（每 10 秒）
                if current_time - self.last_data_send >= self.standby_check_interval:
                    red, ir = self.max30102.read_fifo()
                    ax, ay, az = self.mpu.get_acceleration()
                    steps = self.step_counter.detect_step(ax, ay, az)
                    
                    if (red > 10000 and ir > 10000) or steps != self.last_steps:
                        print(" * [通知] 檢測到有效數值，退出待機狀態")
                        self.is_standby = False
                        self.last_valid_data_time = current_time
                        red_samples = []
                        ir_samples = []
                        start_time = time.time()
                    
                    self.last_data_send = current_time
                
                time.sleep(self.standby_check_interval)
                continue
            
            # 正常狀態：收集和發送資料
            # 心率和血氧監測
            red, ir = self.max30102.read_fifo()
            has_valid_data = False
            
            if red > 10000 and ir > 10000:
                red_samples.append(red)
                ir_samples.append(ir)
                
                if len(red_samples) >= 100:
                    elapsed_time = time.time() - start_time
                    hr = calculate_heart_rate(ir_samples, elapsed_time)
                    spo2 = calculate_spo2(red_samples, ir_samples)
                    temp = self.max30102.read_temp()
                    
                    # 儲存有效值
                    if hr > 40 and hr < 200:
                        self.hr_values = [hr]
                        has_valid_data = True
                    
                    if spo2 > 80 and spo2 <= 100:
                        self.spo2_values = [spo2]
                        has_valid_data = True
                    
                    if temp > 20 and temp < 45:
                        self.temp_values = [temp]
                        has_valid_data = True
                    
                    red_samples = red_samples[-50:]
                    ir_samples = ir_samples[-50:]
                    start_time = time.time()
            else:
                if len(red_samples) > 0 or len(ir_samples) > 0:
                    print(" * [警告] 未檢測到手指，請正確放置")
                    red_samples.clear()
                    ir_samples.clear()
                    start_time = time.time()
            
            # 計步功能
            ax, ay, az = self.mpu.get_acceleration()
            steps = self.step_counter.detect_step(ax, ay, az)
            if steps != self.last_steps:
                has_valid_data = True
            
            # 更新最後有效數值時間
            if has_valid_data:
                self.last_valid_data_time = current_time
            
            # 檢查是否進入待機狀態
            if current_time - self.last_valid_data_time >= self.standby_timeout:
                print(" * [通知] 連續 3 分鐘無有效數值，進入待機狀態")
                self.is_standby = True
                continue
            
            # 檢查是否需要發送資料
            if current_time - self.last_data_send >= self.data_send_interval:
                # 發送健康和步數資料
                if self.hr_values or self.spo2_values or self.temp_values or steps != self.last_steps:
                    hr = self.hr_values[-1] if self.hr_values else 0
                    spo2 = self.spo2_values[-1] if self.spo2_values else 0
                    temp = self.temp_values[-1] if self.temp_values else 0
                    
                    health_data = {
                        "pet_id": "74301fcb-5756-4c3f-ae21-810443342bb6",
                        "temperature": round(temp, 1),
                        "heart_rate": hr,
                        "oxygen_level": round(spo2, 1),
                        "steps": steps,
                        "power": self.last_battery_percentage
                    }
                    
                    health_json = ujson.dumps(health_data)
                    self.client.publish(self.heart_topic, health_json.encode(), qos=0)
                    print(f" * [通知] 健康數據: HR={hr}, SpO2={spo2}, Temp={temp}°C, Steps={steps}, Power={self.last_battery_percentage}%")
                    
                    # 清空緩衝區
                    self.hr_values = []
                    self.spo2_values = []
                    self.temp_values = []
                    self.last_steps = steps
                
                self.last_data_send = current_time
            
            # 電池監測
            if current_time - self.last_battery_check >= self.battery_check_interval:
                percentage, voltage = self.battery.get_percentage()
                self.last_battery_percentage = percentage
                battery_data = {
                    "device_id": self.client_id,
                    "timestamp": time.time(),
                    "battery_percent": percentage,
                    "battery_voltage": round(voltage, 2),
                    "status": "normal" if percentage > 20 else "low"
                }
                battery_json = ujson.dumps(battery_data)
                self.client.publish(self.battery_topic, battery_json.encode(), qos=0)
                print(f" * [通知] 電池狀態: {percentage}%, {voltage:.2f}V")
                self.last_battery_check = current_time
            
            time.sleep(0.02)

    def run(self):
        if self.connect():
            self.publish()