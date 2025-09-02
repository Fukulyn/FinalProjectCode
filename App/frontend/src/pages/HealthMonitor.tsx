import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Loader2, Heart, Activity, LineChart, BatteryCharging, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pet, HealthRecord } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function HealthMonitor() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [formData, setFormData] = useState({
    temperature: '',
    heart_rate: '',
    oxygen_level: '',
  });
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [stepsValue, setStepsValue] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const location = useLocation();

  const getHealthStatus = (type: string, value: number) => {
    const selectedPetData = pets.find(p => p.id === selectedPet);
    const isDog = selectedPetData?.type === 'dog';

    switch (type) {
      case 'temperature':
        if (isDog) {
          return value > 39.2 ? 'high' : value < 38.3 ? 'low' : 'normal';
        } else {
          return value > 39.5 ? 'high' : value < 38.1 ? 'low' : 'normal';
        }
      case 'heart_rate':
        if (isDog) {
          return value > 140 ? 'high' : value < 60 ? 'low' : 'normal';
        } else {
          return value > 200 ? 'high' : value < 120 ? 'low' : 'normal';
        }
      case 'oxygen_level':
        return value < 95 ? 'low' : 'normal';
      default:
        return 'normal';
    }
  };

  const latestRecord = records[records.length - 1];
  const temperatureStatus = latestRecord ? getHealthStatus('temperature', latestRecord.temperature) : 'normal';
  const heartRateStatus = latestRecord ? getHealthStatus('heart_rate', latestRecord.heart_rate) : 'normal';
  const oxygenStatus = latestRecord ? getHealthStatus('oxygen_level', latestRecord.oxygen_level) : 'normal';

  // 檢查是否有異常狀態
  const hasAbnormalStatus = () => {
    return temperatureStatus !== 'normal' || heartRateStatus !== 'normal' || oxygenStatus !== 'normal';
  };

  const fetchHealthRecords = useCallback(async () => {
    if (!selectedPet) return;
    try {
      let query = supabase
        .from('health_records')
        .select('*')
        .eq('pet_id', selectedPet)
        .order('recorded_at', { ascending: true });

      const now = new Date();
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('recorded_at', weekAgo.toISOString());
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte('recorded_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching health records:', error);
    }
  }, [selectedPet, timeRange]);

  const fetchBatteryLevel = useCallback(async () => {
    if (!selectedPet) return;
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('power')
        .eq('pet_id', selectedPet)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setBatteryLevel(data?.power || null);
    } catch (error) {
      console.error('Error fetching battery level:', error);
    }
  }, [selectedPet]);

  const fetchStepsValue = useCallback(async () => {
    if (!selectedPet) return;
    try {
      const { data, error } = await supabase
        .from('health_records')
        .select('steps_value')
        .eq('pet_id', selectedPet)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      setStepsValue(data?.steps_value || null);
    } catch (error) {
      console.error('Error fetching steps value:', error);
    }
  }, [selectedPet]);

  const fetchPets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('name');

      if (error) throw error;
      setPets(data || []);
      
      const params = new URLSearchParams(location.search);
      const petId = params.get('pet');
      
      if (petId && data?.some(p => p.id === petId)) {
        setSelectedPet(petId);
      } else if (data && data.length > 0) {
        setSelectedPet(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    }
  }, [location.search]);

  useEffect(() => {
    fetchPets();
  }, [fetchPets, location.search]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!selectedPet) return;

    setIsRefreshing(true);
    const fetchData = async () => {
      await Promise.all([
        fetchHealthRecords(),
        fetchBatteryLevel(),
        fetchStepsValue(),
      ]);
      setIsRefreshing(false);
    };

    fetchData();

    const intervalId = setInterval(() => {
      setIsRefreshing(true);
      fetchData();
    }, 1000); // 每秒刷新一次

    return () => clearInterval(intervalId);
  }, [selectedPet, timeRange, fetchHealthRecords, fetchBatteryLevel, fetchStepsValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('health_records').insert([
        {
          pet_id: selectedPet,
          temperature: parseFloat(formData.temperature),
          heart_rate: parseInt(formData.heart_rate),
          oxygen_level: parseFloat(formData.oxygen_level),
        },
      ]);

      if (error) throw error;

      setFormData({
        temperature: '',
        heart_rate: '',
        oxygen_level: '',
      });
      setShowForm(false);
      fetchHealthRecords(); // 手動新增後立即更新資料
    } catch (error) {
      console.error('Error adding health record:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'text-red-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-green-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'high':
        return '偏高';
      case 'low':
        return '偏低';
      default:
        return '正常';
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // 隱藏圖例，因為每個圖表只有一條線
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: isMobile ? 45 : 0,
          font: {
            size: isMobile ? 9 : 11
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        ticks: {
          font: {
            size: isMobile ? 9 : 11
          }
        }
      },
    },
    elements: {
      point: {
        radius: isMobile ? 1.5 : 2
      }
    }
  };

  // 體溫專用圖表配置
  const temperatureChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 26,
        max: 44,
        ticks: {
          ...chartOptions.scales.y.ticks,
          stepSize: 2
        }
      }
    }
  };

  // 心率專用圖表配置
  const heartRateChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 70,
        max: 200,
        ticks: {
          ...chartOptions.scales.y.ticks,
          stepSize: 10
        }
      }
    }
  };

  // 血氧專用圖表配置
  const oxygenChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        min: 60,
        max: 100,
        ticks: {
          ...chartOptions.scales.y.ticks,
          stepSize: 5
        }
      }
    }
  };

  // 體溫圖表數據
  const temperatureChartData = {
    labels: records.map(data => 
      new Date(data.recorded_at).toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      })
    ),
    datasets: [
      {
        data: records.map(data => data.temperature),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderWidth: 0,
        showLine: false,
        fill: false,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        label: '體溫 (°C)',
      },
    ],
  };  // 心率圖表數據
  const heartRateChartData = {
    labels: records.map(record => {
      const date = new Date(record.recorded_at);
      if (isMobile) {
        return date.toLocaleString('zh-TW', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleString('zh-TW', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        });
      }
    }),
    datasets: [
      {
        label: '心率 (BPM)',
        data: records.map(record => record.heart_rate),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.8)',
        borderWidth: 0,
        showLine: false,
        fill: false,
        pointBackgroundColor: 'rgb(53, 162, 235)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      }
    ],
  };

  // 血氧圖表數據
  const oxygenChartData = {
    labels: records.map(record => {
      const date = new Date(record.recorded_at);
      if (isMobile) {
        return date.toLocaleString('zh-TW', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
      } else {
        return date.toLocaleString('zh-TW', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        });
      }
    }),
    datasets: [
      {
        label: '血氧 (%)',
        data: records.map(record => record.oxygen_level),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderWidth: 0,
        showLine: false,
        fill: false,
        pointBackgroundColor: 'rgb(75, 192, 192)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
      }
    ],
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
              <select
                aria-label="選擇寵物"
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
            <h1 className="text-2xl font-bold text-gray-900">健康監測</h1>
            <p className="mt-1 text-gray-500">監測寵物的體溫、心率和血氧</p>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Clock className="w-4 h-4 mr-2" />
            )}
            <span>
              {lastUpdated ? `最後更新：${lastUpdated.toLocaleTimeString('zh-TW')}` : '載入中...'}
            </span>
          </div>
        </div>

        {/* 異常狀態警告 */}
        {latestRecord && hasAbnormalStatus() && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="w-5 h-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  感測異常警告
                </h3>
                <p className="mt-2 text-sm text-red-700">
                  檢測到異常數值，請確認項圈貼合狀況和動物狀態，目前感測可能不良。
                  建議檢查項圈是否正確佩戴，並觀察寵物的實際狀況。
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-yellow-500" />
              <h2 className="text-lg font-semibold">體溫</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {latestRecord?.temperature || '--'} °C
            </p>
            {latestRecord && (
              <p className={`text-sm ${getStatusColor(temperatureStatus)} mt-1 flex items-center gap-1`}>
                <span className={`w-2 h-2 rounded-full ${
                  temperatureStatus === 'normal' ? 'bg-green-500' :
                  temperatureStatus === 'high' ? 'bg-red-500' : 'bg-blue-500'
                }`}></span>
                {getStatusText(temperatureStatus)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-6 h-6 text-red-500" />
              <h2 className="text-lg font-semibold">心率</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {latestRecord?.heart_rate || '--'} BPM
            </p>
            {latestRecord && (
              <p className={`text-sm ${getStatusColor(heartRateStatus)} mt-1 flex items-center gap-1`}>
                <span className={`w-2 h-2 rounded-full ${
                  heartRateStatus === 'normal' ? 'bg-green-500' :
                  heartRateStatus === 'high' ? 'bg-red-500' : 'bg-blue-500'
                }`}></span>
                {getStatusText(heartRateStatus)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold">血氧</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {latestRecord?.oxygen_level || '--'}%
            </p>
            {latestRecord && (
              <p className={`text-sm ${getStatusColor(oxygenStatus)} mt-1 flex items-center gap-1`}>
                <span className={`w-2 h-2 rounded-full ${
                  oxygenStatus === 'normal' ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                {getStatusText(oxygenStatus)}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <BatteryCharging className="w-6 h-6 text-green-500" />
              <h2 className="text-lg font-semibold">項圈電量</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {batteryLevel !== null ? `${batteryLevel}%` : '--'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {batteryLevel !== null ? `電量狀態：${batteryLevel > 20 ? '正常' : '低電量'}` : '尚無電量資料'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold">步數</h2>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {stepsValue !== null ? `${stepsValue} 步` : '--'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {stepsValue !== null ? '最新步數資料' : '尚無步數資料'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center gap-3">
              <LineChart className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold">健康趨勢圖</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-1 text-sm rounded-md whitespace-nowrap ${
                  timeRange === 'week' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                一週
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 text-sm rounded-md whitespace-nowrap ${
                  timeRange === 'month' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                一個月
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1 text-sm rounded-md whitespace-nowrap ${
                  timeRange === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
            </div>
          </div>
          
          {records.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 體溫圖表 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500" />
                  體溫趨勢 (°C)
                </h3>
                <div className="h-[200px] sm:h-[250px]">
                  <Line options={temperatureChartOptions} data={temperatureChartData} />
                </div>
              </div>
              
              {/* 心率圖表 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-blue-500" />
                  心率趨勢 (BPM)
                </h3>
                <div className="h-[200px] sm:h-[250px]">
                  <Line options={heartRateChartOptions} data={heartRateChartData} />
                </div>
              </div>
              
              {/* 血氧圖表 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-4 h-4 bg-teal-500 rounded-full"></div>
                  血氧趨勢 (%)
                </h3>
                <div className="h-[200px] sm:h-[250px]">
                  <Line options={oxygenChartOptions} data={oxygenChartData} />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>尚無健康紀錄資料</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">歷史紀錄</h2>
          </div>
          
          {/* 桌面版表格 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    體溫 (°C)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    心率 (BPM)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    血氧 (%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.length > 0 ? (
                  [...records].reverse().map((record) => {
                    const tempStatus = getHealthStatus('temperature', record.temperature);
                    const hrStatus = getHealthStatus('heart_rate', record.heart_rate);
                    const o2Status = getHealthStatus('oxygen_level', record.oxygen_level);
                    
                    let overallStatus = 'normal';
                    if (tempStatus === 'high' || hrStatus === 'high' || o2Status === 'low') {
                      overallStatus = 'high';
                    } else if (tempStatus === 'low' || hrStatus === 'low') {
                      overallStatus = 'low';
                    }
                    
                    return (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.recorded_at).toLocaleString('zh-TW', {
                            timeZone: 'Asia/Taipei',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(tempStatus)}`}>
                          {record.temperature}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(hrStatus)}`}>
                          {record.heart_rate}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusColor(o2Status)}`}>
                          {record.oxygen_level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            overallStatus === 'normal' ? 'bg-green-100 text-green-800' :
                            overallStatus === 'high' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {overallStatus === 'normal' ? '正常' :
                             overallStatus === 'high' ? '異常' : '偏低'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      尚無健康紀錄資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 手機版卡片 */}
          <div className="md:hidden">
            {records.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {[...records].reverse().map((record) => {
                  const tempStatus = getHealthStatus('temperature', record.temperature);
                  const hrStatus = getHealthStatus('heart_rate', record.heart_rate);
                  const o2Status = getHealthStatus('oxygen_level', record.oxygen_level);
                  
                  let overallStatus = 'normal';
                  if (tempStatus === 'high' || hrStatus === 'high' || o2Status === 'low') {
                    overallStatus = 'high';
                  } else if (tempStatus === 'low' || hrStatus === 'low') {
                    overallStatus = 'low';
                  }
                  
                  return (
                    <div key={record.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm text-gray-600">
                          {new Date(record.recorded_at).toLocaleString('zh-TW', {
                            timeZone: 'Asia/Taipei',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          overallStatus === 'normal' ? 'bg-green-100 text-green-800' :
                          overallStatus === 'high' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {overallStatus === 'normal' ? '正常' :
                           overallStatus === 'high' ? '異常' : '偏低'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">體溫</div>
                          <div className={`text-lg font-semibold ${getStatusColor(tempStatus)}`}>
                            {record.temperature}
                          </div>
                          <div className="text-xs text-gray-400">°C</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">心率</div>
                          <div className={`text-lg font-semibold ${getStatusColor(hrStatus)}`}>
                            {record.heart_rate}
                          </div>
                          <div className="text-xs text-gray-400">BPM</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-xs text-gray-500 mb-1">血氧</div>
                          <div className={`text-lg font-semibold ${getStatusColor(o2Status)}`}>
                            {record.oxygen_level}
                          </div>
                          <div className="text-xs text-gray-400">%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                尚無健康紀錄資料
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">新增健康紀錄</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">體溫 (°C)</label>
                <input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="請輸入體溫"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="heart_rate" className="block text-sm font-medium text-gray-700">心率 (BPM)</label>
                <input
                  id="heart_rate"
                  type="number"
                  placeholder="請輸入心率"
                  value={formData.heart_rate}
                  onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="oxygen_level" className="block text-sm font-medium text-gray-700">血氧 (%)</label>
                <input
                  id="oxygen_level"
                  type="number"
                  step="0.1"
                  placeholder="請輸入血氧"
                  value={formData.oxygen_level}
                  onChange={(e) => setFormData({ ...formData, oxygen_level: e.target.value })}
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
    </div>
  );
}