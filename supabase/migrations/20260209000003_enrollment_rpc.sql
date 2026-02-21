-- 수업 인원 증가 RPC (원자적 처리)
-- Race Condition 방지: 동시에 여러 사용자가 예약해도 정확한 인원수 유지
CREATE OR REPLACE FUNCTION increment_enrollment(p_class_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, new_enrollment INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current INTEGER;
    v_max INTEGER;
    v_new_enrollment INTEGER;
BEGIN
    -- 1. 현재 인원과 최대 정원을 FOR UPDATE로 잠금 (다른 트랜잭션이 동시에 수정 못하게)
    SELECT current_enrollment, max_capacity 
    INTO v_current, v_max
    FROM classes
    WHERE id = p_class_id
    FOR UPDATE;  -- 이 행을 잠금 (다른 트랜잭션은 대기)

    -- 2. 정원 초과 체크
    IF v_current >= v_max THEN
        RETURN QUERY SELECT FALSE, '정원이 마감되었습니다.', v_current;
        RETURN;
    END IF;

    -- 3. 인원 증가 (원자적 업데이트)
    UPDATE classes
    SET current_enrollment = current_enrollment + 1
    WHERE id = p_class_id
    RETURNING current_enrollment INTO v_new_enrollment;

    -- 4. 성공 반환
    RETURN QUERY SELECT TRUE, '인원이 증가되었습니다.', v_new_enrollment;
END;
$$;

-- 수업 인원 감소 RPC (원자적 처리)
-- Race Condition 방지: 동시에 여러 사용자가 취소해도 정확한 인원수 유지
CREATE OR REPLACE FUNCTION decrement_enrollment(p_class_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, new_enrollment INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current INTEGER;
    v_new_enrollment INTEGER;
BEGIN
    -- 1. 현재 인원을 FOR UPDATE로 잠금
    SELECT current_enrollment 
    INTO v_current
    FROM classes
    WHERE id = p_class_id
    FOR UPDATE;

    -- 2. 음수 방지 체크
    IF v_current <= 0 THEN
        RETURN QUERY SELECT FALSE, '이미 인원이 0명입니다.', 0;
        RETURN;
    END IF;

    -- 3. 인원 감소 (원자적 업데이트, 최소값 0)
    UPDATE classes
    SET current_enrollment = GREATEST(0, current_enrollment - 1)
    WHERE id = p_class_id
    RETURNING current_enrollment INTO v_new_enrollment;

    -- 4. 성공 반환
    RETURN QUERY SELECT TRUE, '인원이 감소되었습니다.', v_new_enrollment;
END;
$$;

-- 권한 부여 (인증된 사용자만 실행 가능)
GRANT EXECUTE ON FUNCTION increment_enrollment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_enrollment(UUID) TO authenticated;
