import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Utensils, Plus, Loader2, Info, Calculator, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pet, FeedingRecord } from '../types';

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
  const [calculatedNutrition, setCalculatedNutrition] = useState<{
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  } | null>(null);

  useEffect(() => {
    fetchPets();
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
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching feeding records:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('feeding_records').insert([
        {
          pet_id: selectedPet,
          food_type: formData.food_type,
          amount: parseFloat(formData.amount),
          calories: parseInt(formData.calories),
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
    }
  };

  const calculateNutrition = () => {
    const weight = parseFloat(nutritionCalculator.weight);
    if (!weight || isNaN(weight)) return;

    let baseCalories = 0;
    let proteinPercentage = 0;
    let fatPercentage = 0;
    let carbsPercentage = 0;
    let fiberGrams = 0;

    // 基礎熱量計算
    if (nutritionCalculator.petType === 'dog') {
      baseCalories = weight * (nutritionCalculator.age === 'puppy' ? 40 : 
                              nutritionCalculator.age === 'senior' ? 30 : 35);
      proteinPercentage = nutritionCalculator.age === 'puppy' ? 0.25 : 0.18;
      fatPercentage = 0.12;
      carbsPercentage = 0.40;
      fiberGrams = weight * 0.1; // 約每公斤體重0.1克纖維
    } else {
      baseCalories = weight * (nutritionCalculator.age === 'kitten' ? 50 : 
                              nutritionCalculator.age === 'senior' ? 40 : 45);
      proteinPercentage = 0.28;
      fatPercentage = 0.18;
      carbsPercentage = 0.08;
      fiberGrams = weight * 0.05; // 約每公斤體重0.05克纖維
    }

    // 根據活動量調整
    const activityMultiplier = nutritionCalculator.activityLevel === 'low' ? 0.8 : 
                              nutritionCalculator.activityLevel === 'high' ? 1.2 : 1.0;
    const calories = Math.round(baseCalories * activityMultiplier);

    // 計算各營養素
    const protein = Math.round(calories * proteinPercentage / 4); // 蛋白質每克4卡路里
    const fat = Math.round(calories * fatPercentage / 9); // 脂肪每克9卡路里
    const carbs = Math.round(calories * carbsPercentage / 4); // 碳水每克4卡路里

    setCalculatedNutrition({
      calories,
      protein,
      fat,
      carbs,
      fiber: Math.round(fiberGrams * 10) / 10
    });
  };

  const getTotalCalories = () => {
    return records.reduce((sum, record) => sum + record.calories, 0);
  };

  const getRecommendedCalories = () => {
    if (!calculatedNutrition) return null;
    return calculatedNutrition.calories;
  };

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
              />
            </div>
            
            <button 
              onClick={goToNextDay}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* 營養計算器 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">營養需求計算器</h2>
            <button 
              onClick={() => setShowNutritionInfo(!showNutritionInfo)}
              className="text-blue-500 hover:text-blue-600"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">寵物類型</label>
                <select
                  value={nutritionCalculator.petType}
                  onChange={(e) => setNutritionCalculator({...nutritionCalculator, petType: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="dog">狗</option>
                  <option value="cat">貓</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">體重 (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={nutritionCalculator.weight}
                  onChange={(e) => setNutritionCalculator({...nutritionCalculator, weight: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">活動量</label>
                <select
                  value={nutritionCalculator.activityLevel}
                  onChange={(e) => setNutritionCalculator({...nutritionCalculator, activityLevel: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="low">低</option>
                  <option value="normal">中</option>
                  <option value="high">高</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年齡階段</label>
                <select
                  value={nutritionCalculator.age}
                  onChange={(e) => setNutritionCalculator({...nutritionCalculator, age: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {nutritionCalculator.petType === 'dog' ? (
                    <>
                      <option value="puppy">幼犬</option>
                      <option value="adult">成犬</option>
                      <option value="senior">老犬</option>
                    </>
                  ) : (
                    <>
                      <option value="kitten">幼貓</option>
                      <option value="adult">成貓</option>
                      <option value="senior">老貓</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={calculateNutrition}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Calculator className="w-5 h-5" />
                計算營養需求
              </button>
            </div>

            {calculatedNutrition && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-md font-semibold text-gray-900 mb-3">
                  {formatDate(selectedDate)} 營養攝取狀況
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500">熱量</p>
                    <p className="text-lg font-semibold">{calculatedNutrition.calories} kcal</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500">蛋白質</p>
                    <p className="text-lg font-semibold">{calculatedNutrition.protein} g</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500">脂肪</p>
                    <p className="text-lg font-semibold">{calculatedNutrition.fat} g</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500">碳水化合物</p>
                    <p className="text-lg font-semibold">{calculatedNutrition.carbs} g</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500">纖維</p>
                    <p className="text-lg font-semibold">{calculatedNutrition.fiber} g</p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center">
                  <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        getTotalCalories() > getRecommendedCalories()! * 1.1 ? 'bg-red-500' :
                        getTotalCalories() < getRecommendedCalories()! * 0.9 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (getTotalCalories() / getRecommendedCalories()!) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="ml-4 text-sm">
                    <span className="font-medium">{getTotalCalories()}</span>
                    <span className="text-gray-500"> / {getRecommendedCalories()} kcal</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {getTotalCalories() > getRecommendedCalories()! * 1.1 ? '熱量攝取過多' :
                   getTotalCalories() < getRecommendedCalories()! * 0.9 ? '熱量攝取不足' :
                   '熱量攝取適中'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {formatDate(selectedDate)} 餵食紀錄
            </h2>
          </div>
          <div className="overflow-x-auto">
            {records.length > 0 ? (
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
                        {record.food_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.calories}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-6 py-4 text-right font-medium">
                      總計
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                      {getTotalCalories()} kcal
                    </td>
                  </tr>
                </tbody>
              </table>
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
                <label className="block text-sm font-medium text-gray-700">食物類型</label>
                <input
                  type="text"
                  value={formData.food_type}
                  onChange={(e) => setFormData({ ...formData, food_type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">份量 (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">熱量 (kcal)</label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
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