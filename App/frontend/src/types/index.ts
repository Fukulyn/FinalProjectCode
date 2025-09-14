export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  type: string;
  breed: string;
  birth_date: string;
  weight: number;
  created_at: string;
  photos?: string[];
  location?: string;
}

export interface PetData {
  name: string;
  type: string;
  breed: string;
  birth_date: string;
  weight?: number;
  location?: string;
  photos?: string[];
}

export interface HealthRecord {
  id: string;
  pet_id: string;
  temperature: number;
  heart_rate: number;
  oxygen_level: number;
  recorded_at: string;
}

export interface FeedingRecord {
  id: string;
  pet_id: string;
  food_type: string;
  amount: number;
  calories: number;
  fed_at: string;
  laser_distance?: number; // 飼料剩餘量
  weight?: number; // 廚餘重量
}

export interface VaccineRecord {
  id: string;
  pet_id: string;
  vaccine_name: string;
  date: string;
  next_due_date: string;
  pets?: { name: string };
}

export interface Device {
  id: string;
  name: string;
  type: 'camera' | 'feeder' | 'collar';
  status: 'connected' | 'disconnected';
  battery?: number;
  last_sync?: string;
  mac_address: string;
}

export interface VideoStream {
  id: string;
  device_id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive';
  resolution: string;
  created_at: string;
}

// Add Bluetooth types
declare global {
  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
    getPrimaryServices(service?: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService[]>;
  }

  interface BluetoothDevice {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }

  interface BluetoothRemoteGATTService {
    device: BluetoothDevice;
    uuid: string;
    isPrimary: boolean;
    getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
    getCharacteristics(characteristic?: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    service: BluetoothRemoteGATTService;
    uuid: string;
    properties: BluetoothCharacteristicProperties;
    value?: DataView;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }

  interface BluetoothCharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
  }

  type BluetoothServiceUUID = number | string;
  type BluetoothCharacteristicUUID = number | string;

  interface Navigator {
    bluetooth: {
      requestDevice(options: {
        filters: Array<{
          services?: string[];
          name?: string;
          namePrefix?: string;
        }>;
        optionalServices?: string[];
      }): Promise<BluetoothDevice>;
    };
  }
}