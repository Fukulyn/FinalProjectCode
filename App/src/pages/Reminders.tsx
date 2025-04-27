import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Clock, Bell, Calendar, Check, X } from 'lucide-react';
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

// ... 保持其他狀態和函數定義不變 ...

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... 表單提交邏輯 ...
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
    </Container>
  );
}