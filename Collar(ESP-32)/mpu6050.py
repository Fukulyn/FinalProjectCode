import time

class MPU6050:
    def __init__(self, i2c, addr=0x68):
        self.iic = i2c
        self.addr = addr
        if addr not in self.iic.scan():
            raise RuntimeError("找不到 MPU6050 設備")
        self.iic.writeto_mem(self.addr, 0x6B, b'\x00')
        time.sleep(0.1)
    
    def read_raw_data(self, addr):
        h = self.iic.readfrom_mem(self.addr, addr, 1)[0]
        l = self.iic.readfrom_mem(self.addr, addr + 1, 1)[0]
        value = (h << 8) + l
        if value >= 0x8000:
            value = -((65535 - value) + 1)
        return value
    
    def get_acceleration(self):
        ax = self.read_raw_data(0x3B) / 16384.0
        ay = self.read_raw_data(0x3D) / 16384.0
        az = self.read_raw_data(0x3F) / 16384.0
        return ax, ay, az