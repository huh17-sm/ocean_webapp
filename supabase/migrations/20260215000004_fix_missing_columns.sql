-- ============================================
-- 누락 컬럼 추가 (skill_completions.updated_at, course_progress.completed_at)
-- 파일: 20260215000004_fix_missing_columns.sql
-- 설명:
--   1) skill_completions 테이블에 updated_at 컬럼이 없어서 트리거 에러 발생
--   2) course_progress 테이블에 completed_at 컬럼이 스키마 캐시에 없음
-- ============================================

-- 1. skill_completions.updated_at 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'skill_completions'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.skill_completions
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 2. skill_completions.created_at 컬럼 추가 (혹시 없을 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'skill_completions'
          AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.skill_completions
            ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 3. course_progress.completed_at 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'course_progress'
          AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.course_progress
            ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 4. course_progress.updated_at 컬럼 추가 (혹시 없을 경우)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'course_progress'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.course_progress
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- 5. 트리거 재생성 (안전을 위해)
DROP TRIGGER IF EXISTS update_skill_completions_updated_at ON public.skill_completions;
CREATE TRIGGER update_skill_completions_updated_at
    BEFORE UPDATE ON public.skill_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_progress_updated_at ON public.course_progress;
CREATE TRIGGER update_course_progress_updated_at
    BEFORE UPDATE ON public.course_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 스키마 캐시 갱신 유도
NOTIFY pgrst, 'reload schema';
