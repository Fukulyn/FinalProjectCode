# PawsConnect 專案完整程式碼分析與功能解釋

## 📋 專案結構概覽

```
PawsConnect/
├── frontend/           # React + TypeScript 前端
├── backend/           # Python Flask + MQTT 後端
├── supabase/         # 資料庫遷移和政策
└── 配置檔案          # 各種設定檔案
```

## 🎯 核心技術架構

### 前端技術棧
- **React 18** + **TypeScript** - 主要框架
- **Vite** - 建置工具和開發服務器
- **Zustand** - 狀態管理
- **React Router** - 路由管理
- **Supabase Client** - 資料庫直接存取
- **Tailwind CSS** + **Chakra UI** - 樣式框架

### 後端技術棧
- **Python Flask** - RESTful API 服務
- **MQTT (paho-mqtt)** - 物聯網通訊
- **PostgreSQL** - 資料庫 (透過 Supabase)
- **SMTP** - 郵件服務

---

## 📱 前端頁面詳細分析

### 1. 認證系統 (Authentication)

#### 🔑 `authStore.ts` - 狀態管理核心
```typescript
// 使用 Zustand 建立全域認證狀態
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  // 登入功能實作
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    if (data.user) {
      set({
        user: {
          id: data.user.id,
          email: data.user.email!,
          created_at: data.user.created_at,
        },
      });
    }
  },

  // 其他認證方法...
}));
```

**核心概念解釋：**
- **Zustand**: 輕量級狀態管理，比 Redux 更簡單
- **Supabase Auth**: 處理 JWT Token、Session 管理
- **TypeScript Interface**: 確保類型安全

#### 🚪 `Login.tsx` - 登入頁面
```typescript
export default function Login() {
  const { signIn, signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (error) {
      setError(error.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* 表單 UI */}
    </form>
  );
}
```

**關鍵技術運用：**
- **React Hooks**: `useState` 管理本地狀態
- **表單處理**: 防止預設提交行為
- **錯誤處理**: try/catch 捕獲認證錯誤
- **導航**: React Router 的 `navigate`

### 2. 儀表板 (Dashboard)

#### 📊 `Dashboard.tsx` - 主控制台
```typescript
export default function Dashboard() {
  const { signOut, user } = useAuthStore();
  const [vaccineAlerts, setVaccineAlerts] = useState<VaccineRecord[]>([]);
  
  // 檢查即將到期的疫苗
  useEffect(() => {
    async function checkVaccineReminders() {
      // 查詢疫苗紀錄並帶出寵物名稱
      const { data: records } = await supabase
        .from('vaccine_records')
        .select('*, pets(name)');
        
      const soon = (records || []).filter(r => {
        const dueDate = r.next_due_date ? new Date(r.next_due_date) : null;
        if (!dueDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // 只顯示 0-7 天內到期的疫苗
        return diffDays >= 0 && diffDays <= 7;
      });
      
      setVaccineAlerts(soon);
    }
    
    checkVaccineReminders();
  }, []);

  const menuItems = [
    {
      title: '寵物檔案',
      icon: <PawPrint className="w-6 h-6" />,
      description: '管理寵物基本資訊',
      link: '/pets',
      color: 'bg-blue-500',
    },
    // 其他選單項目...
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 導航列和功能選單 */}
    </div>
  );
}
```

**核心功能解析：**
- **useEffect**: 組件載入時自動檢查疫苗提醒
- **Supabase 關聯查詢**: `select('*, pets(name)')` 帶出關聯資料
- **日期計算**: 計算疫苗到期天數
- **陣列過濾**: `filter()` 篩選即將到期的疫苗
- **響應式設計**: Tailwind CSS 實現手機版和桌面版適配

### 3. 寵物檔案管理 (Pet Profile)

