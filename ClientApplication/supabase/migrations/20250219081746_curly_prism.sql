/*
  # Initial Schema Setup for Pet Health Management System

  1. New Tables
    - `pets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text)
      - `type` (text)
      - `breed` (text)
      - `birth_date` (date)
      - `weight` (decimal)
      - `created_at` (timestamptz)

    - `health_records`
      - `id` (uuid, primary key)
      - `pet_id` (uuid, foreign key to pets)
      - `temperature` (decimal)
      - `heart_rate` (integer)
      - `oxygen_level` (decimal)
      - `recorded_at` (timestamptz)

    - `feeding_records`
      - `id` (uuid, primary key)
      - `pet_id` (uuid, foreign key to pets)
      - `food_type` (text)
      - `amount` (decimal)
      - `calories` (integer)
      - `fed_at` (timestamptz)

    - `vaccine_records`
      - `id` (uuid, primary key)
      - `pet_id` (uuid, foreign key to pets)
      - `vaccine_name` (text)
      - `date` (date)
      - `next_due_date` (date)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own pets and related records
*/

-- Create pets table
CREATE TABLE IF NOT EXISTS pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  breed text,
  birth_date date,
  weight decimal(5,2),
  created_at timestamptz DEFAULT now()
);

-- Create health records table
CREATE TABLE IF NOT EXISTS health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets ON DELETE CASCADE NOT NULL,
  temperature decimal(4,1),
  heart_rate integer,
  oxygen_level decimal(4,1),
  recorded_at timestamptz DEFAULT now()
);

-- Create feeding records table
CREATE TABLE IF NOT EXISTS feeding_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets ON DELETE CASCADE NOT NULL,
  food_type text NOT NULL,
  amount decimal(5,2) NOT NULL,
  calories integer NOT NULL,
  fed_at timestamptz DEFAULT now()
);

-- Create vaccine records table
CREATE TABLE IF NOT EXISTS vaccine_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES pets ON DELETE CASCADE NOT NULL,
  vaccine_name text NOT NULL,
  date date NOT NULL,
  next_due_date date NOT NULL
);

-- Enable Row Level Security
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeding_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccine_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own pets"
  ON pets
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage health records for their pets"
  ON health_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = health_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage feeding records for their pets"
  ON feeding_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = feeding_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage vaccine records for their pets"
  ON vaccine_records
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM pets
      WHERE pets.id = vaccine_records.pet_id
      AND pets.user_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_health_records_pet_id ON health_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_feeding_records_pet_id ON feeding_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_pet_id ON vaccine_records(pet_id);