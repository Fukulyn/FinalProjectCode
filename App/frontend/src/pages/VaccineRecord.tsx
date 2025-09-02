import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Home, Syringe, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pet, VaccineRecord } from '../types';
import styled from 'styled-components';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface VaccineInfo {
  name: string;
  schedule: string;
  purpose: string;
}

interface CoreVaccine {
  id: string;
  category: string;
  species: string;
  name: string;
  englishName: string;
}

const coreVaccines: CoreVaccine[] = [
  { id: 'cdv', category: '犬隻核心疫苗', species: '犬隻', name: '犬瘟熱', englishName: 'Canine distemper virus (CDV)' },
  { id: 'cav', category: '犬隻核心疫苗', species: '犬隻', name: '犬腺病毒', englishName: 'Canine adenovirus (CAV)' },
  { id: 'cpv2', category: '犬隻核心疫苗', species: '犬隻', name: '第二型犬小病毒', englishName: 'Canine parvovirus type 2 (CPV-2)' },
  { id: 'fpv', category: '貓隻核心疫苗', species: '貓隻', name: '貓瘟', englishName: 'Feline parvovirus (FPV)' },
  { id: 'fcv', category: '貓隻核心疫苗', species: '貓隻', name: '貓卡里西病毒', englishName: 'Feline calicivirus (FCV)' },
  { id: 'fhv1', category: '貓隻核心疫苗', species: '貓隻', name: '第一型貓疱疹病毒', englishName: 'Feline herpesvirus-1 (FHV-1)' },
  { id: 'lepto', category: '核心與非核心兼具', species: '犬隻', name: '鉤端螺旋體病', englishName: 'Leptospira spp.' },
  { id: 'bordetella', category: '核心與非核心兼具', species: '犬隻', name: '犬支氣管敗血性博德氏桿菌', englishName: 'Bordetella bronchiseptica' },
];

const vaccineData: VaccineInfo[] = [
  { name: 'DHPP (犬瘟熱等)', schedule: '6-8 週、10-12 週、14-16 週，然後每 1-3 年', purpose: '預防犬瘟熱、肝炎、犬瘟、副流感等嚴重疾病' },
  { name: '狂犬病', schedule: '12 週，然後每 1-3 年', purpose: '預防致命的狂犬病' },
  { name: '黃熱病 (Leptospirosis)', schedule: '12 週，然後每年', purpose: '預防細菌性疾病，保護腎臟和肝臟' },
  { name: '犬咳 (Bordetella)', schedule: '每年，如果需要', purpose: '預防呼吸道疾病，適合社交活躍的狗' },
  { name: '萊姆病', schedule: '每年，如果在流行區域', purpose: '預防由螨蟲傳播的疾病' },
  { name: 'FVRCP (貓鼻氣管炎等)', schedule: '6-8 週、10-12 週、14-16 週，然後每 1-3 年', purpose: '預防呼吸道和腸道疾病' },
  { name: '貓狂犬病', schedule: '12 週，然後每 1-3 年', purpose: '預防致命的狂犬病' },
  { name: '貓白血病 (FeLV)', schedule: '9-12 週，第二次劑量 2-4 週後，然後每年或戶外貓建議', purpose: '預防病毒性疾病，保護免疫系統' },
];