#### 🐾 `PetProfile.tsx` - CRUD 操作完整實作
```typescript
export default function PetProfile() {
  const { user } = useAuthStore();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  
  // 品種資料結構
  const breedOptions = {
    狗: ['黃金獵犬', '拉布拉多', '德國牧羊犬', '比格犬', '柴犬'],
    貓: ['英國短毛貓', '美國短毛貓', '波斯貓', '暹羅貓', '緬因貓']
  };

  // 獲取寵物列表
  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPets(data || []);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setError('無法載入寵物資料，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 表單提交處理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      let error;
      
      if (editingPet) {
        // 更新現有寵物
        const updateData: Record<string, unknown> = {
          name: formData.name,
          type: formData.type,
          breed: formData.breed,
          birth_date: formData.birth_date,
          weight: parseFloat(formData.weight),
          location: formData.location,
        };
        
        if (formData.photo) {
          updateData.photos = [formData.photo];
        }
        
        ({ error } = await supabase
          .from('pets')
          .update(updateData)
          .eq('id', editingPet.id));
      } else {
        // 新增寵物
        const insertData: Record<string, unknown> = {
          user_id: user?.id,
          name: formData.name,
          type: formData.type,
          breed: formData.breed,
          birth_date: formData.birth_date,
          weight: parseFloat(formData.weight),
          location: formData.location,
        };
        
        if (formData.photo) {
          insertData.photos = [formData.photo];
        }
        
        ({ error } = await supabase.from('pets').insert([insertData]));
      }
      
      if (error) throw error;
      
      // 重置表單和重新載入資料
      setFormData({/* 初始化 */});
      setShowForm(false);
      setEditingPet(null);
      fetchPets();
    } catch (error: unknown) {
      // 錯誤處理
      setError('儲存寵物資料時發生錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  // 刪除寵物
  const deletePet = async (petId: string) => {
    if (!confirm('確定要刪除這隻寵物嗎？')) return;
    
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);
        
      if (error) throw error;
      fetchPets();
    } catch (error) {
      setError('刪除失敗，請重試');
    }
  };

  useEffect(() => {
    fetchPets();
  }, [user]);

  return (
    <div>
      {/* 寵物列表和表單 UI */}
    </div>
  );
}
```

**技術要點解析：**

1. **CRUD 操作完整實作**：
   - **Create**: `supabase.from('pets').insert()`
   - **Read**: `supabase.from('pets').select()`
   - **Update**: `supabase.from('pets').update().eq()`
   - **Delete**: `supabase.from('pets').delete().eq()`

2. **表單狀態管理**：
   - 新增和編輯共用同一個表單
   - 動態切換表單模式
   - 表單驗證和錯誤處理

3. **資料類型處理**：
   - TypeScript 介面定義
   - 型別轉換 (`parseFloat()`)
   - 可選欄位處理

### 4. 健康監測 (Health Monitor)

#### 💓 `HealthMonitor.tsx` - IoT 資料整合
```typescript
export default function HealthMonitor() {
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [realtimeData, setRealtimeData] = useState<any>(null);

  // 獲取健康記錄
  const fetchHealthRecords = async () => {
    if (!selectedPet) return;
    
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('pet_id', selectedPet)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHealthRecords(data || []);
    } catch (error) {
      console.error('Error fetching health records:', error);
    }
  };

  // 新增健康記錄
  const addHealthRecord = async () => {
    try {
      const { error } = await supabase.from('health_records').insert([
        {
          pet_id: selectedPet,
          temperature: parseFloat(formData.temperature),
          heart_rate: parseInt(formData.heart_rate),
          oxygen_level: parseFloat(formData.oxygen_level),
          recorded_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      
      setFormData({ temperature: '', heart_rate: '', oxygen_level: '' });
      setShowForm(false);
      fetchHealthRecords();
    } catch (error) {
      console.error('Error adding health record:', error);
    }
  };

  return (
    <div>
      {/* 健康數據圖表和記錄列表 */}
    </div>
  );
}
```

**技術特色：**
- **即時資料顯示**: 整合 MQTT 感測器資料
- **圖表視覺化**: 使用 Chart.js 顯示健康趨勢
- **資料過濾**: 按寵物和時間範圍篩選

### 5. 餵食記錄 (Feeding Record)

