#!/usr/bin/env python3
"""
測試狀態查詢功能的腳本
"""

import requests
import time
import json

def test_status_query():
    """測試狀態查詢功能"""
    base_url = "http://localhost:3001"
    
    print("=== 測試狀態查詢功能 ===")
    
    # 1. 發送狀態查詢指令
    print("\n1. 發送狀態查詢指令...")
    try:
        response = requests.get(f"{base_url}/api/check_status")
        result = response.json()
        print(f"回應: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if result.get('success'):
            print("✓ 狀態查詢指令發送成功")
        else:
            print("✗ 狀態查詢指令發送失敗")
            return
            
    except Exception as e:
        print(f"✗ 發送狀態查詢指令時出錯: {e}")
        return
    
    # 2. 等待一下讓餵食器回應
    print("\n2. 等待餵食器回應...")
    time.sleep(3)
    
    # 3. 獲取狀態信息
    print("\n3. 獲取狀態信息...")
    try:
        response = requests.get(f"{base_url}/api/get_status")
        result = response.json()
        print(f"回應: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if result.get('success'):
            print("✓ 成功獲取狀態信息")
            status_data = result['data']['status']
            print(f"系統狀態: {status_data.get('system_status', '未知')}")
            print(f"當前重量: {status_data.get('angle', 0)}g")
            print(f"飼料高度: {status_data.get('height_feed', 0)}mm")
            print(f"廚餘高度: {status_data.get('height_waste', 0)}mm")
            print(f"電量: {status_data.get('power', 0)}V")
            
            if status_data.get('scheduled_feeding'):
                print(f"定時餵食: {status_data['scheduled_feeding']['datetime']} - {status_data['scheduled_feeding']['grams']}g")
            else:
                print("定時餵食: 無設定")
        else:
            print(f"✗ 獲取狀態信息失敗: {result.get('message', '未知錯誤')}")
            
    except Exception as e:
        print(f"✗ 獲取狀態信息時出錯: {e}")

if __name__ == "__main__":
    test_status_query() 