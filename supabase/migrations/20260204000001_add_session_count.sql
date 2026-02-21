alter table public.courses
add column IF NOT EXISTS session_count integer default 1;
