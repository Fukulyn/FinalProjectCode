#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
main.py：智慧餵食器主程式入口

功能：
  0) 去皮並重啟距離感測器
  1) 手動餵食（可指定角度）
  2) 即時顯示重量 & 高度 (按 Enter 停止)
  3) 校正重量比例
  4) 校正距離比例
  5) 退出程式
"""

import sys
import select
import RPi.GPIO as GPIO
import warnings
warnings.filterwarnings(
    "ignore",
    message=".*channel is already in use.*",
    category=RuntimeWarning
)

from modules.scale import (
    init_scale,
    get_filtered_weight,
    get_realtime_weight,
    calibrate_weight
)
from modules.sensor_dual import (
    init_dual_sensor,
    get_dual_distance,
    stop_dual_sensor,
    calibrate_distance
)
from modules.servo import init_servo, feed, pwm

# 關閉 GPIO 重複使用警告
GPIO.setwarnings(False)

def main_menu():  
    # 一開始初始化伺服／秤重／感測
    init_servo()
    init_scale()
    init_dual_sensor()

    while True:
        print("\n===== 智慧餵食器 操作選單 =====")
        print("0) 去皮 + 重啟感測")
        print("1) 餵食")
        print("2) 即時顯示重量 & 高度 (按 Enter 停止)")
        print("3) 校正重量比例")
        print("4) 校正距離比例")
        print("5) 退出程式")
        print("6) 客製化餵食（輸入目標重量）")
        choice = input("請輸入選項 (0-5)：").strip()

        if choice == '0':
            print("執行去皮與感測器重啟...")
            init_scale()
            init_dual_sensor()

        elif choice == '1':
            print("執行餵食:固定90度")
            from modules.servo import feed
            feed()

        elif choice == '2':
            print("即時顯示中，按 Enter 停止...")
            try:
                while True:
                    # 取即時重量與高度
                    w = get_filtered_weight()
                    cm1, cm2 = get_dual_distance()
                    # 覆蓋同一行顯示
                    print(f"重量：{w:.1f} g | 廚餘高度：{cm1:.1f} mm | 飼料高度：{cm2:.1f} mm",
                           end='\r', flush=True)
                    # 0.2 秒刷新
                    if select.select([sys.stdin], [], [], 0.2)[0]:
                        sys.stdin.readline()
                        break
            except KeyboardInterrupt:
                pass
            print()  # 換行

        elif choice == '3':
            calibrate_weight()

        elif choice == '4':
            calibrate_distance()

        elif choice == '5':
            print("正在退出，88～")
            break
        elif choice == '6':
            try:
                grams = float(input("請輸入目標餵食重量（克）："))
                from modules.servo import feed_until_weight
                feed_until_weight(grams)
            except ValueError:
                print("❌ 請輸入有效數字")
        else:
            print("無效選項，請輸入 0 到 5 之間的數字！")

if __name__ == '__main__':
    try:
        main_menu()
    finally:
        pwm.stop()
        GPIO.cleanup()
        print("資源清理完成，程式結束")
        stop_dual_sensor()