import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Syringe, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Pet, VaccineRecord } from '../types';
import styled from 'styled-components';

interface VaccineInfo {
  name: string;
  schedule: string;
  purpose: string;
}

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
  const [formData, setFormData] = useState({
    vaccine_name: '',
    date: '',
    next_due_date: '',
  });

  useEffect(() => {
    fetchPets();
  }, []);

  useEffect(() => {
    if (selectedPet) {
      fetchVaccineRecords();
    }
  }, [selectedPet]);

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

  const fetchVaccineRecords = async () => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('vaccine_records').insert([
        {
          pet_id: selectedPet,
          vaccine_name: formData.vaccine_name,
          date: formData.date,
          next_due_date: formData.next_due_date,
        },
      ]);

      if (error) throw error;

      setFormData({
        vaccine_name: '',
        date: '',
        next_due_date: '',
      });
      setShowForm(false);
      fetchVaccineRecords();
    } catch (error) {
      console.error('Error adding vaccine record:', error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <Container>
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
                aria-label="選擇寵物"
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
          <h1 className="text-2xl font-bold text-gray-900">疫苗紀錄</h1>
          <p className="mt-1 text-gray-500">追蹤寵物的疫苗接種狀況</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">接種歷史</h2>
          </div>
          <div className="overflow-x-auto">
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
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">疫苗紀錄</h2>
          </div>
          <div className="overflow-x-auto">
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
                        onClick={() => updateVaccineStatus(record.id, '未接種')}
                        className="text-red-500 hover:text-red-700 ml-2"
                        aria-label="標記為未接種"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">疫苗接種狀況</h2>
          </div>
          <div className="overflow-x-auto">
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
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">新增疫苗紀錄</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="vaccine-name" className="block text-sm font-medium text-gray-700">疫苗名稱</label>
                <input
                  id="vaccine-name"
                  type="text"
                  value={formData.vaccine_name}
                  onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="vaccination-date" className="block text-sm font-medium text-gray-700">接種日期</label>
                <input
                  id="vaccination-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
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
    </Container>
  );
}