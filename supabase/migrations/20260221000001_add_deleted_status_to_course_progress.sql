-- 1. 과정 진행 상태 (course_progress) 제약 조건 업데이트
-- 'deleted' 상태 값을 추가로 허용하여 휴지통 기능을 지원합니다.

ALTER TABLE public.course_progress
  DROP CONSTRAINT if exists course_progress_status_check;

ALTER TABLE public.course_progress
  ADD CONSTRAINT course_progress_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'dropped', 'deleted'));
