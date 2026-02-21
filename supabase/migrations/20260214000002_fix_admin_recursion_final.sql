-- ============================================
-- RLS 재귀 문제 최종 수정
-- 파일: 20260214000002_fix_admin_recursion_final.sql
-- 설명: 20260203000007_fix_select_rls.sql에서 재귀적인 정책이 다시 적용된 문제를 해결합니다.
--      is_admin() 함수(SECURITY DEFINER)를 사용하여 무한 루프를 방지합니다.
-- ============================================

-- 1. is_admin() 함수 확인 및 재생성 (안전을 위해)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 문제가 되는 재귀적 정책 삭제
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- 3. 안전한 함수 기반 정책으로 재생성
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING ( is_admin() );

-- 4. 업데이트 정책도 안전한지 확인 (기존 000006에 있었으나 명시적으로 확인)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE
  USING ( is_admin() );

DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE
  USING ( is_admin() );
