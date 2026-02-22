-- ============================================
-- certificates 테이블 updated_at 컬럼 누락 수정
-- 파일: 20260220092612_fix_certificates_updated_at.sql
-- 설명: certificates 테이블에 updated_at 컬럼이 없어 UPDATE 시 트리거에서
--      'record "new" has no field "updated_at"' 에러가 발생하는 문제를 해결합니다.
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'certificates'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.certificates
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;
