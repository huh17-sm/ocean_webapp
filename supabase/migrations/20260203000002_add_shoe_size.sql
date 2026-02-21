-- Add shoe_size column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS shoe_size TEXT;
