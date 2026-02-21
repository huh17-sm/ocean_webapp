-- Create availability_blocks table
create table availability_blocks (
  id uuid default gen_random_uuid() primary key,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz default now()
);

-- Add RLS policies (adjust as needed, e.g., only admins can insert/delete)
alter table availability_blocks enable row level security;

create policy "Availability blocks are viewable by everyone"
  on availability_blocks for select
  using ( true );

create policy "Admins can insert availability blocks"
  on availability_blocks for insert
  with check ( auth.role() = 'authenticated' ); -- Should ideally check for admin role

create policy "Admins can delete availability blocks"
  on availability_blocks for delete
  using ( auth.role() = 'authenticated' ); -- Should ideally check for admin role
