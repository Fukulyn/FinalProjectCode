"""
純心跳測試程式
只專注於心率檢測，無其他前置測試
"""

from machine import I2C, Pin
import time

class MAX30102:
    """MAX30102 心跳感測器類別"""
    def __init__(self, i2c):
        self.i2c = i2c
        self.ADDRESS = 0x57
        self.REG_MODE_CONFIG = 0x09
        self.REG_SPO2_CONFIG = 0x0A
        self.REG_LED1_PA = 0x0C
        self.REG_LED2_PA = 0x0D
        self.REG_FIFO_WR_PTR = 0x04
        self.REG_FIFO_RD_PTR = 0x06
        self.REG_FIFO_DATA = 0x07
        self.REG_FIFO_CONFIG = 0x08
        
        self.init_sensor()
    
    def write_reg(self, reg_address, data):
        self.i2c.writeto_mem(self.ADDRESS, reg_address, bytes([data]))
    
    def read_reg(self, reg_address):
        return self.i2c.readfrom_mem(self.ADDRESS, reg_address, 1)[0]
    
    def init_sensor(self):
        """初始化感測器"""
        # 軟重置
        self.write_reg(self.REG_MODE_CONFIG, 0x40)
        time.sleep(0.1)
        
        # 清空 FIFO
        self.write_reg(self.REG_FIFO_WR_PTR, 0x00)
        self.write_reg(self.REG_FIFO_RD_PTR, 0x00)
        
        # 配置 FIFO
        self.write_reg(self.REG_FIFO_CONFIG, 0x4F)
        
        # 設置為 SpO2 模式
        self.write_reg(self.REG_MODE_CONFIG, 0x03)
        
        # 配置 SpO2 設置 - 提高採樣率
        self.write_reg(self.REG_SPO2_CONFIG, 0x27)
        
        # 使用較低的 LED 電流，避免飽和
        self.write_reg(self.REG_LED1_PA, 0x08)  # 紅光 LED，8mA
        self.write_reg(self.REG_LED2_PA, 0x08)  # 紅外 LED，8mA
        
        time.sleep(0.1)
    
    def read_fifo(self):
        """讀取 FIFO 數據"""
        try:
            # 檢查 FIFO 是否有數據
            wr_ptr = self.read_reg(self.REG_FIFO_WR_PTR)
            rd_ptr = self.read_reg(self.REG_FIFO_RD_PTR)
            
            if wr_ptr == rd_ptr:
                return 0, 0  # FIFO 為空
            
            # 讀取 6 字節數據
            data = self.i2c.readfrom_mem(self.ADDRESS, self.REG_FIFO_DATA, 6)
            
            # 解析 18-bit 數據
            red = (data[0] << 16 | data[1] << 8 | data[2]) & 0x3FFFF
            ir = (data[3] << 16 | data[4] << 8 | data[5]) & 0x3FFFF
            
            return red, ir
            
        except Exception as e:
            return 0, 0

def apply_bandpass_filter(samples, low_freq=0.5, high_freq=4.0, sample_rate=50):
    """應用帶通濾波器，去除雜訊"""
    if len(samples) < 10:
        return samples
    
    # 簡單的移動平均濾波器
    window_size = 5
    filtered = []
    
    for i in range(len(samples)):
        if i < window_size - 1:
            filtered.append(samples[i])
        else:
            # 使用加權平均
            weights = [0.1, 0.2, 0.4, 0.2, 0.1]
            weighted_sum = sum(samples[i-j] * weights[j] for j in range(window_size))
            filtered.append(weighted_sum)
    
    return filtered

