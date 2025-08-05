"""
心跳模組測試腳本
用於調試和驗證 MAX30102 心跳感測器的功能
"""

from machine import I2C, Pin
import time

# 導入 MAX30102 模組
from max30102 import MAX30102

def test_heart_rate():
    """測試心跳模組"""
    print("=== MAX30102 心跳模組測試 ===")
    
    # 初始化 I2C
    try:
        # 使用與主程式相同的 I2C 配置
        i2c = I2C(0, scl=Pin(44), sda=Pin(43), freq=400000)
        print(" * [通知] I2C 初始化成功")
        
        # 掃描 I2C 設備
        devices = i2c.scan()
        print(f" * [調試] 發現的 I2C 設備: {[hex(addr) for addr in devices]}")
        
        if 0x57 not in devices:
            print(" * [錯誤] 未找到 MAX30102 設備 (地址 0x57)")
            print(" * [提示] 請檢查接線：")
            print("   - SCL 連接到 GPIO 44")
            print("   - SDA 連接到 GPIO 43")
            print("   - VCC 連接到 3.3V")
            print("   - GND 連接到 GND")
            return False
        
    except Exception as e:
        print(f" * [錯誤] I2C 初始化失敗: {e}")
        return False
    
    # 初始化 MAX30102
    try:
        sensor = MAX30102(i2c)
        print(" * [通知] MAX30102 初始化成功")
    except Exception as e:
        print(f" * [錯誤] MAX30102 初始化失敗: {e}")
        return False
    
    # 測試信號讀取
    print("\n=== 開始信號測試 ===")
    print("請將手指放在感測器上，保持靜止...")
    print("按 Ctrl+C 停止測試\n")
    
    sample_count = 0
    red_samples = []
    ir_samples = []
    start_time = time.time()
    last_display_time = 0
    display_interval = 5  # 每 5 秒顯示一次
    
    try:
        while True:
            red, ir = sensor.read_fifo()
            sample_count += 1
            current_time = time.time()
            
            # 每 5 秒顯示一次統計
            if current_time - last_display_time >= display_interval:
                signal_quality = sensor.get_signal_quality(red, ir)
                print(f"樣本 {sample_count}: Red={red}, IR={ir}, 質量={signal_quality}")
                last_display_time = current_time
                
                if red > 500 and ir > 500:
                    red_samples.append(red)
                    ir_samples.append(ir)
                    
                    # 每 100 個有效樣本顯示統計
                    if len(red_samples) % 100 == 0:
                        red_avg = sum(red_samples[-100:]) / 100
                        ir_avg = sum(ir_samples[-100:]) / 100
                        red_var = max(red_samples[-100:]) - min(red_samples[-100:])
                        ir_var = max(ir_samples[-100:]) - min(ir_samples[-100:])
                        
                        print(f"  最近 100 樣本統計:")
                        print(f"    Red 平均值: {red_avg:.0f}, 變化範圍: {red_var}")
                        print(f"    IR 平均值: {ir_avg:.0f}, 變化範圍: {ir_var}")
                        
                        # 簡單的心率估算
                        if ir_var > 1000:  # 有明顯的脈動
                            print(f"    ✓ 檢測到脈動信號")
                        else:
                            print(f"    ✗ 脈動信號不明顯")
            
            time.sleep(0.02)  # 50Hz
            
    except KeyboardInterrupt:
        print("\n\n=== 測試結束 ===")
        print(f"總樣本數: {sample_count}")
        print(f"有效樣本數: {len(red_samples)}")
        
        if len(red_samples) > 0:
            print(f"Red 信號範圍: {min(red_samples)} - {max(red_samples)}")
            print(f"IR 信號範圍: {min(ir_samples)} - {max(ir_samples)}")
            
            # 計算信號變化
            if len(red_samples) >= 100:
                red_changes = [abs(red_samples[i] - red_samples[i-1]) for i in range(1, len(red_samples))]
                ir_changes = [abs(ir_samples[i] - ir_samples[i-1]) for i in range(1, len(ir_samples))]
                
                avg_red_change = sum(red_changes) / len(red_changes)
                avg_ir_change = sum(ir_changes) / len(ir_changes)
                
                print(f"Red 平均變化: {avg_red_change:.0f}")
                print(f"IR 平均變化: {avg_ir_change:.0f}")
                
                if avg_ir_change > 500:
                    print("✓ 信號變化足夠，適合心率檢測")
                else:
                    print("✗ 信號變化不足，請調整手指位置或增加 LED 亮度")
        
        return True

def test_temperature():
    """測試溫度讀取"""
    print("\n=== 溫度測試 ===")
    
    try:
        i2c = I2C(0, scl=Pin(44), sda=Pin(43), freq=400000)
        sensor = MAX30102(i2c)
        
        for i in range(5):
            temp = sensor.read_temp()
            print(f"溫度讀數 {i+1}: {temp:.2f}°C")
            time.sleep(1)
            
    except Exception as e:
        print(f" * [錯誤] 溫度測試失敗: {e}")

if __name__ == "__main__":
    try:
        # 運行心跳測試
        if test_heart_rate():
            # 運行溫度測試
            test_temperature()
        
        print("\n=== 測試完成 ===")
        print("如果信號質量良好，您應該能在主程式中看到有效的心跳數據")
        
    except Exception as e:
        print(f" * [錯誤] 測試過程中發生錯誤: {e}") 