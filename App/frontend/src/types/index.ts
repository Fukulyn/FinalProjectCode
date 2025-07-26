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
  interface Navigator {
    bluetooth: {
      requestDevice(options: {
        filters: Array<{
          services?: string[];
          name?: string;
          namePrefix?: string;
        }>;
        optionalServices?: string[];
      }): Promise<{
        id: string;
        name?: string;
        gatt?: {
          connect(): Promise<any>;
        };
      }>;
    };
  }
}