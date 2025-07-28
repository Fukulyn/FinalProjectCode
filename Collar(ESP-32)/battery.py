from machine import ADC, Pin

class BatteryMonitor:
    def __init__(self, pin_number=14):
        self.adc_pin = ADC(Pin(pin_number))
        self.adc_pin.atten(ADC.ATTN_11DB)
        self.adc_pin.width(ADC.WIDTH_12BIT)
        self.conversion_factor = 3.3 / 4095
        self.voltage_divider_ratio = 2
        
    def read_voltage(self):
        reading = self.adc_pin.read()
        voltage = reading * self.conversion_factor * self.voltage_divider_ratio
        return voltage
    
    def get_percentage(self):
        voltage = self.read_voltage()
        max_voltage = 4.2
        min_voltage = 3.3
        
        if voltage >= max_voltage:
            return 100, voltage
        elif voltage <= min_voltage:
            return 0, voltage
        else:
            return int((voltage - min_voltage) / (max_voltage - min_voltage) * 100), voltage