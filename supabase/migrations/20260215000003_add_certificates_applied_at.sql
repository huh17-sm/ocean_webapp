-- ============================================
-- certificates 테이블 누락 컬럼 추가
-- 파일: 20260215000002_add_certificates_applied_at.sql
-- 설명: certificates 테이블에 applied_at 컬럼이 없으면 추가
-- (원래 마이그레이션 SQL에는 있지만, 실제 DB에 반영 안 됐을 수 있음)
-- ============================================

DO $$
BEGIN
    -- 1. applied_at 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'applied_at') THEN
        ALTER TABLE public.certificates ADD COLUMN applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
        -- 기존 row가 있으면 created_at 값으로 채움
        UPDATE public.certificates SET applied_at = created_at WHERE applied_at IS NULL;
    END IF;

    -- 2. approved_at 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'approved_at') THEN
        ALTER TABLE public.certificates ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- 3. issued_at 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'issued_at') THEN
        ALTER TABLE public.certificates ADD COLUMN issued_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- 4. rejection_reason 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.certificates ADD COLUMN rejection_reason TEXT;
    END IF;

    -- 5. admin_notes 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'admin_notes') THEN
        ALTER TABLE public.certificates ADD COLUMN admin_notes TEXT;
    END IF;

    -- 6. credit_paid 컬럼 확인 및 추가
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'credit_paid') THEN
        ALTER TABLE public.certificates ADD COLUMN credit_paid INTEGER DEFAULT 0;
    END IF;
END $$;

-- 스키마 캐시 갱신 유도
COMMENT ON TABLE public.certificates IS '자격증 발급 관리 (v2)';
