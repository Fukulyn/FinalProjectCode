"""
簡單的心跳模組測試腳本
用於快速驗證 MAX30102 是否正常工作
"""

from machine import I2C, Pin
import time

def test_max30102():
    """測試 MAX30102 基本功能"""
    print("=== MAX30102 快速測試 ===")
    
    try:
        # 初始化 I2C
        i2c = I2C(0, scl=Pin(44), sda=Pin(43), freq=400000)
        print("✓ I2C 初始化成功")
        
        # 掃描設備
        devices = i2c.scan()
        print(f"發現的 I2C 設備: {[hex(addr) for addr in devices]}")
        
        if 0x57 not in devices:
            print("✗ 未找到 MAX30102 (地址 0x57)")
            return False
        
        print("✓ 找到 MAX30102 設備")
        
        # 測試基本讀取
        print("\n開始信號測試...")
        print("請將手指放在感測器上")
        
        # 簡單的 FIFO 讀取測試
        start_time = time.time()
        last_display_time = 0
        display_interval = 5  # 每 5 秒顯示一次
        
        for i in range(100):
            try:
                # 讀取 FIFO 數據
                data = i2c.readfrom_mem(0x57, 0x07, 6)
                red = (data[0] << 16 | data[1] << 8 | data[2]) & 0x3FFFF
                ir = (data[3] << 16 | data[4] << 8 | data[5]) & 0x3FFFF
                
                current_time = time.time()
                # 每 5 秒顯示一次
                if current_time - last_display_time >= display_interval:
                    print(f"樣本 {i}: Red={red}, IR={ir}")
                    last_display_time = current_time
                
                if red > 1000 and ir > 1000:
                    print(f"✓ 檢測到有效信號: Red={red}, IR={ir}")
                    return True
                    
            except Exception as e:
                print(f"讀取錯誤: {e}")
                return False
            
            time.sleep(0.02)
        
        print("✗ 未檢測到有效信號")
        return False
        
    except Exception as e:
        print(f"測試失敗: {e}")
        return False

if __name__ == "__main__":
    if test_max30102():
        print("\n✓ 心跳模組測試通過！")
        print("現在可以運行主程式了")
    else:
        print("\n✗ 心跳模組測試失敗")
        print("請檢查接線和感測器") 