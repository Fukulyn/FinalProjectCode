import requests
import json

def test_email_functionality():
    """測試郵件發送功能"""
    print("🧪 測試郵件發送功能...")
    
    # 測試資料
    test_data = {
        "email": "0966178691wang@gmail.com",  # 使用您自己的郵箱測試
        "vaccine_name": "DHPP 測試疫苗",
        "pet_name": "測試寵物",
        "due_date": "2024-12-31"
    }
    
    try:
        response = requests.post(
            "http://localhost:3001/api/send-vaccine-reminder",
            headers={"Content-Type": "application/json"},
            json=test_data,
            timeout=30
        )
        
        print(f"📊 回應狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 郵件發送成功!")
            print(f"📧 回應訊息: {result.get('message', 'N/A')}")
            return True
        else:
            error_data = response.json()
            print("❌ 郵件發送失敗!")
            print(f"🚫 錯誤訊息: {error_data.get('error', 'Unknown error')}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ 無法連接到後端服務器")
        print("請確認後端服務器在 http://localhost:3001 運行")
        return False
    except requests.exceptions.Timeout:
        print("⏱️ 請求超時（SMTP 連接可能較慢）")
        return False
    except Exception as e:
        print(f"❌ 測試過程中發生錯誤: {e}")
        return False

def test_health_check():
    """測試後端健康狀態"""
    print("\n🩺 測試後端健康狀態...")
    
    try:
        response = requests.get("http://localhost:3001/api/health", timeout=10)
        
        if response.status_code == 200:
            health_data = response.json()
            print("✅ 後端服務正常!")
            print(f"📊 狀態: {health_data.get('status', 'N/A')}")
            print(f"🕒 時間戳: {health_data.get('timestamp', 'N/A')}")
            
            services = health_data.get('services', {})
            print(f"💾 資料庫: {services.get('database', 'N/A')}")
            print(f"📧 郵件服務: {services.get('email', 'N/A')}")
            return True
        else:
            print(f"❌ 後端回應異常: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 健康檢查失敗: {e}")
        return False

if __name__ == "__main__":
    print("🚀 開始測試疫苗系統...")
    print("=" * 50)
    
    # 測試後端健康狀態
    health_ok = test_health_check()
    
    if health_ok:
        # 測試郵件功能
        email_ok = test_email_functionality()
        
        print("\n" + "=" * 50)
        print("📋 測試結果總結:")
        print(f"🩺 後端健康: {'✅ 正常' if health_ok else '❌ 異常'}")
        print(f"📧 郵件功能: {'✅ 正常' if email_ok else '❌ 異常'}")
        
        if health_ok and email_ok:
            print("\n🎉 所有測試通過！疫苗提醒系統已準備就緒！")
        else:
            print("\n⚠️ 部分功能異常，請檢查後端設定")
    else:
        print("\n❌ 後端服務異常，請檢查服務器狀態")
