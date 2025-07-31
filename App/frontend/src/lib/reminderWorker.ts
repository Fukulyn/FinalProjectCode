import { supabase } from './supabase';
import { showNotification } from './notifications';
import { Reminder } from '../types';

let checkInterval: NodeJS.Timeout;

export function startReminderCheck() {
  // 每分鐘檢查一次
  checkInterval = setInterval(checkReminders, 60000);
  // 立即執行一次檢查
  checkReminders();
}

export function stopReminderCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
}

async function checkReminders() {
  try {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
    const currentDay = now.getDay();

    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*, pets(name)')
      .eq('active', true)
      .contains('repeat_days', [currentDay]);

    if (error) throw error;

    reminders?.forEach((reminder: Reminder & { pets: { name: string } }) => {
      const scheduledTime = reminder.scheduled_time.slice(0, 5);
      if (scheduledTime === currentTime) {
        showNotification(
          `${reminder.pets.name} - ${reminder.title}`,
          {
            body: reminder.description || getDefaultMessage(reminder.type),
            icon: '/logo.png',
            badge: '/badge.png',
            tag: reminder.id,
            requireInteraction: true,
            data: {
              url: `/reminders?id=${reminder.id}`
            }
          }
        );
        
        // 記錄提醒已執行
        logReminderExecution(reminder.id);
      }
    });
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

async function logReminderExecution(reminderId: string) {
  try {
    await supabase.from('reminder_logs').insert([
      {
        reminder_id: reminderId,
        status: 'pending',
      },
    ]);
  } catch (error) {
    console.error('Error logging reminder execution:', error);
  }
}

function getDefaultMessage(type: Reminder['type']) {
  switch (type) {
    case 'feeding':
      return '該餵食了！';
    case 'medicine':
      return '該餵藥了！';
    case 'cleaning':
      return '該清理了！';
    case 'vaccine':
      return '該打疫苗了！';
    default:
      return '提醒時間到了！';
  }
}