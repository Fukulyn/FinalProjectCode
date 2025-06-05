class Config:
    SECRET_KEY = 'your_secret_key_here'
    JWT_SECRET_KEY = 'your_jwt_secret_here'
    MQTT_BROKER_URL = "broker.emqx.io"
    MQTT_PORT = 1883
    MQTT_TOPIC_FEED = "pet/manager/topic/feeding"
    MQTT_USERNAME = "petmanager"
    MQTT_PASSWORD = "petmanager"