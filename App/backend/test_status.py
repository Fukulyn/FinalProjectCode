#!/usr/bin/env python3
"""
測試狀態查詢功能的腳本
"""

import requests
import time
import json

# 後端 API 基礎 URL
base_url = "http://localhost:3001"

def test_status_apis():
    print("=== 測試餵食器狀態 API ===")
    
    # 測試 1: 查詢狀態
    print("\n1. 測試查詢狀態 API...")
    try:
        response = requests.get(f"{base_url}/api/check_status")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"回應: {json.dumps(result, indent=2, ensure_ascii=False)}")
        else:
            print(f"錯誤回應: {response.text}")
    except Exception as e:
        print(f"查詢狀態失敗: {e}")
    
    # 等待一秒讓狀態更新
    print("\n等待狀態更新...")
    time.sleep(2)
    
    # 測試 2: 獲取狀態
    print("\n2. 測試獲取狀態 API...")
    try:
        response = requests.get(f"{base_url}/api/get_status")
        print(f"狀態碼: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"回應: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            # 檢查狀態資料結構
            if result.get('success') and result.get('data', {}).get('status'):
                status_data = result['data']['status']
                print(f"\n狀態資料解析:")
                print(f"  系統狀態: {status_data.get('system_status', 'N/A')}")
                print(f"  當前重量: {status_data.get('angle', 'N/A')}g")
                print(f"  飼料高度: {status_data.get('height_feed', 'N/A')}mm")
                print(f"  廚餘高度: {status_data.get('height_waste', 'N/A')}mm")
                print(f"  電量: {status_data.get('power', 'N/A')}V")
                print(f"  食物類型: {status_data.get('food_type', 'N/A')}")
                print(f"  卡路里: {status_data.get('calories', 'N/A')}kcal")
                
                if status_data.get('scheduled_feeding'):
                    scheduled = status_data['scheduled_feeding']
                    print(f"  定時餵食: {scheduled.get('datetime', 'N/A')} ({scheduled.get('grams', 'N/A')}g)")
                else:
                    print(f"  定時餵食: 無設定")
            else:
                print("尚未收到狀態資料")
        else:
            print(f"錯誤回應: {response.text}")
    except Exception as e:
        print(f"獲取狀態失敗: {e}")
    
    # 測試 3: 連續查詢測試
    print("\n3. 測試連續查詢...")
    for i in range(3):
        print(f"\n第 {i+1} 次查詢:")
        try:
            # 查詢狀態
            check_response = requests.get(f"{base_url}/api/check_status")
            if check_response.status_code == 200:
                print("  ✓ 查詢狀態成功")
                
                # 等待一秒
                time.sleep(1)
                
                # 獲取狀態
                get_response = requests.get(f"{base_url}/api/get_status")
                if get_response.status_code == 200:
                    result = get_response.json()
                    if result.get('success') and result.get('data', {}).get('status'):
                        status = result['data']['status']
                        print(f"  ✓ 獲取狀態成功 - 系統狀態: {status.get('system_status', 'N/A')}")
                    else:
                        print("  ⚠ 尚未收到狀態資料")
                else:
                    print(f"  ✗ 獲取狀態失敗: {get_response.status_code}")
            else:
                print(f"  ✗ 查詢狀態失敗: {check_response.status_code}")
        except Exception as e:
            print(f"  ✗ 查詢失敗: {e}")
        
        if i < 2:  # 最後一次不需要等待
            time.sleep(2)

if __name__ == "__main__":
    test_status_apis() 