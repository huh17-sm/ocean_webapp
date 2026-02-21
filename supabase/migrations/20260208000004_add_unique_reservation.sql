-- Create a unique constraint to prevent duplicate reservations
-- 한 유저가 같은 수업을 중복해서 예약하지 못하도록 방지

-- 1. 중복된 데이터가 있는지 확인하고 정리 (이미 중복이 있다면 제약조건 생성 시 에러가 남)
-- (만약 이미 중복 데이터가 있다면 수동으로 정리해야 할 수 있음)

-- 2. 유저ID와 수업ID 조합에 유니크 제약조건 추가
ALTER TABLE public.reservations 
DROP CONSTRAINT IF EXISTS unique_user_class_reservation;

ALTER TABLE public.reservations 
ADD CONSTRAINT unique_user_class_reservation UNIQUE (user_id, class_id);

-- 취소된 예약은 제외하고 체크하고 싶다면 부분 인덱스를 사용할 수 있으나, 
-- 현재 status가 confirmed/cancelled 두 가지만 있으므로 
-- '취소 후 재예약' 케이스를 고려해야 할지 결정 필요.
-- 일단 단순 유니크 제약조건을 추가하여 완전 차단.
