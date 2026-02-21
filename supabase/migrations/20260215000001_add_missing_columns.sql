-- ============================================
-- course_progress 테이블 누락 컬럼 추가
-- 파일: 20260215000001_add_missing_columns.sql
-- 설명: PGRST204 에러(Schema Cache Miss) 해결을 위해 notes, started_at 컬럼이 없으면 추가함
-- ============================================

DO $$
BEGIN
    -- 1. notes 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_progress' AND column_name = 'notes') THEN
        ALTER TABLE public.course_progress ADD COLUMN notes TEXT;
    END IF;

    -- 2. started_at 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_progress' AND column_name = 'started_at') THEN
        ALTER TABLE public.course_progress ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- 스키마 캐시 갱신을 유도하기 위해 주석 추가 (옵션)
COMMENT ON COLUMN public.course_progress.notes IS '관리자 거부 사유 또는 메모';
COMMENT ON COLUMN public.course_progress.started_at IS '과정 시작 일시';
