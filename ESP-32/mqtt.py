# -*- coding: utf-8 -*-
class InitMqtt():
    def __init__(self):
        self.host = "broker.emqx.io"
        self.port = 1883
        self.topic = "esp_test"
        self.client_id = f'esp-p-{random.randint(0, 1000)}'
        self.user = "host001"
        self.pwd = "0000"
        
        print("初始化MAX30102...")
        init_max30102()
        print("開始測量...")
        print("請將手指平穩放在感測器上")
        
        self.run()

    def connect(self):
        try:
            self.client = MQTTClient(self.client_id, self.host, self.port, self.user, self.pwd)
            self.client.connect()
            print(" * [通知] 已連接到MQTT Broker!")
            return True
        except Exception as e:
            print(f' * [錯誤] {e} 無法連接到MQTT代理，正在重新連接...')
            return False

    def publish(self):
        red_samples = []
        ir_samples = []
        start_time = time.time()
        
        while True:
            current_time = time.time()
            red, ir = read_fifo()
            
            if red > 7000 and ir > 7000:
                red_samples.append(red)
                ir_samples.append(ir)
                
                if len(red_samples) >= 100:
                    elapsed_time = current_time - start_time
                    
                    heart_rate = calculate_heart_rate(red_samples, elapsed_time)
                    spo2 = calculate_spo2(red_samples, ir_samples)
                    temp = read_temp()
                    
                    sensor_data = {
                        "device_id": self.client_id,
                        "timestamp": time.time(),
                        "heart_rate": heart_rate,
                        "blood_oxygen": spo2,
                        "temperature": round(temp, 1),
                        "status": "normal"
                    }
                    
                    json_msg = ujson.dumps(sensor_data)
                    self.client.publish(self.topic, json_msg.encode(), qos=0)
                    print(f" * [通知] 發送數據: {json_msg}")
                    
                    red_samples = red_samples[-50:]
                    ir_samples = ir_samples[-50:]
                    start_time = current_time
                    
                    time.sleep(3)

    def run(self):
        if self.connect():
            try:
                self.publish()
            except Exception as e:
                print(f"發布過程中發生錯誤：{e}")