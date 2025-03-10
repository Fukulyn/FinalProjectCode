# -*- coding:utf-8 -*-
# @Author：17
# @Date: 2023/3/19 14:10
# @version: V1

import random
from paho.mqtt import client as mqtt_client

class InitMqtt():

    def __init__(self):
        self.host = "broker.emqx.io"  # 即 broker 地址
        self.port = 1883             # 端口
        self.topic = "esp_test"    # 主题
        self.client_id = f'esp-p-{random.randint(0, 1000)}' # 设定唯一设备号，不设则mqtt随机生成 连接id要唯一，不然会相互挤下线
        self.user = "host001"           # 连接的用户名
        self.pwd = "0000"           # 连接的密码
        self.run()

    # 连接回调函数
    def on_connect(self, client, userdata, flags, rc):
        # 响应状态码为0表示连接成功
        if rc == 0:
            print(" * [通知] 已连接到MQTT Broker!")
        else:
            print(f" * [通知] 连接MQTT Broker失败，返回代码 {rc}")

    # 连接mqtt代理服务器
    def connect(self):
        self.client = mqtt_client.Client(self.client_id)
        # 连接的用户名和密码
        self.client.username_pw_set(self.user, self.pwd)
        self.client.on_connect = self.on_connect
        self.client.connect(self.host, self.port)
        return self.client

    # 订阅主题并接收消息
    def subscribe(self, client):

        def on_message(client, userdata, msg):
            print(f" * [通知] 收到订阅消息：\n {msg.payload.decode()} - 主题topic：{msg.topic}")

        # 订阅指定消息主题
        self.client.subscribe(self.topic)
        self.client.on_message = on_message

    def run(self):
        self.client = self.connect()
        self.subscribe(self.client)
        #  运行一个线程来自动调用loop()处理网络事件, 阻塞模式
        self.client.loop_forever()


if __name__ == '__main__':
    InitMqtt()