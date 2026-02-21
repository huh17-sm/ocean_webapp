alter table public.class_requests drop constraint if exists class_requests_status_check;

alter table public.class_requests add constraint class_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'));
