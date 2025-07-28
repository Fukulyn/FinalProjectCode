
// This file is updated based on the provided SQL schema.
// It reflects the database structure for PawsConnect and the related fostering app.
// It is recommended to run `npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts`
// periodically to keep it in sync with the actual database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      pets: {
        Row: {
          id: string // uuid, primary key
          user_id: string // uuid, FK to auth.users.id
          name: string // text
          birth_date: string | null // date
          weight: number | null // numeric
          created_at: string // timestamptz
          photos: string[] | null // ARRAY
          breed: string | null // text
          description: string | null // text
          location: string | null // text
          personality_traits: string[] | null // ARRAY
          live_stream_url: string | null // text
        }
        Insert: {
          id?: string // uuid
          user_id: string // uuid
          name: string
          birth_date?: string | null
          weight?: number | null
          created_at?: string
          photos?: string[] | null
          breed?: string | null
          description?: string | null
          location?: string | null
          personality_traits?: string[] | null
          live_stream_url?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          birth_date?: string | null
          weight?: number | null
          created_at?: string
          photos?: string[] | null
          breed?: string | null
          description?: string | null
          location?: string | null
          personality_traits?: string[] | null
          live_stream_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      health_records: {
        Row: {
          id: string // uuid, primary key
          pet_id: string // uuid, FK to pets.id
          temperature: number | null // numeric
          heart_rate: number | null // integer
          oxygen_level: number | null // numeric
          recorded_at: string // timestamptz
          power: number | null // numeric
          steps_value: number | null // numeric
          condition_description: string | null // text
        }
        Insert: {
          id?: string
          pet_id: string
          temperature?: number | null
          heart_rate?: number | null
          oxygen_level?: number | null
          recorded_at?: string
          power?: number | null
          steps_value?: number | null
          condition_description?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          temperature?: number | null
          heart_rate?: number | null
          oxygen_level?: number | null
          recorded_at?: string
          power?: number | null
          steps_value?: number | null
          condition_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_pet_id_fkey"
            columns: ["pet_id"]
            referencedRelation: "pets"
            referencedColumns: ["id"]
          }
        ]
      }
      feeding_records: {
        Row: {
          id: string; // uuid
          pet_id: string; // uuid
          food_type: string; // text
          amount: number; // numeric
          calories: number; // real
          fed_at: string; // timestamp with time zone
          weight: number | null; // numeric
          laser_distance: number | null; // numeric
          power: number | null; // numeric
        };
        Insert: {
          id?: string;
          pet_id: string;
          food_type: string;
          amount: number;
          calories: number;
          fed_at?: string;
          weight?: number | null;
          laser_distance?: number | null;
          power?: number | null;
        };
        Update: {
          id?: string;
          pet_id?: string;
          food_type?: string;
          amount?: number;
          calories?: number;
          fed_at?: string;
          weight?: number | null;
          laser_distance?: number | null;
          power?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "feeding_records_pet_id_fkey"
            columns: ["pet_id"]
            referencedRelation: "pets"
            referencedColumns: ["id"]
          }
        ]
      }
      vaccine_records: {
        Row: {
          id: string // uuid
          pet_id: string // uuid
          vaccine_name: string // text
          date: string // date
          next_due_date: string | null // date
        }
        Insert: {
          id?: string
          pet_id: string
          vaccine_name: string
          date: string
          next_due_date?: string | null
        }
        Update: {
          id?: string
          pet_id?: string
          vaccine_name?: string
          date?: string
          next_due_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_records_pet_id_fkey"
            columns: ["pet_id"]
            referencedRelation: "pets"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string // uuid, primary key, FK to auth.users.id
          updated_at: string | null // timestamptz
          full_name: string | null // text
          avatar_url: string | null // text
          role: Database["public"]["Enums"]["user_role_enum"] // type user_role_enum
        }
        Insert: {
          id: string // uuid
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role: Database["public"]["Enums"]["user_role_enum"]
        }
        Update: {
          id?: string
          updated_at?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users" // Supabase specific table for auth users
            referencedColumns: ["id"]
          }
        ]
      }
      user_dog_likes: {
        Row: {
          user_id: string // uuid, FK to auth.users.id
          dog_id: string // uuid, FK to pets.id
          liked_at: string // timestamptz
        }
        Insert: {
          user_id: string
          dog_id: string
          liked_at?: string
        }
        Update: {
          user_id?: string
          dog_id?: string
          liked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dog_likes_dog_id_fkey"
            columns: ["dog_id"]
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dog_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      dogs_for_adoption_view: {
        Row: {
          id: string; // uuid from pets.id
          name: string; // text from pets.name
          breed: string | null; // text from pets.breed
          age: number | null; // integer, calculated from pets.birth_date
          gender: Database["public"]["Enums"]["gender_enum"] | null;
          photos: string[] | null; // ARRAY from pets.photos
          description: string | null; // text from pets.description
          location: string | null; // text from pets.location
          personality_traits: string[] | null; // ARRAY from pets.personality_traits
          live_stream_url: string | null; // text from pets.live_stream_url
          status: Database["public"]["Enums"]["dog_status_enum"] | null;
          // The JSON aggregates need to be defined in the view's SQL definition
          health_records: Json | null;
          feeding_schedule: Json | null;
          vaccination_records: Json | null;
        }
      }
    }
    Functions: {
      delete_user_account: {
        Args: {}
        Returns: undefined
      }
    }
    Enums: {
      gender_enum: "Male" | "Female" | "Unknown"
      dog_status_enum: "Available" | "Pending" | "Adopted"
      user_role_enum: "adopter" | "caregiver"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
