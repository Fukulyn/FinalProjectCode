import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Utensils, Plus, Loader2, Calendar, Clock, Timer, Settings, Play, Pause, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pet, FeedingRecord } from '../types';
import mqtt from "mqtt";

export default function FeedingRecordPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // 使用本地時間而不是 UTC 時間，修正時區問題
    const localTime = new Date();
    const localISOString = new Date(
      localTime.getTime() - localTime.getTimezoneOffset() * 60000
    ).toISOString();
    return localISOString.split("T")[0];
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formData, setFormData] = useState({
    food_type: "",
    amount: "",
    calories: "",
  });
  const [scheduleData, setScheduleData] = useState({
    time: '',
    food_type: '',
    amount: '',
    days: [] as string[],
    enabled: true,
  });
  const [schedules, setSchedules] = useState<Array<{
    id: string;
    pet_id: string;
    time: string;
    food_type: string;
    amount: number;
    days: string[];
    enabled: boolean;
    created_at: string;
  }>>([]);
  const [activeSchedules, setActiveSchedules] = useState<Set<string>>(new Set());
  const [nutritionCalculator, setNutritionCalculator] = useState({
    petType: "dog",
    weight: "",
    activityLevel: "normal",
    age: "adult",
  });
  interface FoodData {
    food_type: string;
    protein?: number;
    fat?: number;
    fiber?: number;
    calcium?: number;
    phosphorus?: number;
    moisture?: number;
    calories?: number;
  }
  const [foodList, setFoodList] = useState<FoodData[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodData | null>(null);
  const [nutritionResult, setNutritionResult] = useState<{
    protein: number;
    fat: number;
    fiber: number;
    calcium: number;
    phosphorus: number;
    moisture: number;
    calories?: number;
  } | null>(null);
  const location = useLocation();

  // MQTT 相關
  const MQTT_BROKER = "wss://broker.hivemq.com:8884/mqtt";
  const MQTT_TOPIC = "feeder/command";
  const MQTT_USERNAME = "petmanager";
  const MQTT_PASSWORD = "petmanager";
  const mqttClientRef = React.useRef<mqtt.MqttClient | null>(null);

  // 餵食器狀態管理
  const [feederStatus, setFeederStatus] = useState<'idle' | 'active'>('idle');
  const [lastStatusUpdate, setLastStatusUpdate] = useState<Date | null>(null);

  // 定時器相關
  const scheduleTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
    });
    mqttClientRef.current = client;

    // 監聽餵食器狀態更新
    client.on('connect', () => {
      console.log('MQTT 已連線');
      // 訂閱狀態更新主題
      client.subscribe('pet/manager/topic/start');
      client.subscribe('pet/manager/topic/stop');
      client.subscribe('pet/manager/topic/feeding');
      client.subscribe('pet/manager/topic/status');
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('收到 MQTT 訊息:', topic, data);
        
        if (topic === 'pet/manager/topic/start') {
          setFeederStatus('active');
          setLastStatusUpdate(new Date());
        } else if (topic === 'pet/manager/topic/stop') {
          setFeederStatus('idle');
          setLastStatusUpdate(new Date());
        } else if (topic === 'pet/manager/topic/feeding') {
          if (data.status === 'error') {
            alert(`餵食器錯誤: ${data.message}`);
          }
        } else if (topic === 'pet/manager/topic/status') {
          if (data.system_status) {
            setFeederStatus(data.system_status);
            setLastStatusUpdate(new Date());
          }
        }
      } catch (error) {
        console.error('MQTT 訊息解析錯誤:', error);
      }
    });

    return () => {
      client.end();
    };
  }, []);

  const sendFeederCommand = (cmd: string) => {
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      mqttClientRef.current.publish(MQTT_TOPIC, cmd);
      console.log(`已傳送指令: ${cmd}`);
    } else {
      console.log("MQTT 尚未連線，請稍後再試。");
    }
  };

  // 檢查餵食器是否已啟動
  const isFeederActive = () => {
    return feederStatus === 'active';
  };

  // 處理餵食器啟動
  const handleStartFeeder = () => {
    if (isFeederActive()) {
      alert("餵食器已經啟動中，無需重複啟動");
      return;
    }
    alert("正在啟動餵食器...");
    sendFeederCommand("start");
  };

  // 處理餵食器停止
  const handleStopFeeder = () => {
    if (!isFeederActive()) {
      alert("餵食器已經停止，無需重複停止");
      return;
    }
    alert("正在停止餵食器...");
    sendFeederCommand("stop");
  };

  // 處理需要啟動狀態的功能
  const handleActiveCommand = (cmd: string, actionName: string) => {
    if (!isFeederActive()) {
      alert(`餵食器未啟動，無法執行${actionName}。請先啟動餵食器。`);
      return;
    }
    alert(`已發送${actionName}指令`);
    sendFeederCommand(cmd);
  };

  // 定時餵食相關函數
  const fetchSchedules = async () => {
    if (!selectedPet) return;
    try {
      const { data, error } = await supabase
        .from('feeding_schedules')
        .select('*')
        .eq('pet_id', selectedPet)
        .order('time');

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  // 修正定時設定表單 - 包含秒的輸入
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 自動將時間的秒位設為 00（如果沒有輸入秒）
    let adjustedTime = scheduleData.time;
    if (adjustedTime && adjustedTime.length === 5) {
      // 如果只輸入 HH:MM，自動加上 :00
      adjustedTime = adjustedTime + ':00';
    }
    
    try {
      const { error } = await supabase.from('feeding_schedules').insert([
        {
          pet_id: selectedPet,
          time: adjustedTime, // 使用包含秒的時間
          food_type: scheduleData.food_type,
          amount: parseFloat(scheduleData.amount),
          days: scheduleData.days,
          enabled: scheduleData.enabled,
        },
      ]);

      if (error) throw error;

      setScheduleData({
        time: '',
        food_type: '',
        amount: '',
        days: [],
        enabled: true,
      });
      setShowScheduleForm(false);
      fetchSchedules();
      alert('定時餵食設定已儲存');
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert('儲存失敗，請重試');
    }
  };

  // 修正時間輸入處理 - 支援秒的輸入
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let timeValue = e.target.value;
    
    // 如果輸入的是 HH:MM 格式，自動加上 :00
    if (timeValue && timeValue.length === 5 && timeValue.includes(':')) {
      timeValue = timeValue + ':00';
    }
    
    setScheduleData({ ...scheduleData, time: timeValue });
  };

  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('feeding_schedules')
        .update({ enabled })
        .eq('id', scheduleId);

      if (error) throw error;
      fetchSchedules();
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('確定要刪除此定時餵食設定嗎？')) return;
    
    try {
      const { error } = await supabase
        .from('feeding_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      fetchSchedules();
      alert('定時餵食設定已刪除');
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleDayToggle = (day: string) => {
    setScheduleData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };



  // 記錄定時餵食到資料庫 - 修正時區問題
  const recordScheduledFeeding = async (schedule: {
    id: string;
    pet_id: string;
    time: string;
    food_type: string;
    amount: number;
    days: string[];
    enabled: boolean;
    created_at: string;
  }) => {
    try {
      // 使用本地時間而不是 UTC 時間
      const localTime = new Date();
      const localISOString = new Date(
        localTime.getTime() - (localTime.getTimezoneOffset() * 60000)
      ).toISOString();
      
      const { error } = await supabase.from('feeding_records').insert([
        {
          pet_id: schedule.pet_id,
          food_type: schedule.food_type,
          amount: schedule.amount,
          fed_at: localISOString, // 使用修正後的本地時間
          scheduled: true,
        },
      ]);

      if (error) throw error;
      console.log('定時餵食記錄已儲存');
      
      // 重新載入餵食紀錄
      fetchFeedingRecords();
    } catch (error) {
      console.error('Error recording scheduled feeding:', error);
    }
  };

  // 啟動定時檢查
  useEffect(() => {
    console.log('啟動定時檢查，當前定時設定數量:', schedules.length);
    
    // 每分鐘檢查一次定時餵食
    checkIntervalRef.current = setInterval(() => {
      console.log('執行定時檢查...');
      checkScheduledFeeding();
    }, 60 * 1000);
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [schedules, activeSchedules]);

  // 清理定時器
  useEffect(() => {
    return () => {
      scheduleTimersRef.current.forEach(timer => clearTimeout(timer));
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .order("name");

      if (error) throw error;
      setPets(data || []);

      const params = new URLSearchParams(location.search);
      const petId = params.get("pet");

      if (petId && data?.some((p) => p.id === petId)) {
        setSelectedPet(petId);
      } else if (data && data.length > 0) {
        setSelectedPet(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching pets:", error);
    }
  };

  const fetchPetDetails = async () => {
    if (!selectedPet) return;
    try {
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("id", selectedPet)
        .single();

      if (error) throw error;
      if (data) {
        setNutritionCalculator({
          ...nutritionCalculator,
          petType: data.type,
          weight: data.weight.toString(),
        });
      }
    } catch (error) {
      console.error("Error fetching pet details:", error);
    }
  };

  const fetchFeedingRecords = useCallback(async () => {
    if (!selectedPet) return;
    try {
      // 使用本地時間而不是 UTC 時間，修正時區問題
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const localStartDate = new Date(
        startDate.getTime() - startDate.getTimezoneOffset() * 60000
      );

      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      const localEndDate = new Date(
        endDate.getTime() - endDate.getTimezoneOffset() * 60000
      );

      const { data, error } = await supabase
        .from("feeding_records")
        .select("*")
        .eq("pet_id", selectedPet)
        .gte("fed_at", localStartDate.toISOString())
        .lte("fed_at", localEndDate.toISOString())
        .order("fed_at", { ascending: false });

      if (error) throw error;
      const processedData = data.map((item) => {
        if (item.amount === 45) {
          return { ...item, amount: "150g" };
        }
        return item;
      });
      setRecords(processedData || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching feeding records:", error);
    }
  }, [selectedPet, selectedDate]);

  const fetchFoodList = async () => {
    const { data, error } = await supabase.from("food_data").select("*");
    if (!error && data) setFoodList(data);
  };

  useEffect(() => {
    fetchPets();
    fetchFoodList();
  }, [location.search]);

  useEffect(() => {
    if (!selectedPet) return;

    setIsRefreshing(true);
    const fetchData = async () => {
      await Promise.all([
        fetchFeedingRecords(),
        fetchPetDetails(),
        fetchSchedules(),
      ]);
      setIsRefreshing(false);
    };

    fetchData();

    const intervalId = setInterval(() => {
      setIsRefreshing(true);
      fetchData();
    }, 1000); // 每秒刷新一次

    return () => clearInterval(intervalId);
  }, [selectedPet, selectedDate, fetchFeedingRecords]);

  // 定期檢查餵食器狀態
  useEffect(() => {
    const checkFeederStatus = () => {
      if (mqttClientRef.current && mqttClientRef.current.connected) {
        sendFeederCommand("status");
      }
    };

    // 每30秒檢查一次餵食器狀態
    const statusInterval = setInterval(checkFeederStatus, 30000);
    
    // 初始檢查
    checkFeederStatus();

    return () => clearInterval(statusInterval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const food = foodList.find((f) => f.food_type === formData.food_type);
    let calories = 0;
    if (food && formData.amount) {
      const ratio = parseFloat(formData.amount) / 100;
      const protein = (food.protein || 0) * ratio;
      const fat = (food.fat || 0) * ratio;
      const carbs = Math.max(
        0,
        (100 -
          ((food.protein || 0) +
            (food.fat || 0) +
            (food.fiber || 0) +
            (food.moisture || 0))) *
          ratio
      );
      calories = protein * 4 + fat * 9 + carbs * 4;
    }
    try {
      // 使用本地時間而不是 UTC 時間，修正時區問題
      const localTime = new Date();
      const localISOString = new Date(
        localTime.getTime() - localTime.getTimezoneOffset() * 60000
      ).toISOString();

      const { error } = await supabase.from("feeding_records").insert([
        {
          pet_id: selectedPet,
          food_type: formData.food_type,
          amount: parseFloat(formData.amount),
          calories: Math.round(calories),
          fed_at: localISOString, // 使用修正後的本地時間
        },
      ]);

      if (error) throw error;

      setFormData({
        food_type: "",
        amount: "",
        calories: "",
      });
      setShowForm(false);
      fetchFeedingRecords();
    } catch (error) {
      console.error("Error adding feeding record:", error);
      alert(JSON.stringify(error));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW");
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    // 使用本地時間而不是 UTC 時間，修正時區問題
    const localISOString = new Date(
      currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
    ).toISOString();
    setSelectedDate(localISOString.split("T")[0]);
  };

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    // 使用本地時間而不是 UTC 時間，修正時區問題
    const localISOString = new Date(
      currentDate.getTime() - currentDate.getTimezoneOffset() * 60000
    ).toISOString();
    setSelectedDate(localISOString.split("T")[0]);
  };

  useEffect(() => {
    if (selectedFood && formData.amount) {
      const ratio = parseFloat(formData.amount) / 100;
      const protein = (selectedFood.protein || 0) * ratio;
      const fat = (selectedFood.fat || 0) * ratio;
      const fiber = (selectedFood.fiber || 0) * ratio;
      const calcium = (selectedFood.calcium || 0) * ratio;
      const phosphorus = (selectedFood.phosphorus || 0) * ratio;
      const moisture = (selectedFood.moisture || 0) * ratio;
      const carbs = Math.max(
        0,
        (100 -
          ((selectedFood.protein || 0) +
            (selectedFood.fat || 0) +
            (selectedFood.fiber || 0) +
            (selectedFood.moisture || 0))) *
          ratio
      );
      const calories = protein * 4 + fat * 9 + carbs * 4;
      setNutritionResult({
        protein,
        fat,
        fiber,
        calcium,
        phosphorus,
        moisture,
        calories,
      });
    } else {
      setNutritionResult(null);
    }
  }, [selectedFood, formData.amount]);

  // 修正時間顯示格式 - 處理不同類型的時間字串
  const formatTime = (dateString: string | null | undefined) => {
    try {
      // 檢查輸入是否有效
      if (!dateString) {
        return '--:--:--';
      }
      
      // 如果是時間字串格式 (HH:MM 或 HH:MM:SS)，直接返回時間部分
      if (dateString.includes(':') && dateString.length <= 8) {
        return dateString.substring(0, 5); // 只返回 HH:MM
      }
      
      // 如果是日期字串，則進行時區轉換
      const date = new Date(dateString);
      
      // 檢查是否為有效日期
      if (isNaN(date.getTime())) {
        console.error('無效的日期格式:', dateString);
        return '--:--:--';
      }
      
      // 直接減去 8 小時來修正時差
      const correctedDate = new Date(date.getTime() - (8 * 60 * 60 * 1000));
      
      return correctedDate.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 使用 24 小時制
      });
    } catch (error) {
      console.error('時間格式化錯誤:', error, '輸入值:', dateString);
      return '--:--:--';
    }
  };

  // 修正時間顯示格式 - 確保正確顯示
  const formatScheduleTime = (timeString: string | null | undefined) => {
    if (!timeString) {
      return '--:--';
    }
    
    // 定時餵食的時間格式是 HH:MM:SS，只顯示 HH:MM
    const timeOnly = timeString.substring(0, 5);
    
    return timeOnly;
  };

  // 格式化日期顯示
  const formatDays = (days: string[]) => {
    const dayMap: { [key: string]: string } = {
      'monday': '週一',
      'tuesday': '週二',
      'wednesday': '週三',
      'thursday': '週四',
      'friday': '週五',
      'saturday': '週六',
      'sunday': '週日'
    };
    
    if (days.length === 0) return '無';
    if (days.length === 7) return '每天';
    
    return days.map(day => dayMap[day] || day).join('、');
  };


  // 簡化的定時檢查函數 - 移除複雜的時間轉換
  const checkScheduledFeeding = () => {
    const now = new Date();
    
    // 修正時間格式：使用 24 小時制，包含秒，格式為 HH:MM:SS
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                    now.getMinutes().toString().padStart(2, '0') + ':' +
                    now.getSeconds().toString().padStart(2, '0');
    
    // 修正日期格式：確保是英文小寫
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // 生成今天的日期字串，用於檢查是否已執行
    const todayDate = now.toDateString();
    
    // 簡化的調試日誌
    console.log(`檢查時間: ${currentTime}, 日期: ${currentDay}`);
    
    schedules.forEach((schedule) => {
      // 直接使用設定的時間，不進行轉換
      const scheduleTime = schedule.time;
      
      console.log(`設定時間: ${scheduleTime}, 當前時間: ${currentTime}, 匹配: ${scheduleTime === currentTime}`);
      
      if (schedule.enabled && 
          scheduleTime === currentTime && 
          schedule.days.includes(currentDay)) {
      
      // 檢查是否已經在今天執行過
      const scheduleKey = `${schedule.id}-${todayDate}`;
      const alreadyExecuted = activeSchedules.has(scheduleKey);
      
      if (!alreadyExecuted) {
        console.log(`執行定時餵食: ${schedule.time} - ${schedule.food_type} - ${schedule.amount}g`);
        
        // 立即標記為已執行
        setActiveSchedules(prev => {
          const newSet = new Set(prev);
          newSet.add(scheduleKey);
          return newSet;
        });
        
        // 先啟動餵食器
        sendFeederCommand("start");
        
        // 等待1秒後發送餵食指令
        setTimeout(() => {
          sendFeederCommand(`feed_until ${schedule.amount}`);
          // 記錄定時餵食到資料庫
          recordScheduledFeeding(schedule);
        }, 1000);
        
        // 每天凌晨清除標記
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
          setActiveSchedules(prev => {
            const newSet = new Set(prev);
            newSet.delete(scheduleKey);
            return newSet;
          });
        }, timeUntilMidnight);
      }
    }
    });
  }

  // 啟動定時檢查 - 改為每秒檢查一次，因為現在包含秒
  useEffect(() => {
    // 每秒檢查一次定時餵食，因為現在需要精確到秒
    checkIntervalRef.current = setInterval(() => {
      checkScheduledFeeding();
    }, 1000); // 每秒檢查一次
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [schedules]);

  // 移除所有調試函數，只保留必要的測試功能

  // 新增編輯狀態
  const [editingSchedule, setEditingSchedule] = useState<{
    id: string;
    pet_id: string;
    time: string;
    food_type: string;
    amount: number;
    days: string[];
    enabled: boolean;
    created_at: string;
  } | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // 新增編輯函數
  const handleEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSchedule) return;
    
    // 自動將時間的秒位設為 00（如果沒有輸入秒）
    let adjustedTime = scheduleData.time;
    if (adjustedTime && adjustedTime.length === 5) {
      adjustedTime = adjustedTime + ':00';
    }
    
    try {
      const { error } = await supabase
        .from('feeding_schedules')
        .update({
          time: adjustedTime,
          food_type: scheduleData.food_type,
          amount: parseFloat(scheduleData.amount),
          days: scheduleData.days,
          enabled: scheduleData.enabled,
        })
        .eq('id', editingSchedule.id);

      if (error) throw error;

      setScheduleData({
        time: '',
        food_type: '',
        amount: '',
        days: [],
        enabled: true,
      });
      setEditingSchedule(null);
      setShowEditForm(false);
      fetchSchedules();
      alert('定時餵食設定已更新');
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('更新失敗，請重試');
    }
  };

  // 新增開始編輯函數
  const startEdit = (schedule: {
    id: string;
    pet_id: string;
    time: string;
    food_type: string;
    amount: number;
    days: string[];
    enabled: boolean;
    created_at: string;
  }) => {
    setEditingSchedule(schedule);
    setScheduleData({
      time: schedule.time,
      food_type: schedule.food_type,
      amount: schedule.amount.toString(),
      days: schedule.days,
      enabled: schedule.enabled,
    });
    setShowEditForm(true);
  };

  // 新增取消編輯函數
  const cancelEdit = () => {
    setEditingSchedule(null);
    setShowEditForm(false);
    setScheduleData({
      time: '',
      food_type: '',
      amount: '',
      days: [],
      enabled: true,
    });
  };

  if (pets.length === 0 && !selectedPet) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <nav className="bg-white shadow mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span>返回主頁</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <label htmlFor="pet-select" className="sr-only">
                選擇寵物
              </label>
              <select
                id="pet-select"
                value={selectedPet}
                onChange={(e) => setSelectedPet(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                新增紀錄
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">餵食紀錄</h1>
            <p className="mt-1 text-gray-500">記錄寵物的飲食狀況</p>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            <span>
              {lastUpdated
                ? `最後更新：${lastUpdated.toLocaleTimeString("zh-TW")}`
                : "載入中..."}
            </span>
          </div>
        </div>

        {/* 日期選擇器 */}
        <div className="bg-white rounded-lg shadow mb-8 p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToPreviousDay}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="前往前一天"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="border-none focus:ring-0 text-lg font-medium text-center"
                aria-label="選擇日期"
                title="選擇日期"
                placeholder="選擇日期"
              />
            </div>

            <button
              onClick={goToNextDay}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="前往後一天"
              title="前往後一天"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 新營養計算區塊 */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            飼料營養計算
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                飼料品牌
              </label>
              <select
                title="選擇飼料品牌"
                value={formData.food_type}
                onChange={(e) => {
                  setFormData({ ...formData, food_type: e.target.value });
                  setSelectedFood(
                    foodList.find((f) => f.food_type === e.target.value) || null
                  );
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">請選擇飼料品牌</option>
                {foodList.map((food) => (
                  <option key={food.food_type} value={food.food_type}>
                    {food.food_type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                餵食量 (g)
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="請輸入餵食量"
              />
            </div>
          </div>
          {nutritionResult && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">蛋白質</p>
                <p className="text-lg font-semibold">
                  {nutritionResult.protein.toFixed(2)} g
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">脂肪</p>
                <p className="text-lg font-semibold">
                  {nutritionResult.fat.toFixed(2)} g
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">纖維</p>
                <p className="text-lg font-semibold">
                  {nutritionResult.fiber.toFixed(2)} g
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">鈣</p>
                <p className="text-lg font-semibold">
                  {nutritionResult.calcium.toFixed(2)} g
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">磷</p>
                <p className="text-lg font-semibold">
                  {nutritionResult.phosphorus.toFixed(2)} g
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">水分</p>
                <p className="text-lg font-semibold">
                  {nutritionResult.moisture.toFixed(2)} g
                </p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg col-span-2 md:col-span-3">
                <p className="text-sm text-gray-500">大約熱量</p>
                <p className="text-lg font-semibold">
                  {nutritionResult.calories
                    ? nutritionResult.calories.toFixed(1)
                    : "--"}{" "}
                  kcal
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 餵食器控制區塊 */}
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">餵食器控制</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isFeederActive() ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {isFeederActive() ? '已啟動' : '未啟動'}
              </span>
              {lastStatusUpdate && (
                <span className="text-xs text-gray-500">
                  (更新於 {lastStatusUpdate.toLocaleTimeString('zh-TW')})
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-2">
            <button 
              className={`px-4 py-2 text-white rounded transition-colors ${
                isFeederActive() 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`} 
              onClick={handleStartFeeder}
            >
              {isFeederActive() ? '已啟動' : '啟動餵食器'}
            </button>
            <button 
              className={`px-4 py-2 text-white rounded transition-colors ${
                !isFeederActive() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'
              }`} 
              onClick={handleStopFeeder}
              disabled={!isFeederActive()}
            >
              停止餵食器
            </button>
            <button 
              className={`px-4 py-2 text-white rounded transition-colors ${
                !isFeederActive() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`} 
              onClick={() => handleActiveCommand("feed", "執行一次餵食")}
              disabled={!isFeederActive()}
            >
              執行一次餵食
            </button>
            <button 
              className={`px-4 py-2 text-white rounded transition-colors ${
                !isFeederActive() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`} 
              onClick={() => handleActiveCommand("open_gate", "開啟閘門")}
              disabled={!isFeederActive()}
            >
              開啟閘門
            </button>
            <button 
              className={`px-4 py-2 text-white rounded transition-colors ${
                !isFeederActive() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`} 
              onClick={() => handleActiveCommand("close_gate", "關閉閘門")}
              disabled={!isFeederActive()}
            >
              關閉閘門
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input 
              id="feedUntilWeight" 
              type="number" 
              placeholder="目標重量 (g)" 
              className={`border rounded px-2 py-1 w-32 ${
                !isFeederActive() ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={!isFeederActive()}
            />
            <button 
              className={`px-4 py-2 text-white rounded transition-colors ${
                !isFeederActive() 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600'
              }`} 
              onClick={() => {
                if (!isFeederActive()) {
                  alert("餵食器未啟動，無法執行持續餵食。請先啟動餵食器。");
                  return;
                }
                const weight = (document.getElementById("feedUntilWeight") as HTMLInputElement).value;
                if (weight) {
                  alert(`已發送持續餵食指令，目標重量：${weight}g`);
                  sendFeederCommand(`feed_until ${weight}`);
                } else {
                  alert("請輸入目標重量");
                }
              }}
              disabled={!isFeederActive()}
            >
              持續餵食直到達到目標重量
            </button>
          </div>
        </div>

        {/* 餵食紀錄 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {formatDate(selectedDate)} 餵食紀錄
            </h2>
          </div>
          <div className="overflow-x-auto">
            {records.length > 0 ? (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        飼料種類
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        餵食量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        熱量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        飼料剩餘量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        廚餘量高度
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(record.fed_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.food_type === "default_food" ? (
                            <select
                              title="選擇飼料品牌"
                              value={record.food_type}
                              onChange={async (e) => {
                                const newType = e.target.value;
                                await supabase
                                  .from("feeding_records")
                                  .update({ food_type: newType })
                                  .eq("id", record.id);
                                fetchFeedingRecords();
                              }}
                              className="border rounded px-2 py-1"
                            >
                              <option value="">請選擇飼料品牌</option>
                              {foodList.map((food) => (
                                <option
                                  key={food.food_type}
                                  value={food.food_type}
                                >
                                  {food.food_type}
                                </option>
                              ))}
                            </select>
                          ) : (
                            record.food_type
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            const food = foodList.find(
                              (f) => f.food_type === record.food_type
                            );
                            if (!food) return "--";
                            const ratio = Number(record.amount) / 100;
                            const protein = (food.protein || 0) * ratio;
                            const fat = (food.fat || 0) * ratio;
                            const carbs = Math.max(
                              0,
                              (100 -
                                ((food.protein || 0) +
                                  (food.fat || 0) +
                                  (food.fiber || 0) +
                                  (food.moisture || 0))) *
                                ratio
                            );
                            const calories = protein * 4 + fat * 9 + carbs * 4;
                            return calories.toFixed(1);
                          })()}{" "}
                          kcal
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.laser_distance !== undefined
                            ? `${record.laser_distance} mm`
                            : "--"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.weight !== undefined
                            ? `${record.weight} mm`
                            : "--"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={3}
                        className="px-6 py-4 text-right font-medium"
                      >
                        總計
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {(() => {
                          const totalCalories = records.reduce(
                            (sum, record) => {
                              const food = foodList.find(
                                (f) => f.food_type === record.food_type
                              );
                              if (!food) return sum;
                              const ratio = Number(record.amount) / 100;
                              const protein = (food.protein || 0) * ratio;
                              const fat = (food.fat || 0) * ratio;
                              const carbs = Math.max(
                                0,
                                (100 -
                                  ((food.protein || 0) +
                                    (food.fat || 0) +
                                    (food.fiber || 0) +
                                    (food.moisture || 0))) *
                                  ratio
                              );
                              const calories =
                                protein * 4 + fat * 9 + carbs * 4;
                              return sum + calories;
                            },
                            0
                          );
                          return totalCalories.toFixed(1);
                        })()}{" "}
                        kcal
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>這一天沒有餵食紀錄</p>
              </div>
            )}
          </div>
        </div>

        {/* 定時餵食設定區塊 */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Timer className="w-5 h-5" />
              定時餵食設定
            </h2>
            <button
              onClick={() => setShowScheduleForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增定時設定
            </button>
          </div>

          {schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-medium">{formatScheduleTime(schedule.time)}</div>
                      <div className="text-sm text-gray-600">
                        {schedule.food_type} - {schedule.amount}g
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDays(schedule.days)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSchedule(schedule.id, !schedule.enabled)}
                      className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                        schedule.enabled
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {schedule.enabled ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                      {schedule.enabled ? '啟用中' : '已停用'}
                    </button>
                    <button
                      onClick={() => startEdit(schedule)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      編輯
                    </button>
                    <button
                      onClick={() => deleteSchedule(schedule.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Timer className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>尚未設定定時餵食</p>
              <p className="text-sm">點擊上方按鈕新增定時餵食設定</p>
            </div>
          )}
        </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">新增餵食紀錄</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="food_type" className="block text-sm font-medium text-gray-700">食物類型</label>
                <select
                  id="food_type"
                  value={formData.food_type}
                  onChange={e => {
                    setFormData({ ...formData, food_type: e.target.value });
                    setSelectedFood(foodList.find(f => f.food_type === e.target.value) || null);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇飼料品牌</option>
                  {foodList.map(food => (
                    <option key={food.food_type} value={food.food_type}>{food.food_type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">份量 (g)</label>
                <input
                  id="amount"
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="請輸入份量"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  儲存
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScheduleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">新增定時餵食設定</h2>
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">餵食時間</label>
                <input
                  type="time"
                  step="1" // 啟用秒的輸入
                  value={scheduleData.time.substring(0, 8)} // 顯示 HH:MM:SS
                  onChange={handleTimeChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  title="選擇餵食時間（包含秒）"
                  aria-label="選擇餵食時間（包含秒）"
                />
                <p className="text-xs text-gray-500 mt-1">可以選擇精確到秒的時間</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">飼料品牌</label>
                <select
                  value={scheduleData.food_type}
                  onChange={e => setScheduleData({ ...scheduleData, food_type: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  title="選擇飼料品牌"
                  aria-label="選擇飼料品牌"
                >
                  <option value="">請選擇飼料品牌</option>
                  {foodList.map(food => (
                    <option key={food.food_type} value={food.food_type}>{food.food_type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">餵食量 (g)</label>
                <input
                  type="number"
                  value={scheduleData.amount}
                  onChange={e => setScheduleData({ ...scheduleData, amount: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="請輸入餵食量"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重複日期</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'monday', label: '週一' },
                    { key: 'tuesday', label: '週二' },
                    { key: 'wednesday', label: '週三' },
                    { key: 'thursday', label: '週四' },
                    { key: 'friday', label: '週五' },
                    { key: 'saturday', label: '週六' },
                    { key: 'sunday', label: '週日' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduleData.days.includes(key)}
                        onChange={() => handleDayToggle(key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={scheduleData.enabled}
                  onChange={e => setScheduleData({ ...scheduleData, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                  立即啟用此設定
                </label>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors"
                >
                  儲存設定
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">編輯定時餵食設定</h2>
            <form onSubmit={handleEditSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">餵食時間</label>
                <input
                  type="time"
                  step="1" // 啟用秒的輸入
                  value={scheduleData.time.substring(0, 8)} // 顯示 HH:MM:SS
                  onChange={handleTimeChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  title="選擇餵食時間（包含秒）"
                  aria-label="選擇餵食時間（包含秒）"
                />
                <p className="text-xs text-gray-500 mt-1">可以選擇精確到秒的時間</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">飼料品牌</label>
                <select
                  value={scheduleData.food_type}
                  onChange={e => setScheduleData({ ...scheduleData, food_type: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  title="選擇飼料品牌"
                  aria-label="選擇飼料品牌"
                >
                  <option value="">請選擇飼料品牌</option>
                  {foodList.map(food => (
                    <option key={food.food_type} value={food.food_type}>{food.food_type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">餵食量 (g)</label>
                <input
                  type="number"
                  value={scheduleData.amount}
                  onChange={e => setScheduleData({ ...scheduleData, amount: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="請輸入餵食量"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重複日期</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'monday', label: '週一' },
                    { key: 'tuesday', label: '週二' },
                    { key: 'wednesday', label: '週三' },
                    { key: 'thursday', label: '週四' },
                    { key: 'friday', label: '週五' },
                    { key: 'saturday', label: '週六' },
                    { key: 'sunday', label: '週日' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={scheduleData.days.includes(key)}
                        onChange={() => handleDayToggle(key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-enabled"
                  checked={scheduleData.enabled}
                  onChange={e => setScheduleData({ ...scheduleData, enabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit-enabled" className="ml-2 text-sm text-gray-700">
                  啟用此設定
                </label>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  更新設定
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNutritionInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">寵物營養需求指南</h2>
              <button
                onClick={() => setShowNutritionInfo(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="關閉營養需求指南"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">狗狗的每日營養需求</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="font-medium">熱量：</span>
                    一般成年狗狗每日所需熱量約為每公斤體重30-40卡路里。
                  </li>
                  <li>
                    <span className="font-medium">蛋白質：</span>
                    約18-25%的總熱量應來自蛋白質，這相當於約2-3克每公斤體重。
                  </li>
                  <li>
                    <span className="font-medium">脂肪：</span>
                    約10-15%的總熱量應來自脂肪。
                  </li>
                  <li>
                    <span className="font-medium">碳水化合物：</span>
                    碳水化合物的需求量較少，通常佔總熱量的30-50%。
                  </li>
                  <li>
                    <span className="font-medium">纖維：</span>
                    每日建議攝取2-5克的纖維，有助於消化。
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">貓咪的每日營養需求</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <span className="font-medium">熱量：</span>
                    成年貓咪每日所需熱量約為每公斤體重40-50卡路里。
                  </li>
                  <li>
                    <span className="font-medium">蛋白質：</span>
                    約26-30%的總熱量應來自蛋白質，這相當於約4-5克每公斤體重。
                  </li>
                  <li>
                    <span className="font-medium">脂肪：</span>
                    約15-20%的總熱量應來自脂肪。
                  </li>
                  <li>
                    <span className="font-medium">碳水化合物：</span>
                    碳水化合物的需求量較少，通常佔總熱量的5-10%。
                  </li>
                  <li>
                    <span className="font-medium">纖維：</span>
                    每日建議攝取1-2克的纖維。
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">注意事項</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>以上數值僅供參考，實際需求可能因個體差異而有所不同。</li>
                  <li>幼犬/幼貓、懷孕/哺乳期、老年或患病寵物的營養需求會有所不同。</li>
                  <li>建議諮詢獸醫以獲取針對您寵物的個性化營養建議。</li>
                  <li>定期監測寵物的體重和健康狀況，並根據需要調整飲食。</li>
                </ul>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowNutritionInfo(false)}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
