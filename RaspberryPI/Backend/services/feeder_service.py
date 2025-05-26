from modules.servo import feed
from modules.scale import get_filtered_weight
from RaspberryPI.Backend.Archive.sensor import get_realtime_distance
from utils.mqtt_handler import publish_feed_log
import time

def do_feed(angle):
    grams = feed(angle)
    publish_feed_log(grams)
    return grams

def get_weight():
    return get_filtered_weight()

def get_distance():
    return get_realtime_distance()
