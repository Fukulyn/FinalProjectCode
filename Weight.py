import RPi.GPIO as GPIO
import time
import sys
from hx711 import HX711

# 定義引腳
DT_PIN = 5   # HX711 DT Pin
SCK_PIN = 6  # HX711 SCK Pin

# 設置比例因子(需要校準)
SCALE_FACTOR = 92

# 初始化函數
def setup():
    GPIO.setwarnings(False)
    GPIO.setmode(GPIO.BCM)
    
    print("正在初始化HX711...")
    
    # 初始化HX711
    hx = HX711(DT_PIN, SCK_PIN)
    
    # 列印方法清單，幫助除錯
    print("HX711 方法:", dir(hx))
    
    return hx

# 配置HX711
def configure_hx711(hx):
    try:
        print("正在配置HX711...")
        
        # 嘗試設置增益
        if 'set_gain' in dir(hx):
            hx.set_gain(128)
            print("已設置增益: 128")
        
        # 設置比例因子
        if 'set_scale' in dir(hx):
            hx.set_scale(SCALE_FACTOR)
            print(f"已設置比例因子: {SCALE_FACTOR}")
        elif 'set_reference_unit' in dir(hx):
            hx.set_reference_unit(SCALE_FACTOR)
            print(f"已設置參考單位: {SCALE_FACTOR}")
        
        # 重置
        if 'reset' in dir(hx):
            print("正在重置HX711...")
            hx.reset()
            print("HX711已重置")
        
        # 去皮
        if 'tare' in dir(hx):
            print("正在去皮...")
            hx.tare()
            print("已完成去皮")
        elif 'tare_A' in dir(hx):
            hx.tare_A()
            print("已完成去皮(方法A)")
        
        print("HX711配置完成")
        return True
    except Exception as e:
        print(f"配置HX711時出錯: {str(e)}")
        return False

# 獲取重量
def get_weight(hx):
    weight = 0
    try:
        # 嘗試不同的獲取重量方法
        if 'get_weight' in dir(hx):
            weight = hx.get_weight(5)  # 讀取5次平均
        elif 'get_value' in dir(hx) and 'get_scale' in dir(hx):
            weight = hx.get_value(5) / hx.get_scale()
        elif 'get_value' in dir(hx):
            weight = hx.get_value(5) / SCALE_FACTOR
        elif 'get_grams' in dir(hx):
            weight = hx.get_grams(5)
        else:
            print("警告: 無法找到合適的方法獲取重量")
            return 0
        
        # 確保重量不是負數
        weight = max(0, int(weight))
        
        # 電源管理
        if 'power_down' in dir(hx) and 'power_up' in dir(hx):
            hx.power_down()
            hx.power_up()
    except Exception as e:
        print(f"獲取重量時出錯: {str(e)}")
    
    return weight

# 主程序
def main():
    try:
        # 初始化
        hx = setup()
        
        # 配置
        if not configure_hx711(hx):
            print("配置失敗，退出程序")
            GPIO.cleanup()
            sys.exit(1)
        
        print("\n開始讀取重量數據，按下Ctrl+C退出程序")
        print("--------------------------------")
        
        # 主循環
        while True:
            weight = get_weight(hx)
            print(f"當前重量: {weight} 克", end='\r')
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        print("\n\n程序已被用戶中斷")
    except Exception as e:
        print(f"\n程序出錯: {str(e)}")
    finally:
        # 清理資源
        GPIO.cleanup()
        print("GPIO資源已清理，程序已安全退出")

if __name__ == "__main__":
    main()  #執行主程式