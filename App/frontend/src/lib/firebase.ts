// 僅保留 Web Push 訂閱與上傳功能

const VAPID_PUBLIC_KEY = 'BPkjF5Q8CJx9B4i5rC_0INNb1w66HWZSw4TEd-laFk_OrmWvOirz24LuhJYUx1DoXRHhGY6NFSCDGEHfwLdZnGY';

export async function subscribeUserToPush(userId: string) {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker 不支援');
    return;
    }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await fetch('http://localhost:3001/api/save-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, subscription }),
    });
  console.log('Web Push 訂閱已上傳');
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
} 