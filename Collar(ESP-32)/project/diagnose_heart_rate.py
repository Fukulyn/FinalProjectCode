"""
心跳模組診斷腳本
用於詳細診斷 MAX30102 的問題
"""

from machine import I2C, Pin
import time

def diagnose_max30102():
    """詳細診斷 MAX30102"""
    print("=== MAX30102 詳細診斷 ===")
    
    try:
        # 1. 檢查 I2C 連接
        print("\n1. 檢查 I2C 連接...")
        i2c = I2C(0, scl=Pin(44), sda=Pin(43), freq=400000)
        print("✓ I2C 初始化成功")
        
        # 2. 掃描 I2C 設備
        print("\n2. 掃描 I2C 設備...")
        devices = i2c.scan()
        print(f"發現的設備: {[hex(addr) for addr in devices]}")
        
        if 0x57 not in devices:
            print("✗ 未找到 MAX30102 (地址 0x57)")
            print("請檢查接線：")
            print("  SCL → GPIO 44")
            print("  SDA → GPIO 43")
            print("  VCC → 3.3V")
            print("  GND → GND")
            return False
        
        print("✓ 找到 MAX30102 設備")
        
        # 3. 檢查 Part ID
        print("\n3. 檢查 Part ID...")
        try:
            part_id = i2c.readfrom_mem(0x57, 0xFF, 1)[0]
            print(f"Part ID: 0x{part_id:02X}")
            if part_id == 0x15:
                print("✓ Part ID 正確")
            else:
                print(f"✗ Part ID 不正確，預期 0x15，實際 0x{part_id:02X}")
                return False
        except Exception as e:
            print(f"✗ 無法讀取 Part ID: {e}")
            return False
        
        # 4. 測試寄存器讀寫
        print("\n4. 測試寄存器讀寫...")
        try:
            # 測試寫入和讀取
            test_value = 0x03
            i2c.writeto_mem(0x57, 0x09, bytes([test_value]))
            read_value = i2c.readfrom_mem(0x57, 0x09, 1)[0]
            print(f"寫入: 0x{test_value:02X}, 讀取: 0x{read_value:02X}")
            if read_value == test_value:
                print("✓ 寄存器讀寫正常")
            else:
                print("✗ 寄存器讀寫異常")
                return False
        except Exception as e:
            print(f"✗ 寄存器測試失敗: {e}")
            return False
        
        # 5. 初始化感測器
        print("\n5. 初始化感測器...")
        try:
            # 軟重置
            i2c.writeto_mem(0x57, 0x09, bytes([0x40]))
            time.sleep(0.1)
            
            # 設置 LED 電流到最大
            i2c.writeto_mem(0x57, 0x0C, bytes([0x3F]))  # 紅光 LED
            i2c.writeto_mem(0x57, 0x0D, bytes([0x3F]))  # 紅外 LED
            
            # 設置為 SpO2 模式
            i2c.writeto_mem(0x57, 0x09, bytes([0x03]))
            
            print("✓ 感測器初始化完成")
        except Exception as e:
            print(f"✗ 初始化失敗: {e}")
            return False
        
        # 6. 測試信號讀取
        print("\n6. 測試信號讀取...")
        print("請將手指放在感測器上，保持靜止...")
        print("按 Ctrl+C 停止測試\n")
        
        sample_count = 0
        valid_samples = 0
        start_time = time.time()
        
        try:
            while True:
                try:
                    # 讀取 FIFO 數據
                    data = i2c.readfrom_mem(0x57, 0x07, 6)
                    red = (data[0] << 16 | data[1] << 8 | data[2]) & 0x3FFFF
                    ir = (data[3] << 16 | data[4] << 8 | data[5]) & 0x3FFFF
                    
                    sample_count += 1
                    
                    # 每 5 秒顯示統計
                    if sample_count % 250 == 0:  # 250 次讀取約等於 5 秒
                        elapsed_time = time.time() - start_time
                        print(f"樣本 {sample_count}: Red={red}, IR={ir}")
                        print(f"有效樣本: {valid_samples}/{sample_count} ({valid_samples/sample_count*100:.1f}%)")
                        print(f"運行時間: {elapsed_time:.1f}秒")
                        
                        if red > 100 and ir > 100:
                            valid_samples += 1
                            print("✓ 檢測到有效信號")
                        else:
                            print("✗ 信號太弱")
                        
                        print("-" * 40)
                    
                    if red > 100 and ir > 100:
                        valid_samples += 1
                    
                    time.sleep(0.02)
                    
                except Exception as e:
                    print(f"讀取錯誤: {e}")
                    time.sleep(0.1)
                    
        except KeyboardInterrupt:
            print("\n\n=== 診斷結果 ===")
            print(f"總樣本數: {sample_count}")
            print(f"有效樣本數: {valid_samples}")
            print(f"有效率: {valid_samples/sample_count*100:.1f}%" if sample_count > 0 else "無數據")
            
            if valid_samples > 0:
                print("✓ 感測器工作正常")
                return True
            else:
                print("✗ 未檢測到有效信號")
                print("\n建議：")
                print("1. 檢查手指放置位置")
                print("2. 調整按壓力度")
                print("3. 確保環境光線適中")
                print("4. 清潔感測器表面")
                return False
        
    except Exception as e:
        print(f"診斷失敗: {e}")
        return False

if __name__ == "__main__":
    if diagnose_max30102():
        print("\n✓ 診斷完成，感測器正常")
        print("現在可以運行主程式")
    else:
        print("\n✗ 診斷發現問題")
        print("請根據上述建議進行檢查") 