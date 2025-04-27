import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Clock, Bell, Calendar, Check, X, Syringe, CheckCircle, XCircle } from 'lucide-react';
import styled from 'styled-components';

interface FormData {
  type: 'feeding' | 'medicine' | 'vaccine' | 'grooming' | 'other';
  title: string;
  description: string;
  scheduled_time: string;
  repeat_days: number[];
  active: boolean;
}

interface Reminder {
  id: string;
  pets: { name: string }; // 假设 pets 只有 name 属性
  type: FormData['type']; // 将类型设置为 FormData 中的 type
  title: string;
  description: string; // 确保 description 属性存在
  scheduled_time: string;
  active: boolean;
  repeat_days: number[];
  pet_id?: string; // 添加 pet_id 属性，假设它是可选的
}

interface VaccineRecord {
  id: string;
  pet_id: string;
  vaccine_name: string;
  date: string;
  next_due_date: string;
}

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

interface Day {
  value: number; // 或者 string，取决于您的需求
  label: string;
}

const Container = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #45a049;
  }
`;

const Form = styled.form`
  background: #f8f9fa;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;

  &:focus {
    border-color: #4CAF50;
    outline: none;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;

  &:focus {
    border-color: #4CAF50;
    outline: none;
  }
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
`;

const DayCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #f0f0f0;
  }
`;

const CheckboxLabel = styled.span`
  font-size: 14px;
`;

const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #45a049;
  }
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

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EditButton = styled(IconButton)`
  background-color: #2196F3;
  color: white;

  &:hover {
    background-color: #1976D2;
  }
`;

const DeleteButton = styled(IconButton)`
  background-color: #f44336;
  color: white;

  &:hover {
    background-color: #d32f2f;
  }
`;

