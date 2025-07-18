import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Utensils, Plus, Loader2, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pet, FeedingRecord } from '../types';
import mqtt from "mqtt";

export default function FeedingRecordPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showNutritionInfo, setShowNutritionInfo] = useState(false);
  const [formData, setFormData] = useState({
    food_type: '',
    amount: '',
    calories: '',
  });
  const [nutritionCalculator, setNutritionCalculator] = useState({
    petType: 'dog',
    weight: '',
    activityLevel: 'normal', // low, normal, high
    age: 'adult', // puppy, adult, senior
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
    calories?: number; // Added calories to the state
  } | null>(null);

  // MQTT 控制相關
  const MQTT_BROKER = "wss://broker.emqx.io:8084/mqtt";
  const MQTT_TOPIC = "feeder/command";
  const MQTT_USERNAME = "petmanager";
  const MQTT_PASSWORD = "petmanager";
  const mqttClientRef = React.useRef<mqtt.MqttClient | null>(null);

  React.useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
    });
    mqttClientRef.current = client;
    return () => {
      client.end();
    };
  }, []);

  const sendFeederCommand = (cmd: string) => {
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      mqttClientRef.current.publish(MQTT_TOPIC, cmd);
      alert(`已傳送指令: ${cmd}`);
    } else {
      alert("MQTT 尚未連線，請稍後再試。");
    }
  };

  useEffect(() => {
    fetchPets();
    fetchFoodList();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      fetchFeedingRecords();
      fetchPetDetails();
    }
  }, [selectedPet, selectedDate]);

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('name');

      if (error) throw error;
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPet(data[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setLoading(false);
    }
  };

  const fetchPetDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', selectedPet)
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
      console.error('Error fetching pet details:', error);
    }
  };

  const fetchFeedingRecords = async () => {
    try {
      // 計算選定日期的開始和結束時間
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('feeding_records')
        .select('*')
        .eq('pet_id', selectedPet)
        .gte('fed_at', startDate.toISOString())
        .lte('fed_at', endDate.toISOString())
        .order('fed_at', { ascending: false });

      if (error) throw error;
      const processedData = data.map(item => {
        if (item.amount === 45) {
          return { ...item, amount: '150g' };
        }
        return item;
      });
      setRecords(processedData || []);
    } catch (error) {
      console.error('Error fetching feeding records:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 自動計算 calories
    const food = foodList.find(f => f.food_type === formData.food_type);
    let calories = 0;
    if (food && formData.amount) {
      const ratio = parseFloat(formData.amount) / 100;
      const protein = (food.protein || 0) * ratio;
      const fat = (food.fat || 0) * ratio;
      const carbs = Math.max(0, (100 - ((food.protein || 0) + (food.fat || 0) + (food.fiber || 0) + (food.moisture || 0))) * ratio);
      calories = protein * 4 + fat * 9 + carbs * 4;
    }
    try {
      const { error } = await supabase.from('feeding_records').insert([
        {
          pet_id: selectedPet,
          food_type: formData.food_type,
          amount: parseFloat(formData.amount),
          calories: Math.round(calories),
        },
      ]);

      if (error) throw error;

      setFormData({
        food_type: '',
        amount: '',
        calories: '',
      });
      setShowForm(false);
      fetchFeedingRecords();
    } catch (error) {
      console.error('Error adding feeding record:', error);
      alert(JSON.stringify(error));
    }
  };

  // (已移除未用的 calculateNutrition, getRecommendedCalories)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() - 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + 1);
    setSelectedDate(currentDate.toISOString().split('T')[0]);
  };

  const fetchFoodList = async () => {
    const { data, error } = await supabase.from('food_data').select('*');
    console.log('foodList', data, error); // 除錯用
    if (!error && data) setFoodList(data);
  };

  // 新增：根據選擇的飼料品牌與餵食量計算營養成分
  useEffect(() => {
    if (selectedFood && formData.amount) {
      const ratio = parseFloat(formData.amount) / 100;
      const protein = (selectedFood.protein || 0) * ratio;
      const fat = (selectedFood.fat || 0) * ratio;
      const fiber = (selectedFood.fiber || 0) * ratio;
      const calcium = (selectedFood.calcium || 0) * ratio;
      const phosphorus = (selectedFood.phosphorus || 0) * ratio;
      const moisture = (selectedFood.moisture || 0) * ratio;
      const carbs = Math.max(0, (100 - ((selectedFood.protein || 0) + (selectedFood.fat || 0) + (selectedFood.fiber || 0) + (selectedFood.moisture || 0))) * ratio);
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

  if (loading) {
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
              <label htmlFor="pet-select" className="sr-only">選擇寵物</label>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">餵食紀錄</h1>
          <p className="mt-1 text-gray-500">記錄寵物的飲食狀況</p>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* 新營養計算區塊 */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">飼料營養計算</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">飼料品牌</label>
              <select
                title="選擇飼料品牌"
                value={formData.food_type}
                onChange={e => {
                  setFormData({ ...formData, food_type: e.target.value });
                  setSelectedFood(foodList.find(f => f.food_type === e.target.value) || null);
                }}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="請輸入餵食量"
              />
            </div>
          </div>
          {nutritionResult && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">蛋白質</p>
                <p className="text-lg font-semibold">{nutritionResult.protein.toFixed(2)} g</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">脂肪</p>
                <p className="text-lg font-semibold">{nutritionResult.fat.toFixed(2)} g</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">纖維</p>
                <p className="text-lg font-semibold">{nutritionResult.fiber.toFixed(2)} g</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">鈣</p>
                <p className="text-lg font-semibold">{nutritionResult.calcium.toFixed(2)} g</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">磷</p>
                <p className="text-lg font-semibold">{nutritionResult.phosphorus.toFixed(2)} g</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">水分</p>
                <p className="text-lg font-semibold">{nutritionResult.moisture.toFixed(2)} g</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg col-span-2 md:col-span-3">
                <p className="text-sm text-gray-500">大約熱量</p>
                <p className="text-lg font-semibold">{nutritionResult.calories ? nutritionResult.calories.toFixed(1) : '--'} kcal</p>
              </div>
            </div>
          )}
        </div>

        {/* 餵食器控制區塊 */}
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-bold mb-2">餵食器控制</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => sendFeederCommand("start")}>啟動餵食器</button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => sendFeederCommand("stop")}>停止餵食器</button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => sendFeederCommand("feed")}>執行一次餵食</button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => sendFeederCommand("status")}>查詢狀態</button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => sendFeederCommand("open_gate")}>開啟閘門</button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => sendFeederCommand("close_gate")}>關閉閘門</button>
          </div>
          <div className="flex items-center gap-2">
            <input id="feedUntilWeight" type="number" placeholder="目標重量 (g)" className="border rounded px-2 py-1 w-32" />
            <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => {
              const weight = (document.getElementById("feedUntilWeight") as HTMLInputElement).value;
              if (weight) sendFeederCommand(`feed_until ${weight}`);
              else alert("請輸入目標重量");
            }}>持續餵食直到達到目標重量</button>
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
                        食物類型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        份量 (g)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        熱量 (kcal)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.fed_at).toLocaleTimeString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.food_type === "default_food" ? (
                            <select
                              title="選擇飼料品牌"
                              value={record.food_type}
                              onChange={async (e) => {
                                const newType = e.target.value;
                                await supabase
                                  .from('feeding_records')
                                  .update({ food_type: newType })
                                  .eq('id', record.id);
                                fetchFeedingRecords(); // 重新載入
                              }}
                              className="border rounded px-2 py-1"
                            >
                              <option value="">請選擇飼料品牌</option>
                              {foodList.map(food => (
                                <option key={food.food_type} value={food.food_type}>{food.food_type}</option>
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
                          {/* getTotalCalories() */}
                          {(() => {
                            const food = foodList.find(f => f.food_type === record.food_type);
                            if (!food) return '--';
                            const ratio = Number(record.amount) / 100;
                            const protein = (food.protein || 0) * ratio;
                            const fat = (food.fat || 0) * ratio;
                            const carbs = Math.max(0, (100 - ((food.protein || 0) + (food.fat || 0) + (food.fiber || 0) + (food.moisture || 0))) * ratio);
                            const calories = protein * 4 + fat * 9 + carbs * 4;
                            return calories.toFixed(1);
                          })()} kcal
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="px-6 py-4 text-right font-medium">
                        總計
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {/* getTotalCalories() */}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {/* 新增：每次餵食的營養成分顯示 */}
                <div className="mt-4">
                  <h3 className="text-md font-semibold mb-2">每次餵食營養成分</h3>
                  <div className="space-y-2">
                    {records.map((record) => {
                      const food = foodList.find(f => f.food_type === record.food_type);
                      if (!food) return null;
                      const ratio = Number(record.amount) / 100;
                      const protein = (food.protein || 0) * ratio;
                      const fat = (food.fat || 0) * ratio;
                      const fiber = (food.fiber || 0) * ratio;
                      const calcium = (food.calcium || 0) * ratio;
                      const phosphorus = (food.phosphorus || 0) * ratio;
                      const moisture = (food.moisture || 0) * ratio;
                      const carbs = Math.max(0, (100 - ((food.protein || 0) + (food.fat || 0) + (food.fiber || 0) + (food.moisture || 0))) * ratio);
                      const calories = protein * 4 + fat * 9 + carbs * 4;
                      return (
                        <div key={record.id} className="bg-gray-50 rounded p-3 flex flex-wrap gap-4 items-center">
                          <span className="font-medium text-gray-700">{new Date(record.fed_at).toLocaleTimeString('zh-TW')} {record.food_type} {record.amount}g</span>
                          <span>蛋白質: {protein.toFixed(2)}g</span>
                          <span>脂肪: {fat.toFixed(2)}g</span>
                          <span>纖維: {fiber.toFixed(2)}g</span>
                          <span>鈣: {calcium.toFixed(2)}g</span>
                          <span>磷: {phosphorus.toFixed(2)}g</span>
                          <span>水分: {moisture.toFixed(2)}g</span>
                          <span>熱量: {calories.toFixed(1)} kcal</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>這一天沒有餵食紀錄</p>
              </div>
            )}
          </div>
        </div>
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
  );
}