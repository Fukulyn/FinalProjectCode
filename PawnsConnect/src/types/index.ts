export interface HealthRecord {
  lastCheckup: string; // Date string (YYYY-MM-DD)
  conditions: string[];
  notes: string;
}

export interface FeedingSchedule {
  foodType: string;
  timesPerDay: number;
  portionSize: string;
  notes: string;
}

export interface VaccinationRecord {
  vaccineName:string;
  dateAdministered: string; // Date string (YYYY-MM-DD)
  nextDueDate?: string; // Date string (YYYY-MM-DD)
}

export interface Dog {
  id: string; // Firestore document ID
  name: string;
  breed: string;
  age: number; // in years
  gender: 'Male' | 'Female' | 'Unknown';
  photos: string[]; // URLs
  description: string;
  healthRecords: HealthRecord; // Stored as a map/object in Firestore
  feedingSchedule: FeedingSchedule; // Stored as a map/object in Firestore
  vaccinationRecords: VaccinationRecord[]; // Stored as an array of maps/objects in Firestore
  liveStreamUrl?: string; // Optional: URL from a service like RTSP.me
  status: 'Available' | 'Pending' | 'Adopted';
  location: string; // e.g., Shelter name or city
  personalityTraits: string[]; // e.g., ['Friendly', 'Playful', 'Calm']
}

export type UserRole = 'adopter' | 'caregiver';

export interface Profile {
  id: string; // Corresponds to Firebase Auth user UID
  role: UserRole;
  fullName?: string | null;
  avatarUrl?: string | null;
  updatedAt?: string | null; // ISO date string from Firestore Timestamp
}
