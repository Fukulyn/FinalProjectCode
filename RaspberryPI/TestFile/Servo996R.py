import RPi.GPIO as GPIO
import time

# 伺服馬達配置
SERVO_PIN = 24      # 伺服馬達 GPIO 腳位
FREQ = 50           # PWM 頻率 (Hz)
OPEN_ANGLE = 90     # 開門角度
CLOSE_ANGLE = 0     # 關門角度
OPEN_DUTY = 10      # 開門時的佔空比 (約為90度)
CLOSE_DUTY = 2.5    # 關門時的佔空比 (約為0度)

# 將角度轉換為佔空比
def angle_to_duty_cycle(angle):
    """
    將角度(0-180)轉換為佔空比(2.5-12.5)
    伺服馬達通常使用1ms-2ms脈衝寬度對應0-180度
    在50Hz下，這相當於2.5%-12.5%的佔空比
    """
    return 2.5 + (angle / 180.0) * 10.0

# 平滑移動伺服馬達
def smooth_servo_move(pwm, start_duty, end_duty, step=0.2, delay=0.02):
    """
    讓馬達平滑移動，而不是瞬間跳動，確保速度均勻
    
    參數:
    - pwm: PWM物件
    - start_duty: 起始佔空比
    - end_duty: 結束佔空比
    - step: 每步調整的佔空比(預設0.2)
    - delay: 每步之間的延遲(秒)(預設0.02秒)
    """
    # 確定步進方向
    if start_duty < end_duty:
        step = abs(step)  # 遞增
    else:
        step = -abs(step)  # 遞減
    
    # 計算總步數
    steps = int(abs(end_duty - start_duty) / abs(step))
    
    # 平滑移動
    current_duty = start_duty
    for _ in range(steps):
        current_duty += step
        pwm.ChangeDutyCycle(current_duty)
        time.sleep(delay)
    
    # 確保最終位置精確
    pwm.ChangeDutyCycle(end_duty)
    time.sleep(delay)
    
    # 停止PWM輸出以防止抖動
    pwm.ChangeDutyCycle(0)

def open_gate():
    """開啟閘門"""
    print("🔓 開門中...")
    smooth_servo_move(pwm, CLOSE_DUTY, OPEN_DUTY)
    print("✅ 門已完全打開")

def close_gate():
    """關閉閘門"""
    print("🔒 關門中...")
    smooth_servo_move(pwm, OPEN_DUTY, CLOSE_DUTY)
    print("✅ 門已完全關閉")

# 初始化伺服馬達的函數
def initialize_servo():
    global pwm  # 宣告 pwm 為全域變數
    # 初始化GPIO（如果還沒初始化過）
    GPIO.setmode(GPIO.BOARD)  # 使用實體板上的腳位編號
    GPIO.setup(SERVO_PIN, GPIO.OUT)  # 設定伺服馬達腳位為輸出模式
    
    # 創建並啟動PWM
    pwm = GPIO.PWM(SERVO_PIN, FREQ)  # 建立PWM物件，頻率為50Hz
    pwm.start(0)  # 啟動PWM，初始佔空比為0
    
    # 確保開始時閘門關閉
    print("初始化伺服馬達...")
    pwm.ChangeDutyCycle(CLOSE_DUTY)  # 設定為關門位置
    time.sleep(1)  # 等待1秒讓馬達到位
    pwm.ChangeDutyCycle(0)  # 停止PWM輸出以防止抖動

# 主程式
def main():
    try:
        # 等待用戶按下任意鍵來初始化伺服馬達
        input("按下 Enter 鍵來初始化伺服馬達...")

        # 初始化伺服馬達
        initialize_servo()

        while True:
            # 開門
            open_gate()  # 呼叫開門函數
            time.sleep(3)  # 保持開門狀態3秒
            
            # 關門
            close_gate()  # 呼叫關門函數
            time.sleep(3)  # 等待3秒後再次循環
            
            # 提示使用者
            user_input = input("按Enter繼續循環，輸入'q'退出: ")
            if user_input.lower() == 'q':
                break
                
    except KeyboardInterrupt:
        print("\n程式被使用者中斷")  # 處理Ctrl+C中斷
    except Exception as e:
        print(f"發生錯誤: {e}")  # 處理其他異常
    finally:
        # 清理資源
        if 'pwm' in globals():
            pwm.stop()  # 停止PWM
        GPIO.cleanup()  # 清理GPIO資源
        print("GPIO資源已清理")

if __name__ == "__main__":
    main()  # 執行主程式
