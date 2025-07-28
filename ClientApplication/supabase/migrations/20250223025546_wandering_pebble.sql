/*
  # Add reminder tables

  1. New Tables
    - `reminders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `pet_id` (uuid, references pets)
      - `type` (text) - 提醒類型 (feeding, medicine, cleaning, vaccine)
      - `title` (text) - 提醒標題
      - `description` (text) - 提醒描述
      - `scheduled_time` (time) - 排程時間
      - `repeat_days` (integer[]) - 重複的星期幾 (1-7)
      - `active` (boolean) - 是否啟用
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `reminder_logs`
      - `id` (uuid, primary key)
      - `reminder_id` (uuid, references reminders)
      - `executed_at` (timestamptz)
      - `status` (text) - 執行狀態 (pending, completed, missed)
      - `notes` (text)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  pet_id uuid REFERENCES pets NOT NULL,
  type text NOT NULL CHECK (type IN ('feeding', 'medicine', 'cleaning', 'vaccine')),
  title text NOT NULL,
  description text,
  scheduled_time time NOT NULL,
  repeat_days integer[] NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reminder_logs table
CREATE TABLE IF NOT EXISTS reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid REFERENCES reminders ON DELETE CASCADE NOT NULL,
  executed_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'missed')),
  notes text
);

-- Enable Row Level Security
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for reminders
CREATE POLICY "Users can manage their own reminders"
  ON reminders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for reminder_logs
CREATE POLICY "Users can manage logs for their reminders"
  ON reminder_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reminders
      WHERE reminders.id = reminder_logs.reminder_id
      AND reminders.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pet_id ON reminders(pet_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id ON reminder_logs(reminder_id);