import type { Dog } from '@/types';

export const mockDogs: Dog[] = [
  {
    id: '1',
    name: 'Buddy',
    breed: 'Golden Retriever',
    age: 2,
    gender: 'Male',
    photos: ['https://placehold.co/600x400.png', 'https://placehold.co/600x401.png', 'https://placehold.co/600x402.png'],
    description: 'Buddy is a friendly and energetic Golden Retriever looking for a loving home. He loves to play fetch and go for long walks.',
    healthRecords: {
      lastCheckup: '2024-05-01',
      conditions: ['None'],
      notes: 'Healthy and active.',
    },
    feedingSchedule: {
      foodType: 'Dry Kibble - Large Breed Adult',
      timesPerDay: 2,
      portionSize: '2 cups',
      notes: 'Eats well, no known allergies.',
    },
    vaccinationRecords: [
      { vaccineName: 'Rabies', dateAdministered: '2023-06-15', nextDueDate: '2026-06-15' },
      { vaccineName: 'DHPP', dateAdministered: '2023-06-15', nextDueDate: '2024-06-15' },
    ],
    // Example from a service like RTSP.me, which provides an iframe-compatible URL
    liveStreamUrl: 'https://rtsp.me/embed/iFbF7b9f/', 
    status: 'Available',
    location: 'Happy Paws Shelter',
    personalityTraits: ['Friendly', 'Energetic', 'Playful', 'Loyal'],
  },
  {
    id: '2',
    name: 'Lucy',
    breed: 'Labrador Mix',
    age: 3,
    gender: 'Female',
    photos: ['https://placehold.co/600x400.png', 'https://placehold.co/601x400.png'],
    description: 'Lucy is a sweet and gentle Labrador Mix. She is a bit shy at first but warms up quickly. She enjoys cuddles and quiet evenings.',
    healthRecords: {
      lastCheckup: '2024-04-20',
      conditions: ['Slightly underweight on arrival, now healthy'],
      notes: 'Responded well to a high-calorie diet.',
    },
    feedingSchedule: {
      foodType: 'Wet and Dry Mix - Sensitive Stomach',
      timesPerDay: 2,
      portionSize: '1.5 cups dry + 1/2 can wet',
      notes: 'Prefers her food slightly warmed.',
    },
    vaccinationRecords: [
      { vaccineName: 'Rabies', dateAdministered: '2024-01-10' },
      { vaccineName: 'Bordetella', dateAdministered: '2024-01-10' },
    ],
    liveStreamUrl: undefined, // This dog does not have a live stream
    status: 'Available',
    location: "Hope Animal Rescue",
    personalityTraits: ['Gentle', 'Sweet', 'Shy', 'Affectionate'],
  },
  {
    id: '3',
    name: 'Max',
    breed: 'German Shepherd',
    age: 4,
    gender: 'Male',
    photos: ['https://placehold.co/600x400.png'],
    description: 'Max is a loyal and intelligent German Shepherd. He is well-trained and would thrive in an active household with experienced owners.',
    healthRecords: {
      lastCheckup: '2024-05-10',
      conditions: ['None'],
      notes: 'Excellent physical condition.',
    },
    feedingSchedule: {
      foodType: 'Raw Diet (BARF)',
      timesPerDay: 1,
      portionSize: '1kg',
      notes: 'Has been on a raw diet since puppyhood.',
    },
    vaccinationRecords: [
      { vaccineName: 'Rabies', dateAdministered: '2022-08-01', nextDueDate: '2025-08-01' },
      { vaccineName: 'Leptospirosis', dateAdministered: '2024-03-01' },
    ],
    liveStreamUrl: 'https://rtsp.me/embed/iFbF7b9f/', // Using the same example URL for demonstration
    status: 'Available',
    location: 'City Pound',
    personalityTraits: ['Loyal', 'Intelligent', 'Protective', 'Active'],
  },
   {
    id: '4',
    name: 'Bella',
    breed: 'Beagle',
    age: 1,
    gender: 'Female',
    photos: ['https://placehold.co/600x400.png', 'https://placehold.co/600x403.png'],
    description: 'Bella is a curious and playful Beagle puppy. She loves exploring and sniffing everything! She is looking for a family that can keep up with her energy.',
    healthRecords: {
      lastCheckup: '2024-06-01',
      conditions: ['None'],
      notes: 'Typical puppy checkup, all good.',
    },
    feedingSchedule: {
      foodType: 'Puppy Kibble - Small Breed',
      timesPerDay: 3,
      portionSize: '1 cup',
      notes: 'Very food motivated, good for training.',
    },
    vaccinationRecords: [
      { vaccineName: 'DHPP (Puppy Series 1)', dateAdministered: '2024-04-15' },
      { vaccineName: 'DHPP (Puppy Series 2)', dateAdministered: '2024-05-15' },
      { vaccineName: 'DHPP (Puppy Series 3)', dateAdministered: '2024-06-15' },
    ],
    status: 'Available',
    location: 'Sunshine Animal Shelter',
    personalityTraits: ['Curious', 'Playful', 'Energetic', 'Friendly'],
  },
];
