class MPU6050:
    def __init__(self, i2c, addr=0x68):
        self.i2c = i2c
        self.addr = addr
        self.i2c.start()
        # 喚醒 MPU6050
        self.i2c.writeto_mem(self.addr, 0x6B, bytes([0]))
        
    def get_raw_data(self):
        # 讀取原始數據
        raw_data = self.i2c.readfrom_mem(self.addr, 0x3B, 14)
        return raw_data
    
    def get_accel_data(self):
        raw_data = self.get_raw_data()
        # 將原始數據轉換為加速度值 (g)
        accel_x = self.bytes_to_int(raw_data[0], raw_data[1]) / 16384.0
        accel_y = self.bytes_to_int(raw_data[2], raw_data[3]) / 16384.0
        accel_z = self.bytes_to_int(raw_data[4], raw_data[5]) / 16384.0
        return {'x': accel_x, 'y': accel_y, 'z': accel_z}
    
    def get_gyro_data(self):
        raw_data = self.get_raw_data()
        # 將原始數據轉換為角速度 (度/秒)
        gyro_x = self.bytes_to_int(raw_data[8], raw_data[9]) / 131.0
        gyro_y = self.bytes_to_int(raw_data[10], raw_data[11]) / 131.0
        gyro_z = self.bytes_to_int(raw_data[12], raw_data[13]) / 131.0
        return {'x': gyro_x, 'y': gyro_y, 'z': gyro_z}
    
    def get_temp(self):
        raw_data = self.get_raw_data()
        # 將原始數據轉換為溫度值 (攝氏度)
        temp = self.bytes_to_int(raw_data[6], raw_data[7]) / 340.0 + 36.53
        return temp
    
    def bytes_to_int(self, msb, lsb):
        if not msb & 0x80:
            return msb << 8 | lsb
        return -((msb ^ 255) << 8 | (lsb ^ 255) + 1)