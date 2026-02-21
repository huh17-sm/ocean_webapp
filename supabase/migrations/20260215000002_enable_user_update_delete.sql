-- ============================================
-- course_progress 사용자 권한 추가 (재신청 및 취소 지원)
-- 파일: 20260215000002_enable_user_update_delete.sql
-- 설명: 사용자가 재신청(UPDATE) 및 취소(DELETE)를 할 수 있도록 RLS 정책 추가
-- ============================================

-- 1. UPDATE 정책: 본인의 행은 수정 가능
-- (재신청 시 dropped -> pending 상태 변경 필요)
DROP POLICY IF EXISTS "Users can update their own progress" ON public.course_progress;
CREATE POLICY "Users can update their own progress" ON public.course_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- 2. DELETE 정책: 본인의 행은 삭제 가능
-- (신청 취소 시 pending 상태 삭제 필요)
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.course_progress;
CREATE POLICY "Users can delete their own progress" ON public.course_progress
    FOR DELETE USING (auth.uid() = user_id);