def calculate_heart_rate(ir_samples, time_elapsed):
    """計算心率 - 使用峰值偵測統計處理"""
    if len(ir_samples) < 50 or time_elapsed <= 0:
        return 0
    
    # 應用帶通濾波器
    filtered_samples = apply_bandpass_filter(ir_samples)
    
    # 動態閾值計算
    min_val = min(filtered_samples)
    max_val = max(filtered_samples)
    signal_range = max_val - min_val
    
    if signal_range < 1000:  # 信號變化太小
        return 0
    
    # 使用多個閾值進行峰值檢測
    threshold_high = min_val + signal_range * 0.7
    threshold_low = min_val + signal_range * 0.5
    
    # 尋找峰值
    peaks = []
    min_peak_distance = max(8, int(len(filtered_samples) / 20))
    last_peak = -min_peak_distance - 1
    
    for i in range(2, len(filtered_samples) - 2):
        current = filtered_samples[i]
        prev1 = filtered_samples[i-1]
        prev2 = filtered_samples[i-2]
        next1 = filtered_samples[i+1]
        next2 = filtered_samples[i+2]
        
        # 峰值條件
        if (current > threshold_high and 
            current > prev1 and current > prev2 and
            current > next1 and current > next2 and
            i - last_peak > min_peak_distance):
            
            # 檢查峰值質量
            peak_quality = (current - min_val) / signal_range
            if peak_quality > 0.3:
                peaks.append(i)
                last_peak = i
    
    if len(peaks) < 4:  # 需要至少4個峰值進行統計
        return 0
    
    # 計算峰值間距
    intervals = [peaks[i+1] - peaks[i] for i in range(len(peaks)-1)]
    
    if not intervals:
        return 0
    
    # 使用統計方法處理峰值間距
    intervals.sort()
    
    # 計算四分位數
    n = len(intervals)
    q1_idx = n // 4
    q2_idx = n // 2  # 中位數
    q3_idx = 3 * n // 4
    
    q1 = intervals[q1_idx]
    median_interval = intervals[q2_idx]
    q3 = intervals[q3_idx]
    
    # 計算四分位距 (IQR)
    iqr = q3 - q1
    
    # 設定異常值界限
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    # 過濾異常值
    valid_intervals = [iv for iv in intervals if lower_bound <= iv <= upper_bound]
    
    if len(valid_intervals) < 2:
        # 如果過濾後太少，使用原始數據
        valid_intervals = intervals
    
    # 計算統計值
    mean_interval = sum(valid_intervals) / len(valid_intervals)
    median_interval = sorted(valid_intervals)[len(valid_intervals) // 2]
    
    # 計算標準差
    variance = sum((iv - mean_interval) ** 2 for iv in valid_intervals) / len(valid_intervals)
    std_dev = variance ** 0.5
    
    # 檢查變異係數
    cv = std_dev / mean_interval if mean_interval > 0 else 0
    
    # 如果變異係數太大，使用中位數而非平均值
    if cv > 0.25:
        final_interval = median_interval
        method = "中位數"
    else:
        final_interval = mean_interval
        method = "平均值"
    
    # 計算心率
    sample_rate = len(ir_samples) / time_elapsed
    heart_rate = (60 * sample_rate) / final_interval
    
    # 心率範圍檢查
    if heart_rate < 40 or heart_rate > 200:
        return 0
    
    # 返回整數心率
    return int(round(heart_rate))

def calculate_heart_rate_with_stats(ir_samples, time_elapsed):
    """計算心率 - 包含詳細統計信息"""
    if len(ir_samples) < 50 or time_elapsed <= 0:
        return 0, {}
    
    # 應用帶通濾波器
    filtered_samples = apply_bandpass_filter(ir_samples)
    
    # 動態閾值計算
    min_val = min(filtered_samples)
    max_val = max(filtered_samples)
    signal_range = max_val - min_val
    
    if signal_range < 1000:
        return 0, {}
    
    # 尋找峰值
    threshold_high = min_val + signal_range * 0.7
    peaks = []
    min_peak_distance = max(8, int(len(filtered_samples) / 20))
    last_peak = -min_peak_distance - 1
    
    for i in range(2, len(filtered_samples) - 2):
        current = filtered_samples[i]
        prev1 = filtered_samples[i-1]
        prev2 = filtered_samples[i-2]
        next1 = filtered_samples[i+1]
        next2 = filtered_samples[i+2]
        
        if (current > threshold_high and 
            current > prev1 and current > prev2 and
            current > next1 and current > next2 and
            i - last_peak > min_peak_distance):
            
            peak_quality = (current - min_val) / signal_range
            if peak_quality > 0.3:
                peaks.append(i)
                last_peak = i
    
    if len(peaks) < 4:
        return 0, {}
    
    # 計算峰值間距
    intervals = [peaks[i+1] - peaks[i] for i in range(len(peaks)-1)]
    
    if not intervals:
        return 0, {}
    
    # 統計處理
    intervals.sort()
    n = len(intervals)
    
    # 計算統計值
    mean_interval = sum(intervals) / n
    median_interval = intervals[n // 2]
    
    # 四分位數
    q1_idx = n // 4
    q3_idx = 3 * n // 4
    q1 = intervals[q1_idx]
    q3 = intervals[q3_idx]
    iqr = q3 - q1
    
    # 標準差
    variance = sum((iv - mean_interval) ** 2 for iv in intervals) / n
    std_dev = variance ** 0.5
    
    # 變異係數
    cv = std_dev / mean_interval if mean_interval > 0 else 0
    
    # 過濾異常值
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    valid_intervals = [iv for iv in intervals if lower_bound <= iv <= upper_bound]
    
    if len(valid_intervals) < 2:
        valid_intervals = intervals
    
    # 最終間距選擇
    if cv > 0.25:
        final_interval = median_interval
        method = "中位數"
    else:
        final_interval = sum(valid_intervals) / len(valid_intervals)
        method = "平均值"
    
    # 計算心率
    sample_rate = len(ir_samples) / time_elapsed
    heart_rate = (60 * sample_rate) / final_interval
    
    if heart_rate < 40 or heart_rate > 200:
        return 0, {}
    
    # 返回心率和統計信息
    stats = {
        'peak_count': len(peaks),
        'interval_count': len(intervals),
        'valid_intervals': len(valid_intervals),
        'mean_interval': mean_interval,
        'median_interval': median_interval,
        'std_dev': std_dev,
        'cv': cv,
        'method': method,
        'signal_range': signal_range,
        'q1': q1,
        'q3': q3,
        'iqr': iqr
    }
    
    return int(round(heart_rate)), stats

def main():
    """主函數 - 直接開始心跳測試"""
    print("=== 心跳測試 (峰值統計版) ===")
    print("使用峰值偵測統計處理，提高精度")
    print("請將手指放在感測器上，保持靜止...")
    print("按 Ctrl+C 停止測試\n")
    
    # 初始化 I2C 和感測器
    i2c = I2C(0, scl=Pin(44), sda=Pin(43), freq=400000)
    sensor = MAX30102(i2c)
    
    # 開始心跳監測
    ir_samples = []
    start_time = time.time()
    sample_count = 0
    last_display_time = 0
    display_interval = 3  # 每 3 秒顯示一次
    last_hr = 0
    hr_history = []
    
    try:
        while True:
            red, ir = sensor.read_fifo()
            sample_count += 1
            current_time = time.time()
            
            # 收集有效樣本
            if red > 1000 and ir > 1000:
                ir_samples.append(ir)
                
                # 每 3 秒顯示一次狀態
                if current_time - last_display_time >= display_interval:
                    print(f"樣本 {sample_count}: Red={red}, IR={ir}")
                    
                    # 計算心率
                    if len(ir_samples) >= 50:
                        elapsed_time = time.time() - start_time
                        hr, stats = calculate_heart_rate_with_stats(ir_samples, elapsed_time)
                        
                        if hr > 0:
                            # 使用移動平均來穩定心率顯示
                            hr_history.append(hr)
                            if len(hr_history) > 5:
                                hr_history.pop(0)
                            
                            stable_hr = int(sum(hr_history) / len(hr_history))
                            
                            # 顯示心率和統計信息
                            print(f"✓ 心率: {stable_hr} BPM")
                            print(f"   峰值數: {stats['peak_count']}, 間距數: {stats['interval_count']}")
                            print(f"   方法: {stats['method']}, 變異係數: {stats['cv']:.3f}")
                            
                            # 檢查心率變化
                            if last_hr > 0:
                                hr_change = abs(stable_hr - last_hr)
                                if hr_change > 20:
                                    print(f"⚠️  心率變化過大: {last_hr} → {stable_hr} BPM")
                            
                            last_hr = stable_hr
                        else:
                            print("✗ 無法計算心率，請保持手指靜止")
                    else:
                        print(f"收集樣本中... ({len(ir_samples)}/50)")
                    
                    last_display_time = current_time
                
                # 保持樣本數量在合理範圍內
                if len(ir_samples) > 150:
                    ir_samples = ir_samples[-100:]
                    start_time = time.time()
            
            time.sleep(0.02)  # 50Hz
            
    except KeyboardInterrupt:
        print("\n=== 測試結束 ===")
        if len(ir_samples) >= 50:
            elapsed_time = time.time() - start_time
            final_hr, final_stats = calculate_heart_rate_with_stats(ir_samples, elapsed_time)
            if final_hr > 0:
                print(f"最終心率: {final_hr} BPM")
                print(f"樣本數: {len(ir_samples)}")
                print(f"信號範圍: {min(ir_samples)} - {max(ir_samples)}")
                print(f"峰值數: {final_stats['peak_count']}")
                print(f"計算方法: {final_stats['method']}")
                print(f"變異係數: {final_stats['cv']:.3f}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n測試結束")
    except Exception as e:
        print(f"錯誤: {e}") 