from utils.mqtt_client import init_mqtt
from modules.servo import init_servo
from modules.scale import init_scale
from modules.sensor_dual import init_dual_sensor
from controllers.feeder_controller import broadcast_status_loop
import threading

init_servo()
init_scale()
init_dual_sensor()

client = init_mqtt()
threading.Thread(target=broadcast_status_loop, args=(client,), daemon=True).start()
client.loop_forever()
