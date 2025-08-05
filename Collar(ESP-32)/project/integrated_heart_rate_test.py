"""
整合心跳測試程式
展示合併到原有專案中的峰值偵測統計處理功能
"""

from machine import I2C, Pin
import time
from project.max30102 import MAX30102
from project.health_calculations import calculate_heart_rate_with_stats

def test_integrated_heart_rate():
    """整合心跳測試主函數"""
    print("=== 整合心跳測試 (峰值偵測統計版) ===")
    print("使用合併到專案中的改進演算法")
    print("請將手指放在感測器上，保持靜止...")
    print("按 Ctrl+C 停止測試\n")
    
    try:
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
                        signal_quality = sensor.get_signal_quality(red, ir)
                        print(f"樣本 {sample_count}: Red={red}, IR={ir}")
                        print(f"信號質量: {signal_quality}")
                        
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
                                print(f"   信號範圍: {stats['signal_range']}")
                                
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
                    print(f"四分位距: {final_stats['iqr']}")
                    print("✓ 整合測試成功！")
                    return True
                else:
                    print("✗ 無法計算最終心率")
                    return False
            else:
                print("✗ 樣本不足，無法計算心率")
                return False
        
    except Exception as e:
        print(f"✗ 整合測試失敗: {e}")
        return False

def compare_algorithms():
    """比較新舊演算法"""
    print("\n=== 演算法比較 ===")
    print("舊演算法:")
    print("- 簡單移動平均濾波")
    print("- 單一閾值峰值檢測")
    print("- 基本異常值過濾")
    print("- 樣本要求: 30個")
    print("- 心率範圍: 30-220 BPM")
    
    print("\n新演算法 (峰值偵測統計處理):")
    print("- 加權移動平均濾波器")
    print("- 多閾值峰值檢測")
    print("- 四分位數統計處理")
    print("- 智能平均方法選擇")
    print("- 樣本要求: 50個")
    print("- 心率範圍: 40-200 BPM")
    print("- 變異係數檢查")
    print("- 詳細統計信息")

if __name__ == "__main__":
    try:
        print("=== 整合心跳測試程式 ===")
        print("此程式展示合併到原有專案中的改進功能")
        
        # 顯示演算法比較
        compare_algorithms()
        
        print("\n" + "="*50)
        
        # 執行整合測試
        if test_integrated_heart_rate():
            print("\n✓ 整合測試完成，新演算法工作正常")
            print("可以安全地使用合併後的專案程式碼")
        else:
            print("\n✗ 整合測試失敗")
            print("請檢查硬體連接和感測器狀態")
            
    except KeyboardInterrupt:
        print("\n * [通知] 用戶中斷測試")
    except Exception as e:
        print(f"\n * [錯誤] 測試過程中發生錯誤: {e}") 