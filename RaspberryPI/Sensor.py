import time
import board
import adafruit_vl53l1x
import statistics
import json
import os

# 配置參數
CONFIG_FILE = "food_sensor_config.json"
DEFAULT_CONFIG = {
    "最大高度": 150,    # mm（滿桶）
    "最小高度": 10,     # mm（空桶）
    "測量次數": 5,      # 每次讀取的測量次數
    "測量間隔": 0.1,    # 測量間隔（秒）
    "更新頻率": 5,      # 資料更新頻率（秒）
    "平滑係數": 0.3,    # 指數平滑係數 (0-1)
    "校準模式": False   # 校準模式開關
}

# 讀取配置檔案
def load_config():
    try:
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        else:
            # 如果配置檔案不存在，則創建預設配置檔案
            save_config(DEFAULT_CONFIG)
            return DEFAULT_CONFIG
    except Exception as e:
        print(f"讀取配置檔案時發生錯誤: {e}")
        return DEFAULT_CONFIG

# 儲存配置檔案
def save_config(config):
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
        print("配置已儲存到", CONFIG_FILE)
    except Exception as e:
        print(f"儲存配置檔案時發生錯誤: {e}")

# 初始化感測器
def initialize_sensor():
    try:
        i2c = board.I2C()
        sensor = adafruit_vl53l1x.VL53L1X(i2c)
        
        # 配置感測器
        sensor.start_ranging()
        
        # 設定測量時間預算（可提高精確度但會增加測量時間）
        # 可用值: 15 (最快), 20, 33, 50, 100, 200, 500 (最精確) ms
        sensor.timing_budget = 100
        
        # 設定距離模式
        # 0=Short (最大1.3米), 1=Medium (最大3米), 2=Long (最大4米，精度較差)
        sensor.distance_mode = 1
        
        print("VL53L1X 感測器初始化成功")
        return sensor
    except Exception as e:
        print(f"感測器初始化失敗: {e}")
        return None

# 進行多次測量並返回濾波後的結果
def get_filtered_distance(sensor, config):
    readings = []
    for _ in range(config["測量次數"]):
        try:
            readings.append(sensor.distance)
            time.sleep(config["測量間隔"])
        except Exception as e:
            print(f"讀取距離時發生錯誤: {e}")
    
    # 移除離群值（可選）
    if len(readings) >= 3:
        readings.sort()
        readings = readings[1:-1]  # 移除最高和最低值
    
    # 如果沒有有效讀數，返回-1
    if not readings:
        return -1
        
    # 返回中位數作為穩定的距離值
    return statistics.median(readings)

# 計算飼料剩餘百分比
def calculate_food_level(distance, config, last_level=None):
    max_height = config["最大高度"]
    min_height = config["最小高度"]
    
    # 檢查距離是否在有效範圍內
    if distance < 0:
        return last_level if last_level is not None else 0
        
    # 計算百分比（反比關係）
    raw_level = max(0, min(100, (1 - (distance - min_height) / (max_height - min_height)) * 100))
    
    # 應用指數平滑以減少波動（如果有上一個讀數）
    if last_level is not None:
        smoothed_level = (config["平滑係數"] * raw_level) + ((1 - config["平滑係數"]) * last_level)
    else:
        smoothed_level = raw_level
        
    return int(smoothed_level)

# 校準程序
def calibration_mode(sensor, config):
    print("\n===== 飼料桶校準模式 =====")
    print("請按照提示完成校準過程:")
    
    # 校準空桶
    input("請確保飼料桶為空，然後按 Enter 繼續...")
    print("測量空桶高度中...")
    empty_readings = []
    for i in range(5):
        distance = get_filtered_distance(sensor, config)
        empty_readings.append(distance)
        print(f"測量 {i+1}/5: {distance:.1f} mm")
        time.sleep(1)
    
    empty_height = statistics.median(empty_readings)
    print(f"空桶高度測量結果: {empty_height:.1f} mm")
    
    # 校準滿桶
    input("\n請將飼料桶填滿，然後按 Enter 繼續...")
    print("測量滿桶高度中...")
    full_readings = []
    for i in range(5):
        distance = get_filtered_distance(sensor, config)
        full_readings.append(distance)
        print(f"測量 {i+1}/5: {distance:.1f} mm")
        time.sleep(1)
    
    full_height = statistics.median(full_readings)
    print(f"滿桶高度測量結果: {full_height:.1f} mm")
    
    # 儲存校準結果
    config["最小高度"] = empty_height
    config["最大高度"] = full_height
    config["校準模式"] = False
    save_config(config)
    
    print("\n校準完成！新的參數已儲存.")
    print(f"空桶高度: {empty_height:.1f} mm")
    print(f"滿桶高度: {full_height:.1f} mm")
    print(f"有效量測範圍: {abs(full_height - empty_height):.1f} mm")

# 主程式
def main():
    # 載入配置
    config = load_config()
    
    # 初始化感測器
    sensor = initialize_sensor()
    if not sensor:
        print("無法初始化感測器，程式結束")
        return
    
    # 檢查是否需要進入校準模式
    if config["校準模式"]:
        calibration_mode(sensor, config)
    
    # 主循環
    print("\n===== 飼料桶監測系統啟動 =====")
    print(f"設定: 最大高度={config['最大高度']}mm, 最小高度={config['最小高度']}mm")
    
    last_level = None
    try:
        while True:
            # 獲取濾波後的距離測量值
            distance = get_filtered_distance(sensor, config)
            
            if distance >= 0:
                # 計算剩餘量百分比
                level = calculate_food_level(distance, config, last_level)
                last_level = level
                
                # 顯示資訊
                status = "正常" if level > 20 else "偏低" if level > 10 else "極低"
                print(f"距離: {distance:.1f} mm | 飼料剩餘量: {level}% | 狀態: {status}")
            else:
                print("讀取失敗，請檢查感測器連接")
            
            # 等待下一次更新
            time.sleep(config["更新頻率"])
            
    except KeyboardInterrupt:
        print("\n程式已被使用者中斷")
    finally:
        # 清理資源
        if sensor:
            sensor.stop_ranging()
        print("感測器已停止，程式結束")

if __name__ == "__main__":
    main()