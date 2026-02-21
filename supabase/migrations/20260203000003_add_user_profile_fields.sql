-- Add new fields to profiles table for Member Management
-- Note: 'remaining_sessions' is mapped to existing 'credits' column.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_progress text,
-- credits column exists and represents remaining sessions
ADD COLUMN IF NOT EXISTS credits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS mileage integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS equalization text,
ADD COLUMN IF NOT EXISTS pb_cwt numeric,
ADD COLUMN IF NOT EXISTS pb_sta text,
ADD COLUMN IF NOT EXISTS pb_dyn numeric,
ADD COLUMN IF NOT EXISTS equipment text,
ADD COLUMN IF NOT EXISTS cert_status text,
ADD COLUMN IF NOT EXISTS expiry_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS health_memo text;

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.current_progress IS '현재 진행 중인 교육 (예: Level 1)';
COMMENT ON COLUMN public.profiles.credits IS '잔여 세션 횟수 (기존 credits 컬럼 사용)';
COMMENT ON COLUMN public.profiles.mileage IS '보유 마일리지 (포인트)';
COMMENT ON COLUMN public.profiles.equalization IS '이퀄라이징 방식 (발살바, 프렌젤, 마우스필 등)';
COMMENT ON COLUMN public.profiles.equipment IS '장비 보유 현황';
COMMENT ON COLUMN public.profiles.cert_status IS '자격증 상태 (미발급, 서류대기, 발급완료)';
