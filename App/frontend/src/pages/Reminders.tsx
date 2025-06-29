import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Edit2, Trash2, Bell } from 'lucide-react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

interface Reminder {
  id: string;
  pets: { name: string }; // 假设 pets 只有 name 属性
  type: string; // 将类型设置为 string
  title: string;
  description: string; // 确保 description 属性存在
  scheduled_time: string;
  active: boolean;
  repeat_days: number[];
  pet_id?: string; // 添加 pet_id 属性，假设它是可选的
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

const Loading = styled.div`
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: #666;
`;

const AddButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  background-color: #2196F3;
  color: white;

  &:hover {
    background-color: #1976D2;
  }
`;

export default function Reminders() {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReminders();
  }, []);

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

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchReminders();
    } catch (error) {
      console.error('删除提醒失败:', error);
      alert('删除提醒失败');
    }
  };

  if (loading) {
    return <Loading>載入中...</Loading>;
  }

  return (
    <Container>
      <Header>
        <Title><Bell size={24} /> 提醒管理</Title>
        <AddButton onClick={() => navigate('/')}>回到主頁面</AddButton>
      </Header>

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
                <span>{reminder.active ? '啟用' : '停用'}</span>
              </TableCell>
              <TableCell>
                <ActionButtons>
                  <EditButton 
                    onClick={() => alert('編輯功能尚未實現')}
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