from machine import Pin, SoftI2C
from time import sleep_ms, ticks_ms
import math

class MPU6050:
    def __init__(self, i2c, addr=0x68):
        self.iic = i2c
        self.addr = addr
        
        if addr not in self.iic.scan():
            raise RuntimeError("找不到MPU6050設備")
            
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
            # 增加步伐間隔時間到500ms
            if current_time - self.last_step_time > 500:
                self.step_count += 1
                self.last_step_time = current_time
                self.peak_detected = True
        
        # 重置峰值檢測，使用更低的閾值
        if magnitude < self.threshold * 0.8:
            self.peak_detected = False
            
        self.last_magnitude = magnitude
        return self.step_count

try:
    i2c = SoftI2C(scl=Pin(10), sda=Pin(11), freq=400000)
    mpu = MPU6050(i2c)
    step_counter = StepCounter()
    
    print("計步器啟動...")
    last_count = 0
    
    while True:
        try:
            ax, ay, az = mpu.get_acceleration()
            steps = step_counter.detect_step(ax, ay, az)
            
            # 當步數改變時才輸出
            if steps != last_count:
                print(f"步數: {steps}")
                last_count = steps
                
            sleep_ms(20)  # 降低取樣頻率到50Hz
            
        except Exception as e:
            print("錯誤:", e)
            sleep_ms(1000)

except Exception as e:
    print("初始化錯誤:", e)