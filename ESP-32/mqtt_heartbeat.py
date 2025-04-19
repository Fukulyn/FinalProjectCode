from machine import I2C, Pin
import network
import ujson
import time
import sys
import random
from umqtt.simple import MQTTClient

# 初始化 I2C
i2c = I2C(0, scl=Pin(44), sda=Pin(43), freq=400000)
MAX30102_ADDRESS = 0x57

# MAX30102 寄存器地址
REG_INTR_STATUS_1 = 0x00
REG_INTR_ENABLE_1 = 0x02
REG_FIFO_WR_PTR = 0x04
REG_FIFO_RD_PTR = 0x06
REG_FIFO_DATA = 0x07
REG_FIFO_CONFIG = 0x08
REG_MODE_CONFIG = 0x09
REG_SPO2_CONFIG = 0x0A
REG_LED1_PA = 0x0C
REG_LED2_PA = 0x0D
REG_TEMP_CONFIG = 0x21
REG_PART_ID = 0xFF

# 寫入寄存器
def write_reg(reg_address, data):
    i2c.writeto_mem(MAX30102_ADDRESS, reg_address, bytes([data]))

# 讀取寄存器
def read_reg(reg_address):
    return i2c.readfrom_mem(MAX30102_ADDRESS, reg_address, 1)[0]

# 初始化 MAX30102
def init_max30102():
    write_reg(REG_MODE_CONFIG, 0x40)  # 重置
    time.sleep(0.1)
    write_reg(REG_FIFO_CONFIG, 0x0F)  # 樣本平均 = 1
    write_reg(REG_MODE_CONFIG, 0x03)  # SpO2 模式
    write_reg(REG_SPO2_CONFIG, 0x27)  # 100Hz, 411us pulse
    write_reg(REG_LED1_PA, 0x24)      # 紅色 LED 強度
    write_reg(REG_LED2_PA, 0x24)      # IR LED 強度
    write_reg(REG_TEMP_CONFIG, 0x01)  # 啟用溫度測量

# 讀取溫度
def read_temp():
    write_reg(REG_TEMP_CONFIG, 0x01)
    time.sleep(0.1)
    temp_int = read_reg(0x1F)
    temp_frac = read_reg(0x20)
    return temp_int + (temp_frac * 0.0625)

# 讀取 FIFO 數據
def read_fifo():
    data = i2c.readfrom_mem(MAX30102_ADDRESS, REG_FIFO_DATA, 6)
    red = (data[0] << 16 | data[1] << 8 | data[2]) & 0x3FFFF
    ir = (data[3] << 16 | data[4] << 8 | data[5]) & 0x3FFFF
    return red, ir

# 移動平均濾波器
def moving_average(data, window_size=5):
    if len(data) < window_size:
        return data
    smoothed = []
    for i in range(len(data) - window_size + 1):
        window = data[i:i + window_size]
        smoothed.append(sum(window) / window_size)
    return smoothed

# 計算血氧濃度 (SpO2)
def calculate_spo2(red_samples, ir_samples):
    if len(red_samples) < 100 or len(ir_samples) < 100:
        return 0
    
    red_avg = sum(red_samples) / len(red_samples)
    ir_avg = sum(ir_samples) / len(ir_samples)
    
    if red_avg == 0 or ir_avg == 0:
        return 0
    
    red_ac = max(red_samples) - min(red_samples)
    ir_ac = max(ir_samples) - min(ir_samples)
    r = (red_ac / red_avg) / (ir_ac / ir_avg)
    spo2 = 110 - 25 * r  # 簡化公式，可能需校準
    return min(max(int(spo2), 0), 100)

# 計算心跳
def calculate_heart_rate(ir_samples, time_elapsed):
    if len(ir_samples) < 100 or time_elapsed <= 0:
        return 0
    
    # 平滑數據
    smoothed = moving_average(ir_samples, window_size=5)
    
    # 檢測峰值
    peaks = []
    threshold = (max(smoothed) + min(smoothed)) / 2
    min_peak_distance = int(len(smoothed) / 10)
    last_peak = -min_peak_distance - 1
    
    for i in range(1, len(smoothed) - 1):
        if (smoothed[i] > threshold and 
            smoothed[i] > smoothed[i-1] and 
            smoothed[i] > smoothed[i+1] and 
            i - last_peak > min_peak_distance):
            peaks.append(i)
            last_peak = i
    
    if len(peaks) < 2:
        return 0
    
    intervals = [peaks[i+1] - peaks[i] for i in range(len(peaks)-1)]
    avg_interval = sum(intervals) / len(intervals)
    sample_rate = len(ir_samples) / time_elapsed
    heart_rate = (60 * sample_rate) / avg_interval
    return int(heart_rate)

# WiFi 類別
class InitWifi():
    def __init__(self):
        self.ssid = 'S24Ultra'
        self.passwd = '0909025146'
        self.run()
    
    def run(self):
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        if not wlan.isconnected():
            print(' * [通知] 正在連接到WiFi...')
            wlan.connect(self.ssid, self.passwd)
            for _ in range(10):
                if wlan.isconnected():
                    print(f' * [通知] 連接到 {self.ssid} 成功:', wlan.ifconfig())
                    return True
                time.sleep(1)
            print(' * [錯誤] WiFi 連線失敗')
            return False
        return True

# MQTT 類別
class InitMqtt():
    def __init__(self):
        self.host = "broker.emqx.io"
        self.port = 1883
        self.topic = "pet/manager/topic/collar"
        self.client_id = f'esp-p-{random.randint(0, 1000)}'
        self.user = "petmanager"
        self.pwd = "petmanager"
        
        print("初始化 MAX30102...")
        init_max30102()
        print("開始測量，請將手指平穩放在感測器上...")
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
        red_samples = []
        ir_samples = []
        start_time = time.time()
        
        while True:
            red, ir = read_fifo()
            
            # 檢查是否有有效數據（手指是否放在感測器上）
            if red > 10000 and ir > 10000:  # 調整閾值根據實際情況
                red_samples.append(red)
                ir_samples.append(ir)
                
                if len(red_samples) >= 100:
                    elapsed_time = time.time() - start_time
                    hr = calculate_heart_rate(ir_samples, elapsed_time)
                    spo2 = calculate_spo2(red_samples, ir_samples)
                    temp = read_temp()
                    
                    data = {
                        "device_id": self.client_id,
                        "timestamp": time.time(),
                        "heart_rate": hr,
                        "blood_oxygen": spo2,
                        "temperature": round(temp, 1),
                        "status": "normal" if hr > 0 and spo2 > 0 else "no_signal"
                    }
                    
                    json_msg = ujson.dumps(data)
                    self.client.publish(self.topic, json_msg.encode(), qos=0)
                    print(f" * [通知] 數據: HR={hr}, SpO2={spo2}, Temp={temp}°C")
                    
                    # 保留部分數據以保持連續性
                    red_samples = red_samples[-50:]
                    ir_samples = ir_samples[-50:]
                    start_time = time.time()
            else:
                print(" * [警告] 未檢測到手指，請正確放置")
                red_samples.clear()
                ir_samples.clear()
                start_time = time.time()
            
            time.sleep(0.05)  # 控制採樣頻率

    def run(self):
        if self.connect():
            self.publish()

if __name__ == '__main__':
    try:
        wifi = InitWifi()
        if wifi:
            InitMqtt()
        else:
            sys.exit(-1)
    except Exception as e:
        print(f"發生錯誤: {e}")
        machine.reset()