#### 🍽️ `FeedingRecord.tsx` - 複合功能頁面
```typescript
export default function FeedingRecord() {
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [mqttClient, setMqttClient] = useState<any>(null);
  const [feederStatus, setFeederStatus] = useState<'idle' | 'active'>('idle');

  // MQTT 連接設定
  useEffect(() => {
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      clientId: `pet_manager_${Math.random().toString(16).substr(2, 8)}`,
      username: 'petmanager',
      password: 'petmanager',
    });

    client.on('connect', () => {
      console.log('MQTT 連線成功');
      client.subscribe([
        'pet/manager/topic/start',
        'pet/manager/topic/stop',
        'pet/manager/topic/feeding',
        'pet/manager/topic/status'
      ]);
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('收到 MQTT 訊息:', topic, data);
        
        if (topic === 'pet/manager/topic/start') {
          setFeederStatus('active');
        } else if (topic === 'pet/manager/topic/stop') {
          setFeederStatus('idle');
        }
      } catch (error) {
        console.error('MQTT 訊息解析錯誤:', error);
      }
    });

    setMqttClient(client);
    
    return () => {
      client.end();
    };
  }, []);

  // 發送餵食器指令
  const sendFeederCommand = (cmd: string) => {
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish('pet/manager/topic/control', cmd);
      console.log(`已傳送指令: ${cmd}`);
    } else {
      console.log("MQTT 尚未連線，請稍後再試。");
    }
  };

  // 定時餵食設定
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('feeding_schedules').insert([
        {
          pet_id: selectedPet,
          time: scheduleData.time + ':00', // 加上秒位
          food_type: scheduleData.food_type,
          amount: parseFloat(scheduleData.amount),
          days: scheduleData.days,
          enabled: scheduleData.enabled,
        },
      ]);

      if (error) throw error;
      
      fetchSchedules();
      setShowScheduleForm(false);
    } catch (error) {
      console.error('Error adding schedule:', error);
    }
  };

  // 定時檢查功能
  const checkScheduledFeeding = () => {
    const now = new Date();
    const currentTime = now.toTimeString().substr(0, 8); // HH:MM:SS 格式
    const currentDay = now.toLocaleDateString('zh-TW', { weekday: 'long' });
    
    schedules.forEach(schedule => {
      if (schedule.enabled && 
          schedule.days.includes(currentDay) && 
          schedule.time === currentTime) {
        // 執行定時餵食
        sendFeederCommand('feed');
        recordScheduledFeeding(schedule);
      }
    });
  };

  return (
    <div>
      {/* 餵食控制、記錄列表、定時設定 */}
    </div>
  );
}
```

**複合功能實作：**
1. **MQTT 物聯網通訊**: 控制智能餵食器
2. **定時任務**: 自動餵食排程
3. **即時狀態監控**: 餵食器狀態追蹤
4. **營養計算**: 卡路里和營養成分計算

### 6. 疫苗記錄 (Vaccine Record)

#### 💉 `VaccineRecord.tsx` - 進階資料管理
```typescript
export default function VaccineRecord() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<VaccineRecord[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');

  // 核心疫苗資料
  const coreVaccines: CoreVaccine[] = [
    { id: 'cdv', category: '犬隻核心疫苗', species: '犬隻', name: '犬瘟熱', englishName: 'Canine distemper virus (CDV)' },
    { id: 'cav', category: '犬隻核心疫苗', species: '犬隻', name: '犬腺病毒', englishName: 'Canine adenovirus (CAV)' },
    // 更多疫苗資料...
  ];

  // 計算下次接種日期
  const calculateNextDueDate = (vaccineName: string, currentDate: string): string => {
    const date = new Date(currentDate);
    
    switch (vaccineName) {
      case 'DHPP (犬瘟熱等)':
      case 'FVRCP (貓鼻氣管炎等)':
        date.setFullYear(date.getFullYear() + 2);
        break;
      case '狂犬病':
      case '貓狂犬病':
        date.setFullYear(date.getFullYear() + 2);
        break;
      case '黃熱病 (Leptospirosis)':
      case '犬咳 (Bordetella)':
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    
    return date.toISOString().split('T')[0];
  };

  // 新增疫苗記錄
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPet) {
      alert('請選擇寵物');
      return;
    }

    try {
      const nextDueDate = calculateNextDueDate(formData.vaccine_name, formData.vaccination_date);
      
      const { data, error } = await supabase.from('vaccine_records').insert([
        {
          pet_id: selectedPet,
          vaccine_name: formData.vaccine_name,
          vaccination_date: formData.vaccination_date,
          next_due_date: nextDueDate,
          veterinarian: formData.veterinarian,
          clinic_name: formData.clinic_name,
          batch_number: formData.batch_number,
          status: '已接種'
        }
      ]).select();

      if (error) throw error;
      
      // 發送疫苗提醒郵件
      await sendVaccineReminder(data[0]);
      
      resetForm();
      fetchRecords();
    } catch (error) {
      console.error('Error adding vaccine record:', error);
    }
  };

  // 發送疫苗提醒
  const sendVaccineReminder = async (record: VaccineRecord) => {
    try {
      const res = await fetch('http://localhost:3001/api/send-vaccine-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          vaccine_name: record.vaccine_name,
          pet_name: pets.find(p => p.id === record.pet_id)?.name,
          due_date: record.next_due_date,
        }),
      });

      if (res.ok) {
        console.log('疫苗提醒郵件已發送');
      }
    } catch (error) {
      console.error('發送提醒失敗:', error);
    }
  };

  return (
    <div>
      {/* 疫苗記錄表格、新增表單、提醒設定 */}
    </div>
  );
}
```

