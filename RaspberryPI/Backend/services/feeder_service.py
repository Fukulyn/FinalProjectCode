from modules.servo import feed, feed_until_weight, open_waste_gate, close_waste_gate
from modules.sensor_dual import get_dual_distance
from modules.scale import get_filtered_weight
from datetime import datetime

def feed_once():
    grams = feed()
    h1, h2 = get_dual_distance()
    return {
        "status": "fed",
        "grams": grams,
        "height_feed": h2,
        "height_waste": h1
    }

def feed_until_target(target_grams):
    feed_until_weight(target_grams)
    h1, h2 = get_dual_distance()
    final = get_filtered_weight()
    return {
        "status": "fed_until",
        "target": target_grams,
        "actual": final,
        "height_feed": h2,
        "height_waste": h1
    }

def check_status():
    grams = get_filtered_weight()
    h1, h2 = get_dual_distance()
    return {
        "status": "status",
        "grams": grams,
        "height_feed": h2,
        "height_waste": h1,
        "timestamp": datetime.now().isoformat()
    }
def open_gate():
    open_waste_gate()
    return {
        "status": "gate_opened"
    }

def close_gate():
    close_waste_gate()
    return {
        "status": "gate_closed"
    }