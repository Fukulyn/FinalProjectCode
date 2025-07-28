import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
  authDomain: "pet-health-monitor.firebaseapp.com",
  projectId: "pet-health-monitor",
  storageBucket: "pet-health-monitor.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BLXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
      });
      console.log('Notification token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('Permission request failed:', error);
    return null;
  }
};

export const sendNotification = (title: string, body: string) => {
  try {
    new Notification(title, {
      body,
      icon: '/logo.png'
    });
  } catch (error) {
    console.error('發送通知失敗:', error);
  }
}; 