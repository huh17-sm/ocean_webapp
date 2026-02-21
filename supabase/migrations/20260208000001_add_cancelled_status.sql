-- Add 'cancelled' status to class_requests
-- 수업이 관리자에 의해 취소되었을 때 사용

alter table public.class_requests 
drop constraint if exists class_requests_status_check;

alter table public.class_requests
add constraint class_requests_status_check 
check (status in ('pending', 'approved', 'rejected', 'cancelled'));
