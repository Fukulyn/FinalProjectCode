import time

class MAX30102:
    def __init__(self, i2c):
        self.i2c = i2c
        self.ADDRESS = 0x57
        self.REG_INTR_STATUS_1 = 0x00
        self.REG_INTR_ENABLE_1 = 0x02
        self.REG_FIFO_WR_PTR = 0x04
        self.REG_FIFO_RD_PTR = 0x06
        self.REG_FIFO_DATA = 0x07
        self.REG_FIFO_CONFIG = 0x08
        self.REG_MODE_CONFIG = 0x09
        self.REG_SPO2_CONFIG = 0x0A
        self.REG_LED1_PA = 0x0C
        self.REG_LED2_PA = 0x0D
        self.REG_TEMP_CONFIG = 0x21
        self.REG_PART_ID = 0xFF
        self.init_sensor()
    
    def write_reg(self, reg_address, data):
        self.i2c.writeto_mem(self.ADDRESS, reg_address, bytes([data]))
    
    def read_reg(self, reg_address):
        return self.i2c.readfrom_mem(self.ADDRESS, reg_address, 1)[0]
    
    def init_sensor(self):
        self.write_reg(self.REG_MODE_CONFIG, 0x40)
        time.sleep(0.1)
        self.write_reg(self.REG_FIFO_CONFIG, 0x0F)
        self.write_reg(self.REG_MODE_CONFIG, 0x03)
        self.write_reg(self.REG_SPO2_CONFIG, 0x27)
        self.write_reg(self.REG_LED1_PA, 0x24)
        self.write_reg(self.REG_LED2_PA, 0x24)
        self.write_reg(self.REG_TEMP_CONFIG, 0x01)
    
    def read_fifo(self):
        data = self.i2c.readfrom_mem(self.ADDRESS, self.REG_FIFO_DATA, 6)
        red = (data[0] << 16 | data[1] << 8 | data[2]) & 0x3FFFF
        ir = (data[3] << 16 | data[4] << 8 | data[5]) & 0x3FFFF
        return red, ir
    
    def read_temp(self):
        self.write_reg(self.REG_TEMP_CONFIG, 0x01)
        time.sleep(0.1)
        temp_int = self.read_reg(0x1F)
        temp_frac = self.read_reg(0x20)
        return temp_int + (temp_frac * 0.0625)