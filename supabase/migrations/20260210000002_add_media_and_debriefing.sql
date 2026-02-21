-- ============================================
-- classes 테이블에 media_link 컬럼 추가
-- reservations 테이블에 debriefing 관련 컬럼 추가
-- ============================================

-- 1. classes 테이블: 수업 관련 미디어 링크 (영상, 사진 등)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS media_link text;

COMMENT ON COLUMN public.classes.media_link IS '수업 관련 미디어 링크 (영상/사진 URL)';

-- 2. reservations 테이블: 디브리핑 내용
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS debriefing text;

COMMENT ON COLUMN public.reservations.debriefing IS '수업 후 디브리핑 내용';

-- 3. reservations 테이블: 디브리핑 작성 시각
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS debriefing_at timestamp with time zone;

COMMENT ON COLUMN public.reservations.debriefing_at IS '디브리핑 작성 시각';

-- 4. reservations 테이블: 크레딧 비용 (이미 존재할 수 있음 - IF NOT EXISTS로 안전 처리)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS credit_cost integer DEFAULT 0;

COMMENT ON COLUMN public.reservations.credit_cost IS '예약 시 차감된 크레딧 비용';
