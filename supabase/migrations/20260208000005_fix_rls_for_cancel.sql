-- RLS 필드 누락 수정: 사용자가 자신의 예약 및 요청을 취소할 수 있도록 UPDATE 권한 추가

-- 1. reservations 테이블: 사용자가 본인의 예약 상태를 변경(취소)할 수 있도록 허용
DROP POLICY IF EXISTS "Users can update own reservations." ON public.reservations;
CREATE POLICY "Users can update own reservations." ON public.reservations
FOR UPDATE USING (auth.uid() = user_id);

-- 2. class_requests 테이블: 사용자가 본인의 요청 상태를 변경(취소)할 수 있도록 허용
DROP POLICY IF EXISTS "Users can update own class requests." ON public.class_requests;
CREATE POLICY "Users can update own class requests." ON public.class_requests
FOR UPDATE USING (auth.uid() = user_id);
