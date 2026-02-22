-- fix previous pending migrations issue
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS class_type_id TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS credits INTEGER;
