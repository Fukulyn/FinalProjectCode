import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, Camera, Battery, Wifi, Plus, Loader2, Bluetooth, X } from 'lucide-react';
import { Device } from '../types';

interface BluetoothDevice {
  id: string;
  name: string;
  type: 'camera' | 'feeder' | 'collar';
}

export default function DeviceManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [showPairing, setShowPairing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foundDevices, setFoundDevices] = useState<BluetoothDevice[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 模擬載入已配對設備
    setTimeout(() => {
      setDevices([
        {
          id: '1',
          name: 'Living Room Camera',
          type: 'camera',
          status: 'connected',
          mac_address: '00:11:22:33:44:55',
          battery: 85,
          last_sync: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Smart Feeder',
          type: 'feeder',
          status: 'connected',
          mac_address: '66:77:88:99:AA:BB',
          battery: 92,
          last_sync: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Health Collar',
          type: 'collar',
          status: 'connected',
          mac_address: 'CC:DD:EE:FF:00:11',
          battery: 78,
          last_sync: new Date().toISOString()
        }
      ]);
      setLoading(false);
    }, 1500);
  }, []);

  const startScanning = async () => {
    setError('');
    setScanning(true);
    setShowPairing(true);

    try {
      // 檢查瀏覽器是否支援 Web Bluetooth API
      if (!navigator.bluetooth) {
        throw new Error('您的瀏覽器不支援藍芽功能');
      }

      // 請求藍芽裝置
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['health_thermometer'] },
          { services: ['heart_rate'] },
          { namePrefix: 'PetCam' },
          { namePrefix: 'SmartFeeder' },
          { namePrefix: 'PetCollar' }
        ],
        optionalServices: ['battery_service']
      });

      // 模擬發現新設備
      setFoundDevices([
        {
          id: device.id,
          name: device.name || '未知設備',
          type: device.name?.includes('Cam') ? 'camera' : 
                device.name?.includes('Feeder') ? 'feeder' : 'collar'
        }
      ]);

    } catch (err) {
      console.error('Bluetooth error:', err);
      setError(err instanceof Error ? err.message : '藍芽連接失敗');
    } finally {
      setScanning(false);
    }
  };

  const connectDevice = async (device: BluetoothDevice) => {
    try {
      // 模擬連接過程
      const newDevice: Device = {
        id: device.id,
        name: device.name,
        type: device.type,
        status: 'connected',
        mac_address: 'XX:XX:XX:XX:XX:XX',
        battery: 100,
        last_sync: new Date().toISOString()
      };

      setDevices(prev => [...prev, newDevice]);
      setShowPairing(false);
      setFoundDevices([]);

    } catch (err) {
      console.error('Connection error:', err);
      setError('設備連接失敗');
    }
  };

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'camera':
        return <Camera className="w-6 h-6" />;
      case 'feeder':
        return <img src="/feeder-icon.svg" className="w-6 h-6" alt="Feeder" />;
      case 'collar':
        return <img src="/collar-icon.svg" className="w-6 h-6" alt="Collar" />;
      default:
        return <Wifi className="w-6 h-6" />;
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
                onClick={startScanning}
                disabled={scanning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {scanning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Bluetooth className="w-5 h-5" />
                    搜尋新設備
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">設備管理</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getDeviceIcon(device.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                    <p className="text-sm text-gray-500">
                      {device.type === 'camera' ? '攝影機' : 
                       device.type === 'feeder' ? '智能餵食器' : '健康項圈'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className={`w-5 h-5 ${
                    device.battery && device.battery > 20 ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <span className="text-sm text-gray-600">{device.battery}%</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  狀態：
                  <span className={`font-medium ${
                    device.status === 'connected' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {device.status === 'connected' ? '已連接' : '未連接'}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  MAC 位址：{device.mac_address}
                </p>
                {device.last_sync && (
                  <p className="text-sm text-gray-600">
                    最後同步：{new Date(device.last_sync).toLocaleString('zh-TW')}
                  </p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="text-blue-500 hover:text-blue-600 text-sm font-medium">
                  設備設定
                </button>
              </div>
            </div>
          ))}
        </div>

        {showPairing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">搜尋到的設備</h2>
                <button 
                  onClick={() => {
                    setShowPairing(false);
                    setFoundDevices([]);
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {scanning ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600">正在搜尋附近的設備...</p>
                  </div>
                ) : foundDevices.length > 0 ? (
                  <div className="space-y-2">
                    {foundDevices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => connectDevice(device)}
                        className="w-full text-left p-4 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Bluetooth className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="font-medium">{device.name}</p>
                              <p className="text-sm text-gray-500">
                                {device.type === 'camera' ? '智能寵物攝影機' : 
                                 device.type === 'feeder' ? '智能餵食器' : '健康項圈'}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm text-blue-500">連接</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !error && (
                  <p className="text-center py-8 text-gray-500">
                    尚未發現任何設備
                  </p>
                )}

                <div className="flex justify-end mt-6">
                  <button
                    onClick={startScanning}
                    disabled={scanning}
                    className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {scanning ? '搜尋中...' : '重新搜尋'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}