**進階功能：**
1. **自動日期計算**: 根據疫苗類型計算下次接種日期
2. **郵件提醒整合**: 呼叫後端 API 發送提醒
3. **疫苗知識庫**: 預設常見疫苗資料
4. **狀態管理**: 追蹤疫苗接種狀態

---

## 🔧 後端服務詳細分析

### 1. Flask API 服務 (`app.py`)

#### 🌐 主要 API 端點
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app)  # 啟用跨域支援

# 資料庫連線
DATABASE_URL = "postgresql://postgres:password@host:5432/postgres?sslmode=require"
conn = psycopg2.connect(DATABASE_URL)

@app.route('/api/send-vaccine-reminder', methods=['POST'])
def send_vaccine_reminder():
    data = request.get_json()
    email = data.get('email')
    vaccine_name = data.get('vaccine_name')
    pet_name = data.get('pet_name', '您的寵物')
    due_date = data.get('due_date', '')
    
    # 防止重複發送機制
    import time
    cache_key = f"{email}_{vaccine_name}"
    current_time = time.time()
    
    if hasattr(send_vaccine_reminder, 'email_cache'):
        if cache_key in send_vaccine_reminder.email_cache:
            last_sent = send_vaccine_reminder.email_cache[cache_key]
            if current_time - last_sent < 60:  # 60秒內不重複發送
                return jsonify({'success': True, 'message': '郵件已在近期發送過'})
    else:
        send_vaccine_reminder.email_cache = {}
    
    # 記錄發送時間
    send_vaccine_reminder.email_cache[cache_key] = current_time
    
    try:
        success = send_email(
            to_email=email,
            subject=f"🐾 疫苗提醒：{pet_name} 的疫苗即將到期",
            vaccine_name=vaccine_name,
            pet_name=pet_name,
            due_date=due_date
        )
        
        if success:
            return jsonify({'success': True, 'message': f'疫苗提醒郵件已發送至 {email}'})
        else:
            return jsonify({'error': '郵件發送失敗'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def send_email(to_email, subject, vaccine_name, pet_name, due_date):
    """發送疫苗提醒郵件"""
    try:
        # 建立郵件內容
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = SMTP_USERNAME
        msg['To'] = to_email

        # HTML 郵件模板
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; padding: 30px; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 30px; }}
                .highlight {{ background: #e3f2fd; padding: 15px; 
                            border-left: 4px solid #2196f3; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🐾 PawsConnect 疫苗提醒</h1>
                </div>
                <div class="content">
                    <h2>親愛的寵物主人，您好！</h2>
                    <div class="highlight">
                        <h3>📋 疫苗資訊</h3>
                        <p><strong>🐾 寵物名稱：</strong>{pet_name}</p>
                        <p><strong>💉 疫苗名稱：</strong>{vaccine_name}</p>
                        <p><strong>📅 到期日期：</strong>{due_date}</p>
                    </div>
                    <p>請記得安排疫苗接種，以確保您的寵物健康！</p>
                </div>
            </div>
        </body>
        </html>
        """

        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)

        # 發送郵件
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        return True
        
    except Exception as e:
        print(f"郵件發送失敗: {e}")
        return False

if __name__ == '__main__':
    app.run(port=3001, debug=True)
```

**API 設計特點：**
1. **RESTful 設計**: 清晰的端點命名
2. **錯誤處理**: 完整的異常捕獲
3. **防重複機制**: 避免重複發送郵件
4. **HTML 郵件**: 美觀的郵件模板
5. **跨域支援**: CORS 設定

### 2. MQTT 物聯網服務

#### 📡 `mqtt_client.py` - 健康監測
```python
import paho.mqtt.client as mqtt
import json
from datetime import datetime
from supabase import create_client

# MQTT 配置
MQTT_BROKER_URL = "broker.emqx.io"
MQTT_PORT = 1883
MQTT_TOPIC = "pet/manager/topic/collar"  # 寵物項圈主題

# Supabase 配置
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def store_health_record(payload):
    """儲存健康記錄到 Supabase"""
    try:
        data = json.loads(payload)
        
        health_record = {
            'pet_id': data['pet_id'],
            'temperature': data.get('temperature'),
            'heart_rate': data.get('heart_rate'),
            'oxygen_level': data.get('oxygen_level'),
            'power': data.get('power'),
            'steps_value': data.get('steps_value'),
            'recorded_at': datetime.now().isoformat()
        }
        
        # 使用 service role 插入資料
        response = supabase.table('health_records').insert(health_record).execute()
        print(f"健康記錄已儲存: {health_record}")
        
    except Exception as e:
        print(f"儲存健康記錄時出錯: {e}")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("已成功連接到 MQTT Broker!")
        client.subscribe(MQTT_TOPIC)
        print(f"已訂閱主題: {MQTT_TOPIC}")
    else:
        print(f"連接失敗，代碼: {rc}")

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode('utf-8')
        print(f"收到訊息: {msg.topic} -> {payload}")
        
        if msg.topic == MQTT_TOPIC:
            store_health_record(payload)
            
    except Exception as e:
        print(f"處理訊息時出錯: {e}")

# 建立 MQTT 客戶端
client = mqtt.Client(CallbackAPIVersion.VERSION1)
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.on_connect = on_connect
client.on_message = on_message

if __name__ == "__main__":
    try:
        client.connect(MQTT_BROKER_URL, MQTT_PORT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("程式已停止")
        client.disconnect()
```

#### 🍽️ `mqtt_feeding_client.py` - 餵食器控制
```python
def store_feeding_record(timestamp, pet_id, amount, weight, laser_distance, power, food_type, calories):
    """儲存餵食記錄到 Supabase"""
    try:
        data = {
            'fed_at': timestamp,
            'pet_id': pet_id,
            'amount': amount,           # 本次餵食飼料重量
            'weight': weight,           # 廚餘重量
            'laser_distance': laser_distance, # 測量飼料量的雷射距離
            'power': power,
            'food_type': food_type,
            'calories': calories
        }
        
        response = supabase.table('feeding_records').insert(data).execute()
        print(f"餵食紀錄已儲存: {data}")
        
    except Exception as e:
        print(f"儲存餵食紀錄時出錯: {e}")

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode('utf-8')
        data = json.loads(payload)
        
        # 解析 MQTT 訊息並對映到資料庫欄位
        if 'pet_id' in data and 'Weight' in data:
            store_feeding_record(
                timestamp=datetime.now().isoformat(),
                pet_id=data['pet_id'],
                amount=data['Weight'],  # MQTT 的 Weight 對映到 amount
                weight=data.get('height_waste', 0),  # 廚餘重量
                laser_distance=data.get('height_feed', 0),  # 雷射距離
                power=data.get('power', 0),
                food_type=data.get('food_type', '乾飼料'),
                calories=data.get('calories', 0)
            )
            
    except Exception as e:
        print(f"處理餵食訊息時出錯: {e}")
```

**MQTT 服務特點：**
1. **即時通訊**: 低延遲的 IoT 設備通訊
2. **資料解析**: JSON 訊息解析和欄位對映
3. **錯誤復原**: 連線中斷自動重連
4. **資料持久化**: 即時儲存到資料庫

---

## 🗄️ 資料庫設計與安全

### 1. Supabase 資料表結構

#### 核心資料表
```sql
-- 寵物資料表
CREATE TABLE public.pets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL CHECK (type IN ('狗', '貓')),
    breed text,
    birth_date date,
    weight numeric,
    photos text[],
    location text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 健康記錄表
CREATE TABLE public.health_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    temperature numeric,
    heart_rate integer,
    oxygen_level numeric,
    power integer,
    steps_value integer,
    recorded_at timestamptz DEFAULT now()
);

-- 餵食記錄表
CREATE TABLE public.feeding_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    food_type text NOT NULL,
    amount numeric NOT NULL,
    weight numeric,
    laser_distance numeric,
    power integer,
    calories numeric,
    fed_at timestamptz DEFAULT now(),
    scheduled boolean DEFAULT false
);

-- 疫苗記錄表
CREATE TABLE public.vaccine_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    vaccine_name text NOT NULL,
    vaccination_date date NOT NULL,
    next_due_date date,
    veterinarian text,
    clinic_name text,
    batch_number text,
    status text DEFAULT '待接種' CHECK (status IN ('待接種', '已接種', '已過期')),
    notes text,
    created_at timestamptz DEFAULT now()
);
```

### 2. Row Level Security (RLS) 政策

```sql
-- 啟用所有表的 RLS
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_records ENABLE ROW LEVEL SECURITY;

-- 寵物表 RLS 政策
CREATE POLICY "Users can manage their own pets" ON public.pets
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 健康記錄 RLS 政策
CREATE POLICY "Users can access their pets health records" ON public.health_records
    FOR ALL TO authenticated
    USING (
        pet_id IN (
            SELECT id FROM public.pets WHERE user_id = auth.uid()
        )
    );

-- 餵食記錄 RLS 政策
CREATE POLICY "Users can access their pets feeding records" ON public.feeding_records
    FOR ALL TO authenticated
    USING (
        pet_id IN (
            SELECT id FROM public.pets WHERE user_id = auth.uid()
        )
    );
```

---

## 🔄 狀態管理與資料流

### 1. Zustand 狀態管理架構

```typescript
// 全域認證狀態
interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// 使用模式
const { user, signIn, signOut } = useAuthStore();
```

### 2. React 本地狀態管理

```typescript
// 表單狀態
const [formData, setFormData] = useState({
  name: '',
  type: '',
  breed: '',
  // ...其他欄位
});

// 載入狀態
const [loading, setLoading] = useState(true);

// 錯誤狀態
const [error, setError] = useState<string | null>(null);

// 列表資料
const [pets, setPets] = useState<Pet[]>([]);
```

### 3. 資料流架構

```
使用者互動 → React Component → Supabase Client → PostgreSQL
     ↓              ↓              ↓              ↓
   UI 更新 ← State 更新 ← 資料返回 ← RLS 過濾
```

---

## 🎨 UI/UX 設計架構

### 1. 響應式設計策略

```typescript
// Tailwind CSS 響應式類別
<div className="
  grid 
  grid-cols-1 md:grid-cols-2 lg:grid-cols-3 
  gap-4 md:gap-6 
  p-4 md:p-6 lg:p-8
">
```

### 2. 組件化設計

```typescript
// 可重用的載入組件
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
  </div>
);

// 錯誤顯示組件
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    {message}
  </div>
);
```

---

## 🔧 建置與部署

### 1. Vite 建置配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@chakra-ui/react']
        }
      }
    }
  }
})
```

### 2. 環境變數管理

```typescript
// .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

// 在代碼中使用
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

## 📊 效能優化策略

### 1. React 效能優化

```typescript
// 使用 React.memo 避免不必要的重渲染
const PetCard = React.memo(({ pet }: { pet: Pet }) => {
  return <div>{pet.name}</div>;
});

// 使用 useCallback 優化函數
const handleSubmit = useCallback(async (data: FormData) => {
  // 處理邏輯
}, [dependency]);

// 使用 useMemo 優化計算
const filteredPets = useMemo(() => {
  return pets.filter(pet => pet.type === selectedType);
}, [pets, selectedType]);
```

### 2. 資料庫查詢優化

```typescript
// 分頁查詢
const { data, error } = await supabase
  .from('health_records')
  .select('*')
  .eq('pet_id', petId)
  .order('recorded_at', { ascending: false })
  .range(0, 49); // 限制 50 筆

// 索引使用
CREATE INDEX idx_health_records_pet_id_recorded_at 
ON health_records(pet_id, recorded_at DESC);
```

---

這個完整的程式碼分析涵蓋了 PawsConnect 專案的所有核心功能和技術實作細節。每個部分都展示了現代 Web 開發的最佳實踐，包括 TypeScript 類型安全、React Hooks 使用、Supabase 整合、MQTT 物聯網通訊、以及完整的 CRUD 操作。
