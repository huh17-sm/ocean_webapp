-- Add participants and user_instructions to class_requests
-- 수업 요청 시 인원수와 상세 요청사항 기록을 위함

ALTER TABLE public.class_requests 
ADD COLUMN IF NOT EXISTS participants INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS user_instructions TEXT;

-- 기존 데이터에 대한 코멘트
COMMENT ON COLUMN public.class_requests.participants IS '수업 신청 인원수 (본인 포함)';
COMMENT ON COLUMN public.class_requests.user_instructions IS '사용자가 작성한 상세 요청사항 및 전달사항';
