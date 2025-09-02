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
  status: 'Available' | 'Pending' | 'Adopted';
  location: string; // e.g., Shelter name or city
  personalityTraits: string[]; // e.g., ['Friendly', 'Playful', 'Calm']
  animalType?: 'dog' | 'cat'; // New field for animal type
}

export interface BreedFilter {
  animalType: 'dog' | 'cat' | 'all';
  selectedBreeds: string[];
}

// Predefined breed lists
export const DOG_BREEDS = [
  '黃金獵犬',
  '拉布拉多',
  '德國牧羊犬',
  '比格犬',
  '柴犬',
  '博美犬',
  '吉娃娃',
  '法國鬥牛犬',
  '邊境牧羊犬',
  '哈士奇'
] as const;

export const CAT_BREEDS = [
  '英國短毛貓',
  '美國短毛貓',
  '波斯貓',
  '暹羅貓',
  '緬因貓',
  '布偶貓',
  '俄羅斯藍貓',
  '蘇格蘭摺耳貓',
  '孟加拉貓',
  '阿比西尼亞貓'
] as const;

export type UserRole = 'adopter' | 'caregiver';

export interface Profile {
  id: string; // Corresponds to Firebase Auth user UID
  role: UserRole;
  fullName?: string | null;
  avatarUrl?: string | null;
  updatedAt?: string | null; // ISO date string from Firestore Timestamp
}
