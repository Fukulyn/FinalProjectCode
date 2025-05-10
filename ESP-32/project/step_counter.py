import math
import time

class StepCounter:
    def __init__(self):
        self.threshold = 1.5
        self.step_count = 0
        self.last_step_time = time.ticks_ms()
        self.peak_detected = False
        self.magnitudes = []
        self.min_step_interval = 350  # 最小步伐間隔（毫秒）
    
    def calculate_magnitude(self, ax, ay, az):
        return math.sqrt(ax*ax + ay*ay + az*az)
    
    def detect_step(self, ax, ay, az):
        current_time = time.ticks_ms()
        magnitude = self.calculate_magnitude(ax, ay, az)
        
        self.magnitudes.append(magnitude)
        if len(self.magnitudes) > 10:
            self.magnitudes.pop(0)
            
        if (magnitude > self.threshold and 
            not self.peak_detected):
            if current_time - self.last_step_time > self.min_step_interval:
                self.step_count += 1
                self.last_step_time = current_time
                self.peak_detected = True
        
        if magnitude < self.threshold * 0.8:
            self.peak_detected = False
            
        return self.step_count