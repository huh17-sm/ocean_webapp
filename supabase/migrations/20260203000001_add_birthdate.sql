-- Add birthdate column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birthdate date;

comment on column public.profiles.birthdate is 'User birthdate for member management';