const StatusBadge = styled.span<{ active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 14px;
  background-color: ${props => props.active ? '#e8f5e9' : '#ffebee'};
  color: ${props => props.active ? '#2e7d32' : '#c62828'};
`;

const Loading = styled.div`
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: #666;
`;

const updateVaccineStatus = async (recordId: string, newStatus: string) => {
  try {
    const { error } = await supabase
      .from('vaccine_records')
      .update({ status: newStatus }) // 假设您在数据库中有一个 status 字段
      .eq('id', recordId);

    if (error) throw error;

    fetchVaccineRecords(); // 更新后重新获取疫苗记录
  } catch (error) {
    console.error('更新疫苗状态失败:', error);
  }
};

export default function Reminders() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPet, setSelectedPet] = useState<string>('');
  const [pets, setPets] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState<FormData>({
    type: 'feeding',
    title: '',
    description: '',
    scheduled_time: '',
    repeat_days: [],
    active: true
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [records, setRecords] = useState<VaccineRecord[]>([]);
  const [vaccineFormData, setVaccineFormData] = useState({
    vaccine_name: '',
    date: '',
    next_due_date: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPets();
    fetchReminders();
  }, []);

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase.from('pets').select('*'); // 假设您有一个 pets 表
      if (error) throw error;
      setPets(data); // 使用 setPets 更新宠物列表
    } catch (error) {
      console.error('獲取寵物列表失敗:', error);
      alert('獲取寵物列表失敗');
    }
  };

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase.from('reminders').select('*');
      if (error) throw error;
      setReminders(data);
    } catch (error) {
      console.error('獲取提醒列表失敗:', error);
      alert('獲取提醒列表失敗');
    } finally {
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
          vaccine_name: vaccineFormData.vaccine_name,
          date: vaccineFormData.date,
          next_due_date: vaccineFormData.next_due_date,
        },
      ]);

      if (error) throw error;

      setVaccineFormData({
        vaccine_name: '',
        date: '',
        next_due_date: '',
      });
      fetchVaccineRecords();
    } catch (error) {
      console.error('Error adding vaccine record:', error);
    }
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      repeat_days: prev.repeat_days.includes(day)
        ? prev.repeat_days.filter(d => d !== day)
        : [...prev.repeat_days, day]
    }));
  };

  const daysOfWeek: Day[] = [
    { value: 1, label: '星期一' },
    { value: 2, label: '星期二' },
    { value: 3, label: '星期三' },
    { value: 4, label: '星期四' },
    { value: 5, label: '星期五' },
    { value: 6, label: '星期六' },
    { value: 7, label: '星期日' },
  ];

  const handleDelete = async (id: string) => {
    try {
      // 调用 Supabase 删除记录的逻辑
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 重新获取提醒列表
      fetchReminders();
    } catch (error) {
      console.error('删除提醒失败:', error);
      alert('删除提醒失败');
    }
  };

  const handleEdit = (reminder: Reminder) => {
    // 设置表单数据为要编辑的提醒
    setFormData({
      type: reminder.type,
      title: reminder.title,
      description: reminder.description,
      scheduled_time: reminder.scheduled_time,
      repeat_days: reminder.repeat_days,
      active: reminder.active,
    });
    setSelectedPet(reminder.pet_id || ''); // 使用 pet_id
    setEditingId(reminder.id); // 设置当前编辑的提醒 ID
    setShowForm(true); // 显示表单以进行编辑
  };

  const checkVaccineStatus = (vaccineName: string) => {
    const record = records.find(r => r.vaccine_name === vaccineName);
    if (!record) return '未接種';
    const nextDueDate = new Date(record.next_due_date);
    const today = new Date();
    return nextDueDate < today ? '已過期' : '正常';
  };

  if (loading) {
    return <Loading>載入中...</Loading>;
  }

  return (
    <Container>
      <Header>
        <Title><Bell size={24} /> 提醒管理</Title>
        <AddButton onClick={() => setShowForm(!showForm)}>
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? '取消' : '新增提醒'}
        </AddButton>
      </Header>

      {showForm && (
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label><Bell size={16} /> 選擇寵物</Label>
            <Select
              value={selectedPet}
              onChange={(e) => setSelectedPet(e.target.value)}
              required
              aria-label="選擇寵物"
            >
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label><Bell size={16} /> 類型</Label>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FormData['type'] })}
              required
              aria-label="提醒類型"
            >
              <option value="feeding">餵食</option>
              <option value="medicine">用藥</option>
              <option value="vaccine">疫苗</option>
              <option value="grooming">美容</option>
              <option value="other">其他</option>
            </Select>
          </FormGroup>

          <FormGroup>
            <Label><Bell size={16} /> 標題</Label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="輸入提醒標題"
              aria-label="提醒標題"
            />
          </FormGroup>

          <FormGroup>
            <Label><Bell size={16} /> 描述</Label>
            <Input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="輸入提醒描述"
              aria-label="提醒描述"
            />
          </FormGroup>

          <FormGroup>
            <Label><Clock size={16} /> 時間</Label>
            <Input
              type="time"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              required
              aria-label="提醒時間"
            />
          </FormGroup>

          <FormGroup>
            <Label><Calendar size={16} /> 重複日期</Label>
            <DaysGrid>
              {daysOfWeek.map((day) => (
                <DayCheckbox key={day.value}>
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.repeat_days.includes(day.value)}
                      onChange={() => handleDayToggle(day.value)}
                      aria-label={`重複日期: ${day.label}`}
                    />
                    <CheckboxLabel>{day.label}</CheckboxLabel>
                  </label>
                </DayCheckbox>
              ))}
            </DaysGrid>
          </FormGroup>

          <FormGroup>
            <SwitchLabel>
              <Bell size={16} /> 啟用提醒
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                aria-label="啟用提醒"
              />
            </SwitchLabel>
          </FormGroup>

          <SubmitButton type="submit">
            {editingId ? '更新' : '儲存'}
          </SubmitButton>
        </Form>
      )}

      <Table>
        <thead>
          <tr>
            <TableHeader>寵物</TableHeader>
            <TableHeader>類型</TableHeader>
            <TableHeader>標題</TableHeader>
            <TableHeader>時間</TableHeader>
            <TableHeader>狀態</TableHeader>
            <TableHeader>操作</TableHeader>
          </tr>
        </thead>
        <tbody>
          {reminders.map((reminder: Reminder) => (
            <tr key={reminder.id}>
              <TableCell>{reminder.pets.name}</TableCell>
              <TableCell>{reminder.type}</TableCell>
              <TableCell>{reminder.title}</TableCell>
              <TableCell>{reminder.scheduled_time}</TableCell>
              <TableCell>
                <StatusBadge active={reminder.active}>
                  {reminder.active ? <Check size={16} /> : <X size={16} />}
                  {reminder.active ? '啟用' : '停用'}
                </StatusBadge>
              </TableCell>
              <TableCell>
                <ActionButtons>
                  <EditButton 
                    onClick={() => handleEdit(reminder)}
                    title="編輯"
                  >
                    <Edit2 size={16} />
                  </EditButton>
                  <DeleteButton 
                    onClick={() => handleDelete(reminder.id)}
                    title="刪除"
                  >
                    <Trash2 size={16} />
                  </DeleteButton>
                </ActionButtons>
              </TableCell>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="bg-white rounded-lg shadow overflow-hidden">
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
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Syringe className="w-4 h-4 text-blue-500" />
                      {record.vaccine_name}
                    </div>
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
                      onClick={() => updateVaccineStatus(record.id, '已接種')}
                      className="text-green-500 hover:text-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateVaccineStatus(record.id, '未接種')}
                      className="text-red-500 hover:text-red-700 ml-2"
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

      {/* 新增疫苗紀錄的表單 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">疫苗名稱</label>
          <input
            type="text"
            value={vaccineFormData.vaccine_name}
            onChange={(e) => setVaccineFormData({ ...vaccineFormData, vaccine_name: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">接種日期</label>
          <input
            type="date"
            value={vaccineFormData.date}
            onChange={(e) => setVaccineFormData({ ...vaccineFormData, date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">下次接種日期</label>
          <input
            type="date"
            value={vaccineFormData.next_due_date}
            onChange={(e) => setVaccineFormData({ ...vaccineFormData, next_due_date: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          儲存疫苗紀錄
        </button>
      </form>
    </Container>
  );
}