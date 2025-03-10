import network
import time
import machine

def reset_wifi(ssid, password):
    # 創建 STA 介面
    wlan = network.WLAN(network.STA_IF)
    
    # 如果已經啟動，先停用
    if wlan.active():
        wlan.active(False)
        print("WiFi 已停用")
    
    # 等待一小段時間確保停用完成
    time.sleep(1)
    
    # 重新啟動 WiFi
    wlan.active(True)
    print("WiFi 已重新啟動")
    
    # 斷開現有連線（如果有）
    if wlan.isconnected():
        wlan.disconnect()
        print("已斷開現有連線")
    
    # 等待斷開完成
    time.sleep(1)
    
    # 開始連接到指定的 WiFi
    print(f"正在連接到 {ssid}...")
    wlan.connect(ssid, password)
    
    # 等待連線完成，最多等待 10 秒
    timeout = 10
    start_time = time.time()
    
    while not wlan.isconnected() and (time.time() - start_time) < timeout:
        print(".", end="")
        time.sleep(1)
    
    # 檢查連線結果
    if wlan.isconnected():
        print("\nWiFi 連線成功!")
        print("網路資訊:", wlan.ifconfig())
    else:
        print("\nWiFi 連線失敗，請檢查 SSID 和密碼")
        # 如果連線失敗，執行硬重設
        machine.reset()

# 使用範例（請替換成您的 WiFi 資訊）
SSID = "S24Ultra"      # 替換成您的 WiFi SSID
PASSWORD = "0909025146"  # 替換成您的 WiFi 密碼

# 執行 WiFi 重設
reset_wifi(SSID, PASSWORD)