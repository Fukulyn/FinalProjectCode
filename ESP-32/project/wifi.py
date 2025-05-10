import network
import time

class InitWifi:
    def __init__(self, ssid="S24Ultra", passwd="0909025146"):
        self.ssid = ssid
        self.passwd = passwd
    
    def run(self):
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        if not wlan.isconnected():
            print(' * [通知] 正在連接到 WiFi...')
            wlan.connect(self.ssid, self.passwd)
            for _ in range(10):
                if wlan.isconnected():
                    print(f' * [通知] 連接到 {self.ssid} 成功:', wlan.ifconfig())
                    return True
                time.sleep(1)
            print(' * [錯誤] WiFi 連線失敗')
            return False
        return True