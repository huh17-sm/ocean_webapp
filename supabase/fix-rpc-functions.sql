-- ============================================
-- RPC 함수 수정: 컬럼명 불일치 해결 (credits -> general_credits)
-- ============================================

-- 1. 크레딧 차감 함수 수정
create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_related_entity_id uuid default null,
  p_related_entity_type text default null,
  p_memo text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
begin
  -- 현재 잔액 조회 (general_credits 컬럼 사용)
  select general_credits into v_current_balance
  from public.profiles
  where id = p_user_id
  for update;

  -- 유저가 없을 경우 처리
  if v_current_balance is null then
    return jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', '사용자를 찾을 수 없습니다.'
    );
  end if;

  -- 잔액 부족 체크
  if v_current_balance < p_amount then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'message', '크레딧이 부족합니다.',
      'current_balance', v_current_balance,
      'required_amount', p_amount
    );
  end if;

  -- 크레딧 차감 (general_credits 컬럼 업데이트)
  v_new_balance := v_current_balance - p_amount;
  
  update public.profiles
  set general_credits = v_new_balance
  where id = p_user_id;

  -- 거래 내역 기록
  insert into public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reason,
    related_entity_id,
    related_entity_type,
    memo
  ) values (
    p_user_id,
    'deduct',
    -p_amount,
    v_current_balance,
    v_new_balance,
    p_reason,
    p_related_entity_id,
    p_related_entity_type,
    p_memo
  )
  returning id into v_transaction_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'amount_deducted', p_amount
  );
end;
$$;

-- 2. 크레딧 추가 함수 수정
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_related_entity_id uuid default null,
  p_related_entity_type text default null,
  p_memo text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
begin
  -- 현재 잔액 조회 (general_credits 컬럼 사용)
  select general_credits into v_current_balance
  from public.profiles
  where id = p_user_id
  for update;

  -- 유저가 없을 경우 처리
  if v_current_balance is null then
    return jsonb_build_object(
      'success', false,
      'error', 'user_not_found',
      'message', '사용자를 찾을 수 없습니다.'
    );
  end if;

  -- 크레딧 추가 (general_credits 컬럼 업데이트)
  v_new_balance := v_current_balance + p_amount;
  
  update public.profiles
  set general_credits = v_new_balance
  where id = p_user_id;

  -- 거래 내역 기록
  insert into public.credit_transactions (
    user_id,
    transaction_type,
    amount,
    balance_before,
    balance_after,
    reason,
    related_entity_id,
    related_entity_type,
    memo
  ) values (
    p_user_id,
    'purchase',
    p_amount,
    v_current_balance,
    v_new_balance,
    p_reason,
    p_related_entity_id,
    p_related_entity_type,
    p_memo
  )
  returning id into v_transaction_id;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'amount_added', p_amount
  );
end;
$$;
