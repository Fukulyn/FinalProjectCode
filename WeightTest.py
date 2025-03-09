from hx711 import HX711
import time

DT_PIN = 5
SCK_PIN = 6

hx = HX711(DT_PIN, SCK_PIN)
hx.set_scale(92)  # 使用比例因子
hx.tare()  # 去皮

while True:
    try:
        weight = hx.get_weight(5)  # 讀取 5 次平均值
        print(f"重量: {weight} 克", end='\r')
        time.sleep(1)
    except KeyboardInterrupt:
        print("程序終止")
        break
