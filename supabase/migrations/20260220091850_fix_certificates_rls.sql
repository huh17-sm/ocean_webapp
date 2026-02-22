-- ============================================
-- certificates 테이블 관리자 RLS 정책 수정
-- 파일: 20260220091850_fix_certificates_rls.sql
-- 설명: 관리자가 자격증 상태(status) 변경 및 발급을 수행할 때 RLS에 막히지 않도록
--      UPDATE, DELETE, INSERT 권한을 명확히 보장하는 정책으로 교체합니다.
-- ============================================

-- 1. 기존의 포괄적인 관리자 정책 삭제
DROP POLICY IF EXISTS "Instructors and Admins can manage certificates" ON public.certificates;

-- 2. 안전한 함수(is_admin) 기반의 SELECT 정책 추가 (강사/관리자 모두 가능하도록 포괄적으로 재정의)
DROP POLICY IF EXISTS "Instructors and Admins can view all certificates" ON public.certificates;
CREATE POLICY "Instructors and Admins can view all certificates" ON public.certificates
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
    );

-- 3. 관리자(Admin) 전용 UPDATE, INSERT, DELETE 정책 명확화
--    (is_admin() 함수는 이전 마이그레이션 파일에서 SECURITY DEFINER 로 생성됨)

CREATE POLICY "Admins can insert any certificate" ON public.certificates
    FOR INSERT WITH CHECK ( is_admin() );

CREATE POLICY "Admins can update any certificate" ON public.certificates
    FOR UPDATE USING ( is_admin() );

CREATE POLICY "Admins can delete any certificate" ON public.certificates
    FOR DELETE USING ( is_admin() );
