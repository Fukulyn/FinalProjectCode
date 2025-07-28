def calculate_heart_rate(ir_samples, time_elapsed):
    if len(ir_samples) < 100 or time_elapsed <= 0:
        return 0
    peaks = []
    threshold = (max(ir_samples) + min(ir_samples)) / 2
    min_peak_distance = int(len(ir_samples) / 10)
    last_peak = -min_peak_distance - 1
    for i in range(1, len(ir_samples) - 1):
        if (ir_samples[i] > threshold and 
            ir_samples[i] > ir_samples[i-1] and 
            ir_samples[i] > ir_samples[i+1] and 
            i - last_peak > min_peak_distance):
            peaks.append(i)
            last_peak = i
    if len(peaks) < 2:
        return 0
    intervals = [peaks[i+1] - peaks[i] for i in range(len(peaks)-1)]
    if intervals:
        avg_interval = sum(intervals) / len(intervals)
        filtered_intervals = [iv for iv in intervals if abs(iv - avg_interval) < avg_interval * 0.3]
        if filtered_intervals:
            avg_interval = sum(filtered_intervals) / len(filtered_intervals)
        else:
            avg_interval = sum(intervals) / len(intervals)
    else:
        return 0
    sample_rate = len(ir_samples) / time_elapsed
    heart_rate = (60 * sample_rate) / avg_interval
    return int(heart_rate)

def calculate_spo2(red_samples, ir_samples):
    if len(red_samples) < 100 or len(ir_samples) < 100:
        return 0
    red_filtered = sorted(red_samples)[int(len(red_samples)*0.1):int(len(red_samples)*0.9)]
    ir_filtered = sorted(ir_samples)[int(len(ir_samples)*0.1):int(len(ir_samples)*0.9)]
    if not red_filtered or not ir_filtered:
        return 0
    red_avg = sum(red_filtered) / len(red_filtered)
    ir_avg = sum(ir_filtered) / len(ir_filtered)
    if red_avg == 0 or ir_avg == 0:
        return 0
    red_ac = max(red_filtered) - min(red_filtered)
    ir_ac = max(ir_filtered) - min(ir_filtered)
    r = (red_ac / red_avg) / (ir_ac / ir_avg)
    spo2 = 110 - 25 * r
    return min(max(int(spo2), 0), 100)