// 計算下次接種日期的函數
const calculateNextDueDate = (vaccineName: string, currentDate: string): string => {
  const date = new Date(currentDate);
  
  switch (vaccineName) {
    case 'DHPP (犬瘟熱等)':
    case 'FVRCP (貓鼻氣管炎等)':
      // 多劑疫苗：第一劑後4週，之後每1-3年（預設2年）
      date.setFullYear(date.getFullYear() + 2);
      break;
    case '狂犬病':
    case '貓狂犬病':
      // 狂犬病疫苗：每1-3年（預設2年）
      date.setFullYear(date.getFullYear() + 2);
      break;
    case '黃熱病 (Leptospirosis)':
    case '犬咳 (Bordetella)':
    case '萊姆病':
    case '貓白血病 (FeLV)':
      // 年度疫苗：每年
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      // 預設：每年
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
};

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const TableHeader = styled.th`
  padding: 16px;
  text-align: left;
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
`;

const TableCell = styled.td`
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
`;

const StatusBadge = styled.span<{ $status: 'expired' | 'due' | 'normal' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 14px;
  background-color: ${props => 
    props.$status === 'expired' ? '#ffebee' : 
    props.$status === 'due' ? '#fff3cd' : 
    '#e8f5e9'};
  color: ${props => 
    props.$status === 'expired' ? '#c62828' : 
    props.$status === 'due' ? '#856404' : 
    '#2e7d32'};
`;

export default function VaccineRecordPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [records, setRecords] = useState<VaccineRecord[]>([]);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [coreVaccineStatus, setCoreVaccineStatus] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    vaccine_name: '',
    date: '',
    next_due_date: '',
  });

  // 處理疫苗名稱變更，自動計算下次接種日期
  const handleVaccineNameChange = (vaccineName: string) => {
    const updatedFormData = { ...formData, vaccine_name: vaccineName };
    
    // 如果接種日期已填寫，自動計算下次接種日期
    if (updatedFormData.date && vaccineName) {
      updatedFormData.next_due_date = calculateNextDueDate(vaccineName, updatedFormData.date);
    }
    
    setFormData(updatedFormData);
  };

  // 處理接種日期變更，自動計算下次接種日期
  const handleDateChange = (date: string) => {
    const updatedFormData = { ...formData, date };
    
    // 如果疫苗名稱已選擇，自動計算下次接種日期
    if (updatedFormData.vaccine_name && date) {
      updatedFormData.next_due_date = calculateNextDueDate(updatedFormData.vaccine_name, date);
    }
    
    setFormData(updatedFormData);
  };

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPet(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching pets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVaccineRecords = useCallback(async () => {
    if (!selectedPet) return;
    
    try {
      const { data, error } = await supabase
        .from('vaccine_records')
        .select('*')
        .eq('pet_id', selectedPet)
        .order('date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching vaccine records:', error);
    }
  }, [selectedPet]);

  const fetchCoreVaccineStatus = useCallback(async () => {
    if (!selectedPet) return;
    
    try {
      // 從 vaccine_records 表中檢查核心疫苗的完成狀態
      const coreVaccineNames = coreVaccines.map(v => v.name);
      
      const { data, error } = await supabase
        .from('vaccine_records')
        .select('vaccine_name, status')
        .eq('pet_id', selectedPet)
        .in('vaccine_name', coreVaccineNames);

      if (error) throw error;
      
      const statusMap: Record<string, boolean> = {};
      
      // 對每個核心疫苗檢查是否已接種
      coreVaccines.forEach(vaccine => {
        const record = data?.find(r => r.vaccine_name === vaccine.name);
        statusMap[vaccine.id] = record?.status === '已接種';
      });
      
      setCoreVaccineStatus(statusMap);
    } catch (error) {
      console.error('Error fetching core vaccine status:', error);
    }
  }, [selectedPet]);

  const markCoreVaccineComplete = async (vaccineId: string) => {
    if (!selectedPet) return;
    
    try {
      // 找到對應的核心疫苗資訊
      const vaccine = coreVaccines.find(v => v.id === vaccineId);
      if (!vaccine) {
        throw new Error('找不到疫苗資訊');
      }

      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      const nextDueDate = calculateNextDueDate(vaccine.name, todayString);

      // 檢查是否已經有這個疫苗的記錄
      const { data: existingRecord, error: checkError } = await supabase
        .from('vaccine_records')
        .select('*')
        .eq('pet_id', selectedPet)
        .eq('vaccine_name', vaccine.name)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示沒有找到記錄
        throw checkError;
      }

      if (existingRecord) {
        // 如果已經有記錄，更新狀態
        const { error: updateError } = await supabase
          .from('vaccine_records')
          .update({
            status: '已接種',
            date: todayString,
            next_due_date: nextDueDate,
          })
          .eq('id', existingRecord.id);

        if (updateError) throw updateError;
      } else {
        // 如果沒有記錄，新增一筆
        const { error: insertError } = await supabase
          .from('vaccine_records')
          .insert({
            pet_id: selectedPet,
            vaccine_name: vaccine.name,
            date: todayString,
            next_due_date: nextDueDate,
            status: '已接種',
            notes: `核心疫苗 - ${vaccine.category}`,
          });

        if (insertError) throw insertError;
      }
      
      // 更新本地狀態
      setCoreVaccineStatus(prev => ({
        ...prev,
        [vaccineId]: true,
      }));

      // 重新載入疫苗記錄以顯示最新資料
      fetchVaccineRecords();
      
      alert(`${vaccine.name} 已標記為完成接種`);
    } catch (error) {
      console.error('Error marking core vaccine complete:', error);
      alert('更新疫苗狀態時發生錯誤');
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      fetchVaccineRecords();
      fetchCoreVaccineStatus();
    }
  }, [selectedPet, fetchVaccineRecords, fetchCoreVaccineStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 驗證必填欄位
    if (!selectedPet) {
      alert('請先選擇寵物');
      return;
    }
    
    if (!formData.vaccine_name || !formData.date) {
      alert('請填寫疫苗名稱和接種日期');
      return;
    }

    // 自動計算下次接種日期（如果還沒有的話）
    let nextDueDate = formData.next_due_date;
    if (!nextDueDate && formData.vaccine_name && formData.date) {
      nextDueDate = calculateNextDueDate(formData.vaccine_name, formData.date);
    }
    
    console.log('Form submission started:', {
      selectedPet,
      formData,
      petsCount: pets.length
    });
    
    try {
      // 檢查認證狀態
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('用戶未登入，請重新登入');
        return;
      }
      
      // 檢查選擇的寵物是否屬於當前用戶
      console.log('Verifying pet ownership:', {
        selectedPet,
        userId: user.id,
        availablePets: pets.map(p => ({ id: p.id, name: p.name }))
      });

      const { data: petData, error: petError } = await supabase
        .from('pets')
        .select('id, user_id, name')
        .eq('id', selectedPet)
        .eq('user_id', user.id);
      
      if (petError) {
        console.error('Pet verification error:', petError);
        alert('查詢寵物時發生錯誤：' + petError.message);
        return;
      }
      
      console.log('Pet verification result:', { petData, petError });
      
      if (!petData || petData.length === 0) {
        // 嘗試查詢該寵物是否存在但屬於其他用戶
        const { data: allPetData } = await supabase
          .from('pets')
          .select('id, user_id, name')
          .eq('id', selectedPet);
          
        console.error('Pet not found or not owned by user:', {
          selectedPet,
          userId: user.id,
          petData,
          allPetData,
          availablePets: pets
        });
        
        if (allPetData && allPetData.length > 0) {
          alert(`寵物存在但不屬於當前用戶。寵物所有者ID: ${allPetData[0].user_id}`);
        } else {
          alert('所選寵物不存在。請重新選擇寵物。');
        }
        return;
      }
      
      const pet = petData[0];
      
      console.log('User authenticated:', user.id);
      console.log('Pet verified:', pet);
      console.log('Submitting vaccine record:', {
        pet_id: selectedPet,
        vaccine_name: formData.vaccine_name,
        date: formData.date,
        next_due_date: nextDueDate,
      });

      const { data, error } = await supabase.from('vaccine_records').insert([
        {
          pet_id: selectedPet,
          vaccine_name: formData.vaccine_name,
          date: formData.date,
          next_due_date: nextDueDate,
        },
      ]).select();

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        // 提供更友善的錯誤訊息
        let userMessage = '新增疫苗紀錄失敗: ';
        if (error.code === 'PGRST301') {
          userMessage += '沒有權限執行此操作';
        } else if (error.message.includes('foreign key')) {
          userMessage += '所選寵物不存在';
        } else if (error.message.includes('not null')) {
          userMessage += '請填寫所有必填欄位';
        } else {
          userMessage += error.message || '未知錯誤';
        }
        
        alert(userMessage);
        throw error;
      }

      console.log('Vaccine record added successfully:', data);

      // 發送單一郵件提醒（只針對新增的疫苗記錄）
      try {
        if (user.email) {
          await sendEmailReminder(
            user.email, 
            formData.vaccine_name,
            pet.name,
            formData.next_due_date
          );
          console.log('疫苗提醒郵件已發送');
        }
      } catch (emailError) {
        console.log('郵件發送失敗，但疫苗記錄已成功新增:', emailError);
      }

      setFormData({
        vaccine_name: '',
        date: '',
        next_due_date: '',
      });
      setShowForm(false);
      fetchVaccineRecords();
      alert('疫苗記錄新增成功！');
    } catch (error) {
      console.error('Error adding vaccine record:', error);
      
      // 詳細的錯誤處理
      let errorMessage = '新增疫苗記錄失敗';
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage += `: ${error.message}`;
        }
        if ('details' in error) {
          console.error('Error details:', error.details);
        }
        if ('hint' in error) {
          console.error('Error hint:', error.hint);
        }
        if ('code' in error) {
          console.error('Error code:', error.code);
        }
      }
      
      alert(errorMessage);
    }
  };

  const checkVaccineStatus = (vaccineName: string) => {
    const record = records.find(r => r.vaccine_name === vaccineName);
    if (!record) return '未接種';
    const nextDueDate = new Date(record.next_due_date);
    const today = new Date();
    return nextDueDate < today ? '已過期' : '正常';
  };

  const updateVaccineStatus = async (recordId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('vaccine_records')
        .update({ status })
        .eq('id', recordId);

      if (error) throw error;

      fetchVaccineRecords();
    } catch (error) {
      console.error('更新疫苗狀態失敗:', error);
    }
  };

  const deleteVaccineRecord = async (recordId: string) => {
    try {
      const { error } = await supabase.from('vaccine_records').delete().eq('id', recordId);
      if (error) throw error;
      fetchVaccineRecords();
    } catch (error) {
      alert('刪除疫苗紀錄失敗');
      console.error('刪除疫苗紀錄失敗:', error);
    }
  };

  const sendEmailReminder = async (email: string, vaccineName: string, petName?: string, dueDate?: string) => {
    try {
      const res = await fetch('http://localhost:3001/api/send-vaccine-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          vaccine_name: vaccineName,
          pet_name: petName || '您的寵物',
          due_date: dueDate || ''
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '寄信失敗');
      console.log('Email sent:', data);
    } catch (err) {
      console.error('Email send error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Container>
      <ToastContainer position="top-center" autoClose={3000} aria-label="疫苗操作提示" />
      <nav className="bg-white shadow mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-700 hover:text-blue-500 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">返回主頁</span>
                <span className="sm:hidden">主頁</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <label htmlFor="pet-select" className="sr-only">選擇寵物</label>
              <select
                id="pet-select"
                value={selectedPet}
                onChange={(e) => {
                  console.log('Pet selection changed:', e.target.value);
                  setSelectedPet(e.target.value);
                }}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base max-w-32 sm:max-w-none"
                aria-label="選擇寵物"
              >
                {pets.length === 0 ? (
                  <option value="">沒有可用的寵物</option>
                ) : (
                  pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))
                )}
              </select>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">新增紀錄</span>
                <span className="sm:hidden">新增</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">疫苗紀錄</h1>
          <p className="mt-1 text-gray-500">追蹤寵物的疫苗接種狀況</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">接種歷史</h2>
          </div>
          
          {/* 桌面版表格 */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader>疫苗名稱</TableHeader>
                  <TableHeader>接種日期</TableHeader>
                  <TableHeader>下次接種日期</TableHeader>
                  <TableHeader>狀態</TableHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => {
                  const nextDueDate = new Date(record.next_due_date);
                  const today = new Date();
                  const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <tr key={record.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Syringe className="w-4 h-4 text-blue-500" />
                          {record.vaccine_name}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(record.date).toLocaleDateString('zh-TW')}</TableCell>
                      <TableCell>{new Date(record.next_due_date).toLocaleDateString('zh-TW')}</TableCell>
                      <TableCell>
                        <StatusBadge $status={daysUntilDue < 0 ? 'expired' : daysUntilDue <= 30 ? 'due' : 'normal'}>
                          {daysUntilDue < 0 ? (
                            <span>已過期</span>
                          ) : daysUntilDue <= 30 ? (
                            <span>即將到期 ({daysUntilDue} 天)</span>
                          ) : (
                            <span>正常</span>
                          )}
                        </StatusBadge>
                      </TableCell>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
          
          {/* 手機版卡片布局 */}
          <div className="md:hidden p-4 space-y-4">
            {records.map((record) => {
              const nextDueDate = new Date(record.next_due_date);
              const today = new Date();
              const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div key={record.id} className="bg-gray-50 rounded-lg p-4 border">
                  {/* 頂部：疫苗名稱和狀態 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Syringe className="w-4 h-4 text-blue-500" />
                      <h3 className="text-sm font-medium text-gray-900">{record.vaccine_name}</h3>
                    </div>
                    <StatusBadge $status={daysUntilDue < 0 ? 'expired' : daysUntilDue <= 30 ? 'due' : 'normal'}>
                      {daysUntilDue < 0 ? (
                        <span>已過期</span>
                      ) : daysUntilDue <= 30 ? (
                        <span>即將到期</span>
                      ) : (
                        <span>正常</span>
                      )}
                    </StatusBadge>
                  </div>
                  
                  {/* 疫苗資訊 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">接種日期：</span>
                      <span className="text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">下次接種：</span>
                      <span className="text-sm text-gray-900">
                        {new Date(record.next_due_date).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                    {daysUntilDue <= 30 && daysUntilDue >= 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">距離到期：</span>
                        <span className="text-sm text-orange-600 font-medium">{daysUntilDue} 天</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 核心疫苗狀態區塊 */}
        <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">收容所核心疫苗接種狀況</h2>
            <p className="text-sm text-gray-600 mt-1">流浪動物進入收容所必須接種的核心疫苗</p>
          </div>
          
          {/* 桌面版表格 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    疫苗分類
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    適用動物
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    疫苗名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    英文名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    接種狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coreVaccines.map(vaccine => {
                  const isCompleted = coreVaccineStatus[vaccine.id] || false;
                  return (
                    <tr key={vaccine.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vaccine.category === '犬隻核心疫苗' ? 'bg-blue-100 text-blue-800' :
                          vaccine.category === '貓隻核心疫苗' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {vaccine.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vaccine.species}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vaccine.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vaccine.englishName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          isCompleted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isCompleted ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              施打完畢
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              未施打
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {!isCompleted && (
                          <button
                            onClick={() => markCoreVaccineComplete(vaccine.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            標記完成
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* 手機版卡片布局 */}
          <div className="md:hidden p-4 space-y-4">
            {coreVaccines.map(vaccine => {
              const isCompleted = coreVaccineStatus[vaccine.id] || false;
              return (
                <div key={vaccine.id} className="bg-gray-50 rounded-lg p-4 border">
                  {/* 頂部：分類和狀態 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      vaccine.category === '犬隻核心疫苗' ? 'bg-blue-100 text-blue-800' :
                      vaccine.category === '貓隻核心疫苗' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {vaccine.category}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                      isCompleted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isCompleted ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          施打完畢
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          未施打
                        </>
                      )}
                    </span>
                  </div>
                  
                  {/* 主要資訊 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">適用動物：</span>
                      <span className="text-sm font-medium text-gray-900">{vaccine.species}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">疫苗名稱：</span>
                      <span className="text-sm font-medium text-gray-900">{vaccine.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">英文名稱：</span>
                      <span className="text-sm text-gray-500">{vaccine.englishName}</span>
                    </div>
                  </div>
                  
                  {/* 操作按鈕 */}
                  {!isCompleted && (
                    <div className="mt-4">
                      <button
                        onClick={() => markCoreVaccineComplete(vaccine.id)}
                        className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        標記完成
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">疫苗紀錄</h2>
          </div>
          
          {/* 桌面版表格 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    疫苗名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    接種狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    接種時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    功用
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map(record => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.vaccine_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {checkVaccineStatus(record.vaccine_name)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vaccineData.find(v => v.name === record.vaccine_name)?.purpose}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        type="button"
                        onClick={() => updateVaccineStatus(record.id, '已接種')}
                        className="text-green-500 hover:text-green-700"
                        aria-label="標記為已接種"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteVaccineRecord(record.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                        aria-label="刪除疫苗紀錄"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 手機版卡片布局 */}
          <div className="md:hidden p-4 space-y-4">
            {records.map(record => (
              <div key={record.id} className="bg-gray-50 rounded-lg p-4 border">
                {/* 頂部：疫苗名稱和狀態 */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">{record.vaccine_name}</h3>
                  <div className="text-xs text-gray-600">
                    {checkVaccineStatus(record.vaccine_name)}
                  </div>
                </div>
                
                {/* 疫苗資訊 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">接種時間：</span>
                    <span className="text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">功用：</span>
                    <span className="text-sm text-gray-900 text-right max-w-48">
                      {vaccineData.find(v => v.name === record.vaccine_name)?.purpose}
                    </span>
                  </div>
                </div>
                
                {/* 操作按鈕 */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => deleteVaccineRecord(record.id)}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    刪除紀錄
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">疫苗接種狀況</h2>
          </div>
          
          {/* 桌面版表格 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    疫苗名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    接種時間
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    功用
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vaccineData.map(vaccine => (
                  <tr key={vaccine.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vaccine.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vaccine.schedule}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vaccine.purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 手機版卡片布局 */}
          <div className="md:hidden p-4 space-y-3">
            {vaccineData.map(vaccine => (
              <div key={vaccine.name} className="bg-gray-50 rounded-lg p-4 border">
                {/* 疫苗名稱 */}
                <h3 className="text-base font-semibold text-gray-900 mb-3">{vaccine.name}</h3>
                
                {/* 疫苗資訊 */}
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">接種時間：</span>
                    <p className="text-sm text-gray-900 mt-1 leading-relaxed">{vaccine.schedule}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">功用：</span>
                    <p className="text-sm text-gray-900 mt-1 leading-relaxed">{vaccine.purpose}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">新增疫苗紀錄</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="vaccine-name" className="block text-sm font-medium text-gray-700">疫苗名稱</label>
                <select
                  id="vaccine-name"
                  value={formData.vaccine_name}
                  onChange={(e) => handleVaccineNameChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">選擇疫苗</option>
                  <option value="DHPP (犬瘟熱等)">DHPP (犬瘟熱等)</option>
                  <option value="狂犬病">狂犬病</option>
                  <option value="黃熱病 (Leptospirosis)">黃熱病 (Leptospirosis)</option>
                  <option value="犬咳 (Bordetella)">犬咳 (Bordetella)</option>
                  <option value="萊姆病">萊姆病</option>
                  <option value="FVRCP (貓鼻氣管炎等)">FVRCP (貓鼻氣管炎等)</option>
                  <option value="貓狂犬病">貓狂犬病</option>
                  <option value="貓白血病 (FeLV)">貓白血病 (FeLV)</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label htmlFor="vaccination-date" className="block text-sm font-medium text-gray-700">接種日期</label>
                <input
                  id="vaccination-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="next-due-date" className="block text-sm font-medium text-gray-700">下次接種日期</label>
                <input
                  id="next-due-date"
                  type="date"
                  value={formData.next_due_date}
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">系統會根據疫苗類型自動計算下次接種日期</p>
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
    </Container>
  );
}