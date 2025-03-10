from machine import I2C, Pin
import time

# 初始化I2C
i2c = I2C(0, scl=Pin(44), sda=Pin(43), freq=400000)
MAX30102_ADDRESS = 0x57

# MAX30102寄存器地址
REG_INTR_STATUS_1 = 0x00
REG_INTR_STATUS_2 = 0x01
REG_INTR_ENABLE_1 = 0x02
REG_FIFO_WR_PTR = 0x04
REG_OVF_COUNTER = 0x05
REG_FIFO_RD_PTR = 0x06
REG_FIFO_DATA = 0x07
REG_FIFO_CONFIG = 0x08
REG_MODE_CONFIG = 0x09
REG_SPO2_CONFIG = 0x0A
REG_LED1_PA = 0x0C
REG_LED2_PA = 0x0D
REG_PILOT_PA = 0x10
REG_MULTI_LED_CTRL1 = 0x11
REG_MULTI_LED_CTRL2 = 0x12
REG_TEMP_INTR = 0x1F
REG_TEMP_FRAC = 0x20
REG_TEMP_CONFIG = 0x21
REG_REV_ID = 0xFE
REG_PART_ID = 0xFF

def write_reg(reg_address, data):
    i2c.writeto_mem(MAX30102_ADDRESS, reg_address, bytes([data]))
    
def read_reg(reg_address):
    return i2c.readfrom_mem(MAX30102_ADDRESS, reg_address, 1)[0]

def init_max30102():
    # 重置所有寄存器
    write_reg(REG_MODE_CONFIG, 0x40)
    time.sleep(0.1)
    
    # 設定FIFO配置
    # 樣本平均 = 8
    # FIFO幾乎滿 = 17個樣本
    write_reg(REG_FIFO_CONFIG, 0x5F)
    
    # 模式配置 - SpO2模式
    write_reg(REG_MODE_CONFIG, 0x03)
    
    # SpO2配置
    # ADC範圍 = 4096nA
    # 採樣率 = 400Hz
    # LED脈衝寬度 = 411us
    write_reg(REG_SPO2_CONFIG, 0x47)
    
    # LED脈衝幅度配置
    write_reg(REG_LED1_PA, 0x47)  # 紅色LED ~14mA
    write_reg(REG_LED2_PA, 0x47)  # IR LED ~14mA
    
    # 開啟溫度測量
    write_reg(REG_TEMP_CONFIG, 0x01)

def read_temp():
    # 觸發溫度測量
    write_reg(REG_TEMP_CONFIG, 0x01)
    time.sleep(0.1)  # 等待測量完成
    
    # 讀取整數和小數部分
    temp_int = read_reg(REG_TEMP_INTR)
    temp_frac = read_reg(REG_TEMP_FRAC)
    
    # 計算實際溫度
    temperature = temp_int + (temp_frac * 0.0625)
    return temperature

def read_fifo():
    # 讀取6個字節的FIFO數據
    data = i2c.readfrom_mem(MAX30102_ADDRESS, REG_FIFO_DATA, 6)
    
    # 解析紅色和紅外LED數據
    red_led = (data[0] << 16 | data[1] << 8 | data[2]) 
    ir_led = (data[3] << 16 | data[4] << 8 | data[5])
    
    return red_led, ir_led

def calculate_spo2(red_samples, ir_samples):
    if len(red_samples) < 100:
        return 0
    
    # 計算DC和AC分量
    red_mean = sum(red_samples) / len(red_samples)
    ir_mean = sum(ir_samples) / len(ir_samples)
    
    red_variance = sum([(x - red_mean) ** 2 for x in red_samples])
    ir_variance = sum([(x - ir_mean) ** 2 for x in ir_samples])
    
    red_rms = (red_variance / len(red_samples)) ** 0.5
    ir_rms = (ir_variance / len(ir_samples)) ** 0.5
    
    if ir_mean == 0 or red_mean == 0:
        return 0
    
    # 計算R值和SpO2
    r = (red_rms / red_mean) / (ir_rms / ir_mean)
    spo2 = 104 - 17 * r  # 校準公式
    
    return min(max(int(spo2), 0), 100)

def calculate_heart_rate(samples, time_elapsed):
    if len(samples) < 100 or time_elapsed <= 0:
        return 0
    
    # 移動平均濾波
    window_size = 4
    moving_average = []
    for i in range(len(samples) - window_size + 1):
        window_average = sum(samples[i:i+window_size]) / window_size
        moving_average.append(window_average)
    
    # 峰值檢測
    peaks = 0
    last_peak = 0
    peak_times = []
    
    # 動態閾值設定
    threshold = (max(moving_average) + min(moving_average)) / 2
    min_peak_distance = int(len(moving_average) / 8)
    
    for i in range(1, len(moving_average) - 1):
        if (moving_average[i] > threshold and
            moving_average[i] > moving_average[i-1] and
            moving_average[i] > moving_average[i+1]):
            if i - last_peak > min_peak_distance:
                peaks += 1
                last_peak = i
                peak_times.append(i)
    
    if len(peak_times) < 2:
        return 0
    
    # 計算平均心率
    intervals = [peak_times[i+1] - peak_times[i] for i in range(len(peak_times)-1)]
    avg_interval = sum(intervals) / len(intervals)
    
    if avg_interval == 0:
        return 0
    
    # 轉換為BPM
    sample_rate = len(samples) / time_elapsed
    heart_rate = (60 * sample_rate) / avg_interval
    
    return int(heart_rate)

def main():
    print("初始化MAX30102...")
    init_max30102()
    print("開始測量...")
    print("請將手指平穩放在感測器上")
    
    red_samples = []
    ir_samples = []
    start_time = time.time()
    last_print = time.time()
    
    try:
        while True:
            current_time = time.time()
            red, ir = read_fifo()
            
            # 確認有效數據
            if red > 7000 and ir > 7000:
                red_samples.append(red)
                ir_samples.append(ir)
                
                # 每3秒更新一次數據
                if current_time - last_print >= 3 and len(red_samples) >= 100:
                    elapsed_time = current_time - start_time
                    
                    # 計算生理參數
                    heart_rate = calculate_heart_rate(red_samples, elapsed_time)
                    spo2 = calculate_spo2(red_samples, ir_samples)
                    temp = read_temp()
                    
                    # 顯示結果
                    print("\n" + "="*30)
                    print(f"心率: {heart_rate} BPM")
                    print(f"血氧: {spo2}%")
                    print(f"溫度: {temp:.1f}°C")
                    print("="*30)
                    
                    # 保留部分舊數據以保持連續性
                    red_samples = red_samples[-50:]
                    ir_samples = ir_samples[-50:]
                    start_time = current_time
                    last_print = current_time
            
            time.sleep(0.01)
            
    except KeyboardInterrupt:
        print("\n程序已停止")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"發生錯誤: {e}")