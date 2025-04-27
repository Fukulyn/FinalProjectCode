import React, { useState, useEffect } from 'react';
import { Plus, PawPrint, Loader2, Home, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Pet } from '../types';
import { Link } from 'react-router-dom';

export default function PetProfile() {
  const { user } = useAuthStore();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    breed: '',
    birth_date: '',
    weight: '',
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
      if (editingPet) {
        // 更新現有寵物
        const { error } = await supabase
          .from('pets')
          .update({
            name: formData.name,
            type: formData.type,
            breed: formData.breed,
            birth_date: formData.birth_date,
            weight: parseFloat(formData.weight),
          })
          .eq('id', editingPet.id);

        if (error) throw error;
      } else {
        // 新增寵物
        const { error } = await supabase.from('pets').insert([
          {
            user_id: user?.id,
            name: formData.name,
            type: formData.type,
            breed: formData.breed,
            birth_date: formData.birth_date,
            weight: parseFloat(formData.weight),
          },
        ]);

        if (error) throw error;
      }

      setFormData({
        name: '',
        type: '',
        breed: '',
        birth_date: '',
        weight: '',
      });
      setShowForm(false);
      setEditingPet(null);
      fetchPets();
    } catch (error) {
      console.error('Error saving pet:', error);
      setError('儲存寵物資料時發生錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      type: pet.type,
      breed: pet.breed || '',
      birth_date: pet.birth_date ? new Date(pet.birth_date).toISOString().split('T')[0] : '',
      weight: pet.weight.toString(),
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
        <h1 className="text-2xl font-bold text-gray-900 mb-8">我的寵物</h1>

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
                  <label className="block text-sm font-medium text-gray-700">寵物名稱</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">寵物類型</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">請選擇</option>
                    <option value="dog">狗</option>
                    <option value="cat">貓</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">品種</label>
                  <input
                    type="text"
                    name="breed"
                    value={formData.breed}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">出生日期</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">體重 (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    step="0.1"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
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
                    <div className={`p-2 rounded-full ${
                      pet.type === 'dog' ? 'bg-blue-100 text-blue-500' :
                      pet.type === 'cat' ? 'bg-purple-100 text-purple-500' :
                      'bg-green-100 text-green-500'
                    }`}>
                      <PawPrint className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{pet.name}</h3>
                      <p className="text-sm text-gray-500">
                        {pet.type === 'dog' ? '狗' : pet.type === 'cat' ? '貓' : '其他'} · {pet.breed}
                      </p>
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