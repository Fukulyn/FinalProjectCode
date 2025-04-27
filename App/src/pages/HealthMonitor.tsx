import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Loader2, Heart, Activity, LineChart } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [formData, setFormData] = useState({
    temperature: '',
    heart_rate: '',
    oxygen_level: '',
  });
  const location = useLocation();

  useEffect(() => {
    fetchPets();
    
    // 檢查 URL 參數是否有指定寵物
    const params = new URLSearchParams(location.search);
    const petId = params.get('pet');
    if (petId) {
      setSelectedPet(petId);
    }
  }, [location]);

  useEffect(() => {
    if (selectedPet) {
      fetchHealthRecords();
    }
  }, [selectedPet, timeRange]);

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('name');

      if (error) throw error;
      setPets(data || []);
      if (data && data.length > 0 && !selectedPet) {
        setSelectedPet(data[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching pets:', error);
      setLoading(false);
    }
  };

  const fetchHealthRecords = async () => {
    try {
      let query = supabase
        .from('health_records')
        .select('*')
        .eq('pet_id', selectedPet)
        .order('recorded_at', { ascending: true });

      // 根據時間範圍過濾
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
    } catch (error) {
      console.error('Error fetching health records:', error);
    }
  };

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
      fetchHealthRecords();
    } catch (error) {
      console.error('Error adding health record:', error);
    }
  };

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

  const latestRecord = records[records.length - 1];
  const temperatureStatus = latestRecord ? getHealthStatus('temperature', latestRecord.temperature) : 'normal';
  const heartRateStatus = latestRecord ? getHealthStatus('heart_rate', latestRecord.heart_rate) : 'normal';
  const oxygenStatus = latestRecord ? getHealthStatus('oxygen_level', latestRecord.oxygen_level) : 'normal';

  // 圖表配置
  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const chartData = {
    labels: records.map(record => 
      new Date(record.recorded_at).toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      })
    ),
    datasets: [
      {
        label: '體溫 (°C)',
        data: records.map(record => record.temperature),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        yAxisID: 'y',
      },
      {
        label: '心率 (BPM)',
        data: records.map(record => record.heart_rate),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y1',
      },
      {
        label: '血氧 (%)',
        data: records.map(record => record.oxygen_level),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y',
      },
    ],
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
              <select
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
          <h1 className="text-2xl font-bold text-gray-900">健康監測</h1>
          <p className="mt-1 text-gray-500">監測寵物的體溫、心率和血氧</p>
        </div>

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
            <p className="text-sm text-gray-500 mt-2">
              最後更新：{latestRecord?.recorded_at ? 
                new Date(latestRecord.recorded_at).toLocaleString('zh-TW') : '--'}
            </p>
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
            <p className="text-sm text-gray-500 mt-2">
              最後更新：{latestRecord?.recorded_at ? 
                new Date(latestRecord.recorded_at).toLocaleString('zh-TW') : '--'}
            </p>
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
            <p className="text-sm text-gray-500 mt-2">
              最後更新：{latestRecord?.recorded_at ? 
                new Date(latestRecord.recorded_at).toLocaleString('zh-TW') : '--'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <LineChart className="w-6 h-6 text-blue-500" />
              <h2 className="text-lg font-semibold">健康趨勢圖</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'week' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                一週
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'month' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                一個月
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
            </div>
          </div>
          <div className="h-[400px]">
            {records.length > 0 ? (
              <Line options={chartOptions} data={chartData} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>尚無健康紀錄資料</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">歷史紀錄</h2>
          </div>
          <div className="overflow-x-auto">
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
                    
                    // 整體狀態判斷
                    let overallStatus = 'normal';
                    if (tempStatus === 'high' || hrStatus === 'high' || o2Status === 'low') {
                      overallStatus = 'high';
                    } else if (tempStatus === 'low' || hrStatus === 'low') {
                      overallStatus = 'low';
                    }
                    
                    return (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.recorded_at).toLocaleString('zh-TW')}
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
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">新增健康紀錄</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">體溫 (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">心率 (BPM)</label>
                <input
                  type="number"
                  value={formData.heart_rate}
                  onChange={(e) => setFormData({ ...formData, heart_rate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">血氧 (%)</label>
                <input
                  type="number"
                  step="0.1"
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