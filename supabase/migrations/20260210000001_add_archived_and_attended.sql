-- reservations 테이블에 is_archived 컬럼 추가 및 status에 'attended' 값 허용
-- 1. is_archived: 완료된 예약을 아카이브 처리하기 위한 플래그
-- 2. status에 'attended' 추가: 출석 확인된 예약 상태

-- 1. is_archived 컬럼 추가 (boolean, default false)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 2. 기존 status 체크 제약 조건 삭제 (존재할 수 있는 이름들)
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_status_check;

-- 3. 새로운 status 체크 제약 조건 추가 ('attended' 포함)
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('confirmed', 'cancelled', 'attended'));

-- 4. is_archived 인덱스 추가 (아카이브되지 않은 예약 필터링 성능 향상)
CREATE INDEX IF NOT EXISTS idx_reservations_is_archived
  ON public.reservations(is_archived);
