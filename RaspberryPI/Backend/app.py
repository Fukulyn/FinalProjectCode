from flask import Flask
from flask_cors import CORS
from routes.feeder_route import feeder_bp
from routes.auth_route import auth_bp
from config import Config
from modules.scale import init_scale
from modules.sensor import init_sensor
from modules.servo import init_servo
from utils.mqtt_handler import init_mqtt

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

init_scale()
init_sensor()
init_servo()
init_mqtt(app)

app.register_blueprint(feeder_bp)
app.register_blueprint(auth_bp)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
