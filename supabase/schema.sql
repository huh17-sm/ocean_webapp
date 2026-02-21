-- Create profiles table
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text,
  name text,
  role text default 'user' check (role in ('admin', 'user')),
  credits integer default 0,
  phone_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Create classes table
create table public.classes (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  time time not null,
  type text check (type in ('theory', 'pool', 'training')),
  location text,
  max_capacity integer default 4,
  current_enrollment integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.classes enable row level security;

-- Policies for classes
create policy "Classes are viewable by everyone." on public.classes
  for select using (true);

create policy "Only admins can insert classes." on public.classes
  for insert with check (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Only admins can update classes." on public.classes
  for update using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Only admins can delete classes." on public.classes
  for delete using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- Create reservations table
create table public.reservations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  class_id uuid references public.classes(id) not null,
  status text default 'confirmed' check (status in ('confirmed', 'cancelled')),
  feedback_text text,
  media_link_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.reservations enable row level security;

-- Policies for reservations
create policy "Users can view own reservations." on public.reservations
  for select using (auth.uid() = user_id);

create policy "Admins can view all reservations." on public.reservations
  for select using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Users can insert own reservations." on public.reservations
  for insert with check (auth.uid() = user_id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create courses table
create table public.courses (
  id text primary key,
  title text not null,
  level text,
  description text,
  price jsonb,
  duration text,
  certification text,
  curriculum_details text[],
  requirements jsonb,
  features text[],
  icon text,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'INQUIRY_ONLY')),
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.courses enable row level security;

-- Policies for courses
create policy "Courses are viewable by everyone." on public.courses
  for select using (true);

create policy "Only admins can insert courses." on public.courses
  for insert with check (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Only admins can update courses." on public.courses
  for update using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Only admins can delete courses." on public.courses
  for delete using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- Seed data for courses
insert into public.courses (id, title, level, description, price, duration, certification, curriculum_details, requirements, status, sort_order, features, icon)
values
  ('theory', '이론 교육', 'Basic', '프리다이빙 기초 지식과 안전 수칙을 배웁니다. (온라인/오프라인)', '{"standard": 80000}', '2시간', 'None', ARRAY['기초 물리학/생리학', '장비 사용법', '안전 수칙', '교재 제공'], null, 'ACTIVE', 1, ARRAY['기초 물리학/생리학', '장비 사용법', '안전 수칙', '교재 제공'], 'BookOpen'),
  ('pool', '풀장 교육', 'Basic', '잠수풀에서 진행되는 실습 과정입니다. 프렌젤, 덕다이빙 등을 배웁니다.', '{"standard": 100000}', '3시간', 'None', ARRAY['스태틱/다이내믹', '덕다이빙', '프렌젤 이퀄라이징', '레스큐 실습'], null, 'ACTIVE', 2, ARRAY['스태틱/다이내믹', '덕다이빙', '프렌젤 이퀄라이징', '레스큐 실습'], 'Waves'),
  ('training', '트레이닝', 'Training', '자격증 취득 후 꾸준한 기술 연마를 위한 과정입니다.', '{"standard": 80000}', '3시간', 'None', ARRAY['1:1 자세 교정', 'CO2 테이블', '노핀 잠영', '버디 시스템'], null, 'ACTIVE', 3, ARRAY['1:1 자세 교정', 'CO2 테이블', '노핀 잠영', '버디 시스템'], 'Dumbbell'),
  ('exp_01', '체험 다이빙', 'Experience', '프리다이빙 기초 체험', '{"standard": 75000, "weekday": 65000}', '풀장 2시간', 'None', null, null, 'INACTIVE', 10, null, 'Waves'),
  ('lv_01', '입문 과정', 'Level 1', '프리다이빙 입문', '{"standard": 150000}', '1일 (이론 + 풀장 3h)', 'AIDA1 / SSI BASIC', ARRAY['호흡법', '이퀄라이징', '스테틱', '덕다이빙'], null, 'INACTIVE', 11, ARRAY['호흡법', '이퀄라이징', '스테틱', '덕다이빙'], 'BookOpen'),
  ('lv_02', '초급 과정', 'Level 2', '프리다이빙 초급', '{"standard": 400000, "discounted_from_lv1": 350000}', '3일 (이론 + 실습 3회)', 'AIDA2 / SSI FREEDIVER', null, '{"depth": "12m", "static": "2분", "rescue": "5m"}', 'INACTIVE', 12, null, 'Waves'),
  ('lv_03', '중급 과정', 'Level 3', '프리다이빙 중급', '{"standard": 550000}', '4일 (이론 + 실습 4회)', 'AIDA3 / SSI ADVANCED', null, '{"depth": "24m", "static": "2분 45초", "rescue": "10m"}', 'INACTIVE', 13, null, 'Waves'),
  ('lv_04', '고급 과정', 'Level 4', '미개설 (추후 업데이트 예정)', '{"standard": null, "label": "별도 문의"}', null, 'Master Freediver', null, null, 'INQUIRY_ONLY', 14, null, 'Award')
on conflict (id) do nothing;
-- Create class_requests table
create table public.class_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  date date not null,
  time_slot text, -- 'morning', 'afternoon', 'evening' or specific time
  type text check (type in ('theory', 'pool', 'training')),
  location text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.class_requests enable row level security;

-- Policies for class_requests
create policy "Users can view own class requests." on public.class_requests
  for select using (auth.uid() = user_id);

create policy "Admins can view all class requests." on public.class_requests
  for select using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

create policy "Users can insert own class requests." on public.class_requests
  for insert with check (auth.uid() = user_id);

create policy "Admins can update class requests." on public.class_requests
  for update using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- Create class_type_settings table
create table public.class_type_settings (
  type text primary key,
  label text not null,
  credit_cost integer default 1 not null,
  is_active boolean default true not null,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.class_type_settings enable row level security;

-- Policies for class_type_settings
create policy "Anyone can view class type settings" on public.class_type_settings
  for select using (true);

create policy "Only admins can modify class type settings" on public.class_type_settings
  for all using (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- Insert initial class type settings
insert into public.class_type_settings (type, label, credit_cost, sort_order) values
  ('theory', '이론 교육', 0, 1),
  ('pool', '풀장 교육', 1, 2),
  ('training', '트레이닝', 2, 3)
on conflict (type) do nothing;
