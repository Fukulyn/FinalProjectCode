import React, { useState, useEffect } from 'react';
import { Plus, PawPrint, Loader2, Home, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Pet, PetData } from '../types';
import { Link } from 'react-router-dom';
import { createPet, updatePet } from '../lib/petApi';

export default function PetProfile() {
  const { user } = useAuthStore();

  // 品種資料
  const breedOptions = {
    狗: [
      '黃金獵犬',
      '拉布拉多',
      '德國牧羊犬',
      '比格犬',
      '柴犬',
      '博美犬',
      '吉娃娃',
      '法國鬥牛犬',
      '邊境牧羊犬',
      '哈士奇',
      '米克斯',
    ],
    貓: [
      '英國短毛貓',
      '美國短毛貓',
      '波斯貓',
      '暹羅貓',
      '緬因貓',
      '布偶貓',
      '俄羅斯藍貓',
      '蘇格蘭摺耳貓',
      '孟加拉貓',
      '阿比西尼亞貓'
    ]
  };

  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '', // 新增：貓或狗
    breed: '',
    birth_date: '',
    weight: '',
    photo: '', // 單一圖片網址，送出時包成陣列
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPets();
  }, [user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const petData: PetData = {
        name: formData.name,
        type: formData.type,
        breed: formData.breed,
        birth_date: formData.birth_date,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        location: formData.location,
        photos: formData.photo ? [formData.photo] : undefined,
      };

      let result;
      if (editingPet) {
        // 更新現有寵物
        result = await updatePet(editingPet.id, petData);
      } else {
        // 新增寵物
        if (!user?.id) {
          throw new Error('用戶未登入');
        }
        result = await createPet(user.id, petData);
      }

      if (result.error) {
        throw result.error;
      }

      // 重置表單和重新載入資料
      setFormData({
        name: '',
        type: '',
        breed: '',
        birth_date: '',
        weight: '',
        photo: '',
        location: '',
      });
      setShowForm(false);
      setEditingPet(null);
      fetchPets();
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        setError((error as { message?: string }).message || JSON.stringify(error));
        console.error('Error saving pet:', error, (error as { message?: string }).message, JSON.stringify(error));
      } else {
        setError(JSON.stringify(error) || '儲存寵物資料時發生錯誤');
        console.error('Error saving pet:', error, JSON.stringify(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    
    setFormData({
      ...formData,
      type: value,
      breed: '', // 重置品種選擇
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    
    setFormData({
      ...formData,
      birth_date: value,
    });
  };

  const handleDateFocus = () => {
    // 移除自動 showPicker，讓瀏覽器自然處理
  };

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    // 只在用戶點擊時嘗試顯示日期選擇器
    try {
      target.showPicker?.();
    } catch (error) {
      // 忽略 showPicker 錯誤，讓瀏覽器使用預設行為
      console.debug('showPicker not available or failed:', error);
    }
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    // 處理 photos 欄位：可能是陣列或 null
    let photoUrl = '';
    if (pet.photos && Array.isArray(pet.photos) && pet.photos.length > 0) {
      photoUrl = pet.photos[0];
    }
    
    // 處理出生日期格式
    let birthDateValue = '';
    if (pet.birth_date) {
      // 如果日期已經是 YYYY-MM-DD 格式，直接使用
      if (pet.birth_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        birthDateValue = pet.birth_date;
      } else {
        // 否則轉換格式
        const date = new Date(pet.birth_date);
        if (!isNaN(date.getTime())) {
          birthDateValue = date.toISOString().split('T')[0];
        }
      }
    }

    // 處理寵物類型：如果沒有 type 欄位，根據品種推斷
    let petType = pet.type || '';
    if (!petType && pet.breed) {
      // 根據品種推斷寵物類型
      const dogBreeds = breedOptions.狗;
      const catBreeds = breedOptions.貓;
      
      if (dogBreeds.includes(pet.breed)) {
        petType = '狗';
      } else if (catBreeds.includes(pet.breed)) {
        petType = '貓';
      }
    }
    
    setFormData({
      name: pet.name,
      type: petType,
      breed: pet.breed || '',
      birth_date: birthDateValue,
      weight: pet.weight.toString(),
      photo: photoUrl,
      location: pet.location || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個寵物嗎？所有相關的紀錄也會被刪除。')) return;
    
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchPets();
    } catch (error) {
      console.error('Error deleting pet:', error);
      setError('刪除寵物時發生錯誤');
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
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
            <div className="flex items-center">
              <button
                onClick={() => {
                  setEditingPet(null);
                  setFormData({
                    name: '',
                    type: '',
                    breed: '',
                    birth_date: '',
                    weight: '',
                    photo: '',
                    location: '',
                  });
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                新增寵物
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">浪浪管理</h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">
                {editingPet ? '編輯寵物資訊' : '新增寵物資訊'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">寵物名稱</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="請輸入寵物名稱"
                    aria-label="寵物名稱"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700">寵物類型</label>
                  <select
                    name="type"
                    id="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">請選擇寵物類型</option>
                    <option value="狗">🐕 狗狗</option>
                    <option value="貓">🐱 貓咪</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="breed" className="block text-sm font-medium text-gray-700">品種</label>
                  <select
                    name="breed"
                    id="breed"
                    value={formData.breed}
                    onChange={handleChange}
                    disabled={!formData.type}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">
                      {formData.type ? `請選擇${formData.type}品種` : '請先選擇寵物類型'}
                    </option>
                    {formData.type && breedOptions[formData.type as keyof typeof breedOptions]?.map((breed) => (
                      <option key={breed} value={breed}>
                        {breed}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700">出生日期</label>
                  <input
                    type="date"
                    name="birth_date"
                    id="birth_date"
                    value={formData.birth_date || ''}
                    onChange={handleDateChange}
                    onFocus={handleDateFocus}
                    onClick={handleDateClick}
                    disabled={submitting}
                    aria-label="寵物出生日期"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-700">體重 (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    id="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    placeholder="請輸入寵物體重"
                    aria-label="寵物體重"
                    step="0.1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="photo" className="block text-sm font-medium text-gray-700">寵物圖片網址</label>
                  <input
                    type="url"
                    name="photo"
                    id="photo"
                    value={formData.photo}
                    onChange={handleChange}
                    placeholder="請貼上寵物圖片網址或上傳後取得網址"
                    aria-label="寵物圖片網址"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">收容所名稱</label>
                  <select
                    name="location"
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    aria-label="收容所名稱"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">請選擇收容所</option>
                    <optgroup label="基隆市">
                      <option value="基隆市寵物銀行">基隆市寵物銀行</option>
                    </optgroup>
                    <optgroup label="新北市">
                      <option value="新北市板橋區公立動物之家">新北市板橋區公立動物之家</option>
                      <option value="新北市新店區公立動物之家">新北市新店區公立動物之家</option>
                      <option value="新北市中和區公立動物之家">新北市中和區公立動物之家</option>
                      <option value="新北市淡水區公立動物之家">新北市淡水區公立動物之家</option>
                      <option value="新北市瑞芳區公立動物之家">新北市瑞芳區公立動物之家</option>
                      <option value="新北市五股區公立動物之家">新北市五股區公立動物之家</option>
                      <option value="新北市八里區公立動物之家">新北市八里區公立動物之家</option>
                      <option value="新北市三芝區公立動物之家">新北市三芝區公立動物之家</option>
                    </optgroup>
                    <optgroup label="臺北市">
                      <option value="臺北市動物之家">臺北市動物之家</option>
                    </optgroup>
                  </select>
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      '儲存'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingPet(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pets.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-md p-8 text-center">
              <PawPrint className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">尚未新增任何寵物</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                新增第一隻寵物
              </button>
            </div>
          ) : (
            pets.map((pet) => (
              <div
                key={pet.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {pet.photos && Array.isArray(pet.photos) && pet.photos.length > 0 && pet.photos[0] ? (
                      <img src={pet.photos[0]} alt="寵物圖片" className="w-16 h-16 rounded-full object-cover border" />
                    ) : (
                      <div className="p-2 rounded-full bg-green-100 text-green-500">
                        <PawPrint className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                      <p className="text-sm text-gray-500">{pet.breed}</p>
                      {pet.location && (
                        <p className="text-xs text-gray-400 mt-1">收容所：{pet.location}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(pet)}
                      className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                      title="編輯"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pet.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="刪除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {pet.birth_date && (
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-600">出生日期：</p>
                      <p className="text-sm font-medium">
                        {new Date(pet.birth_date).toLocaleDateString('zh-TW')}
                        <span className="ml-2 text-gray-500">
                          ({calculateAge(pet.birth_date)} 歲)
                        </span>
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-600">體重：</p>
                    <p className="text-sm font-medium">{pet.weight} kg</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between">
                    <Link
                      to={`/health?pet=${pet.id}`}
                      className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    >
                      健康紀錄
                    </Link>
                    <Link
                      to={`/feeding?pet=${pet.id}`}
                      className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    >
                      餵食紀錄
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}