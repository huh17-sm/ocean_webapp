-- ============================================
-- 과정 등록 신청 및 승인 시스템 마이그레이션
-- 파일: 20260214_course_enrollment_system.sql
-- 목적: course_progress 테이블을 'pending' 상태 지원하도록 확장
--      사용자 신청, 관리자 승인, 자동 크레딧 지급 워크플로우 구현
-- ============================================

-- 1. course_progress 상태 CHECK 제약조건 수정
-- 기존: 'in_progress', 'completed', 'dropped'
-- 신규: 'pending', 'in_progress', 'completed', 'dropped'
ALTER TABLE public.course_progress
  DROP CONSTRAINT if exists course_progress_status_check;

ALTER TABLE public.course_progress
  ADD CONSTRAINT course_progress_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed', 'dropped'));

-- 2. course_id 컬럼 추가 (courses 테이블과 FK 연결)
-- NULL 허용: 기존 레코드 호환성, 또는 INACTIVE 과정일 수 있음
ALTER TABLE public.course_progress
  ADD COLUMN if not exists course_id TEXT REFERENCES public.courses(id) ON DELETE SET NULL;

-- 3. 승인 감사 추적 컬럼
-- approved_by: 승인한 관리자 ID
-- approved_at: 승인 시간
ALTER TABLE public.course_progress
  ADD COLUMN if not exists approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN if not exists approved_at TIMESTAMP WITH TIME ZONE;

-- 4. 신청일 명시 컬럼 (응용일과 시작일 구분)
-- applied_at: 신청 또는 할당 시간
ALTER TABLE public.course_progress
  ADD COLUMN if not exists applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 5. 크레딧 지급 기록
-- credits_granted: 승인 시 지급한 크레딧 수
-- credit_grant_reason: 지급 사유 (예: 'course_enrollment', 'bonus')
ALTER TABLE public.course_progress
  ADD COLUMN if not exists credits_granted INTEGER DEFAULT 0,
  ADD COLUMN if not exists credit_grant_reason TEXT;

-- 6. 인덱스 생성 (쿼리 성능 향상)
-- - status로 pending 신청 필터링
-- - course_id로 과정별 진도 조회
-- - user_status 조합으로 개인 신청 상태 조회
CREATE INDEX if not exists idx_course_progress_status
  ON public.course_progress(status);

CREATE INDEX if not exists idx_course_progress_course_id
  ON public.course_progress(course_id);

CREATE INDEX if not exists idx_course_progress_user_status
  ON public.course_progress(user_id, status);

-- 7. 기존 RLS 정책 유지
-- 주의: course_progress는 이미 RLS가 활성화됨 (20260211_create_v2_tables.sql)
-- 추가 정책: 사용자가 'pending' 상태로 INSERT 가능 (신청)
DROP POLICY if exists "Users can apply for courses" ON public.course_progress;
CREATE POLICY "Users can apply for courses" ON public.course_progress
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND status = 'pending'
  );

-- 참고: 기존 정책들
-- - "Users can view their own progress" (SELECT)
-- - "Instructors and Admins can view all progress" (SELECT)
-- - "Instructors and Admins can manage progress" (UPDATE/DELETE)

-- ============================================
-- 완료
-- ============================================
