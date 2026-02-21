-- ============================================
-- 크레딧 시스템 데이터베이스 스키마
-- ============================================

-- 1. profiles 테이블에 balance 컬럼 추가 (이미 credits가 있지만 balance로 명확히)
-- 기존 credits 컬럼을 balance로 사용 (이미 존재하므로 변경 불필요)

-- 2. 크레딧 거래 내역 테이블 (credit_transactions)
-- 모든 크레딧 입출금 내역을 기록
create table if not exists public.credit_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- 거래 타입: 'purchase' (구매), 'deduct' (차감), 'refund' (환불), 'bonus' (보너스)
  transaction_type text not null check (transaction_type in ('purchase', 'deduct', 'refund', 'bonus')),
  
  -- 크레딧 변동량 (양수: 증가, 음수: 감소)
  amount integer not null,
  
  -- 거래 전 잔액
  balance_before integer not null,
  
  -- 거래 후 잔액
  balance_after integer not null,
  
  -- 거래 사유 (예: 'package_purchase', 'lesson_booking', 'training_attendance', 'refund_cancellation')
  reason text not null,
  
  -- 연관 엔티티 ID (예: 예약 ID, 패키지 ID 등)
  related_entity_id uuid,
  
  -- 연관 엔티티 타입 (예: 'reservation', 'package', 'certification')
  related_entity_type text,
  
  -- 메모 (관리자 메모 또는 추가 설명)
  memo text,
  
  -- 생성 시각
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.credit_transactions enable row level security;

-- RLS 정책: 사용자는 자신의 거래 내역만 조회 가능
DROP POLICY IF EXISTS "Users can view own credit transactions" ON public.credit_transactions;
create policy "Users can view own credit transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);

-- RLS 정책: 관리자는 모든 거래 내역 조회 가능
DROP POLICY IF EXISTS "Admins can view all credit transactions" ON public.credit_transactions;
create policy "Admins can view all credit transactions" on public.credit_transactions
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS 정책: 시스템만 거래 내역 생성 가능 (서버 액션에서만)
DROP POLICY IF EXISTS "Only system can insert credit transactions" ON public.credit_transactions;
create policy "Only system can insert credit transactions" on public.credit_transactions
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 인덱스 생성 (조회 성능 향상)
create index if not exists idx_credit_transactions_user_id on public.credit_transactions(user_id);
create index if not exists idx_credit_transactions_created_at on public.credit_transactions(created_at desc);

-- ============================================
-- 3. 자격증 발급 신청 테이블 (certification_requests)
-- ============================================
create table if not exists public.certification_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- 자격증 타입: 'AIDA1', 'AIDA2', 'AIDA2_POOL', 'AIDA3'
  certification_type text not null check (certification_type in ('AIDA1', 'AIDA2', 'AIDA2_POOL', 'AIDA3')),
  
  -- 차감된 크레딧
  credit_cost integer not null,
  
  -- 신청 상태: 'pending' (대기), 'approved' (승인), 'rejected' (거부)
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  
  -- 신청자: 'user' (교육생), 'instructor' (강사)
  requested_by text not null check (requested_by in ('user', 'instructor')),
  
  -- 신청 시각
  requested_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- 처리 시각
  processed_at timestamp with time zone,
  
  -- 처리자 (관리자 ID)
  processed_by uuid references public.profiles(id),
  
  -- 관리자 메모
  admin_memo text,
  
  -- 생성 시각
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.certification_requests enable row level security;

-- RLS 정책: 사용자는 자신의 신청 내역만 조회 가능
DROP POLICY IF EXISTS "Users can view own certification requests" ON public.certification_requests;
create policy "Users can view own certification requests" on public.certification_requests
  for select using (auth.uid() = user_id);

-- RLS 정책: 관리자는 모든 신청 내역 조회 가능
DROP POLICY IF EXISTS "Admins can view all certification requests" ON public.certification_requests;
create policy "Admins can view all certification requests" on public.certification_requests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS 정책: 사용자는 자신의 신청만 생성 가능
DROP POLICY IF EXISTS "Users can insert own certification requests" ON public.certification_requests;
create policy "Users can insert own certification requests" on public.certification_requests
  for insert with check (auth.uid() = user_id);

-- RLS 정책: 관리자는 모든 신청 생성 가능 (강사 직접 발급)
DROP POLICY IF EXISTS "Admins can insert certification requests" ON public.certification_requests;
create policy "Admins can insert certification requests" on public.certification_requests
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS 정책: 관리자는 신청 상태 업데이트 가능
DROP POLICY IF EXISTS "Admins can update certification requests" ON public.certification_requests;
create policy "Admins can update certification requests" on public.certification_requests
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 인덱스 생성
create index if not exists idx_certification_requests_user_id on public.certification_requests(user_id);
create index if not exists idx_certification_requests_status on public.certification_requests(status);

-- ============================================
-- 4. 정기 트레이닝 출석 기록 테이블 (attendance_logs)
-- ============================================
create table if not exists public.attendance_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- 출석 날짜
  attendance_date date not null,
  
  -- 트레이닝 타입 (예: 'regular_training')
  training_type text default 'regular_training',
  
  -- 보너스 크레딧 지급 여부
  bonus_credited boolean default false,
  
  -- 지급된 보너스 크레딧
  bonus_amount integer default 0,
  
  -- 관리자 메모
  admin_memo text,
  
  -- 기록자 (관리자 ID)
  recorded_by uuid references public.profiles(id),
  
  -- 생성 시각
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.attendance_logs enable row level security;

-- RLS 정책: 사용자는 자신의 출석 기록만 조회 가능
DROP POLICY IF EXISTS "Users can view own attendance logs" ON public.attendance_logs;
create policy "Users can view own attendance logs" on public.attendance_logs
  for select using (auth.uid() = user_id);

-- RLS 정책: 관리자는 모든 출석 기록 조회 가능
DROP POLICY IF EXISTS "Admins can view all attendance logs" ON public.attendance_logs;
create policy "Admins can view all attendance logs" on public.attendance_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS 정책: 관리자만 출석 기록 생성 가능
DROP POLICY IF EXISTS "Only admins can insert attendance logs" ON public.attendance_logs;
create policy "Only admins can insert attendance logs" on public.attendance_logs
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 인덱스 생성
create index if not exists idx_attendance_logs_user_id on public.attendance_logs(user_id);
create index if not exists idx_attendance_logs_date on public.attendance_logs(attendance_date desc);

-- 중복 출석 방지 (같은 날 같은 사용자 1회만)
create unique index if not exists idx_attendance_logs_unique_user_date 
  on public.attendance_logs(user_id, attendance_date);

-- ============================================
-- 5. 패키지 구매 내역 테이블 (package_purchases)
-- ============================================
create table if not exists public.package_purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  
  -- 패키지 타입: 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'
  package_type text not null check (package_type in ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  
  -- 결제 금액 (원)
  price integer not null,
  
  -- 지급된 크레딧
  credits_granted integer not null,
  
  -- 결제 상태: 'completed' (완료), 'pending' (대기), 'cancelled' (취소)
  payment_status text default 'completed' check (payment_status in ('completed', 'pending', 'cancelled')),
  
  -- 결제 방법 (예: 'card', 'transfer', 'cash')
  payment_method text,
  
  -- 결제 ID (외부 결제 시스템 ID)
  payment_id text,
  
  -- 관리자 메모
  admin_memo text,
  
  -- 생성 시각
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.package_purchases enable row level security;

-- RLS 정책: 사용자는 자신의 구매 내역만 조회 가능
DROP POLICY IF EXISTS "Users can view own package purchases" ON public.package_purchases;
create policy "Users can view own package purchases" on public.package_purchases
  for select using (auth.uid() = user_id);

-- RLS 정책: 관리자는 모든 구매 내역 조회 가능
DROP POLICY IF EXISTS "Admins can view all package purchases" ON public.package_purchases;
create policy "Admins can view all package purchases" on public.package_purchases
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS 정책: 관리자만 구매 내역 생성 가능
DROP POLICY IF EXISTS "Only admins can insert package purchases" ON public.package_purchases;
create policy "Only admins can insert package purchases" on public.package_purchases
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 인덱스 생성
create index if not exists idx_package_purchases_user_id on public.package_purchases(user_id);
create index if not exists idx_package_purchases_created_at on public.package_purchases(created_at desc);

-- ============================================
-- 6. reservations 테이블에 크레딧 관련 컬럼 추가
-- ============================================

-- 예약 시 차감된 크레딧 기록
alter table public.reservations 
  add column if not exists credit_cost integer default 0;

-- 크레딧 환불 여부
alter table public.reservations 
  add column if not exists credit_refunded boolean default false;

-- ============================================
-- 7. 헬퍼 함수: 크레딧 차감 및 거래 기록 (트랜잭션)
-- ============================================

-- 크레딧 차감 함수 (원자성 보장)
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
  -- 1. 현재 잔액 조회 (FOR UPDATE로 락 걸기)
  select credits into v_current_balance
  from public.profiles
  where id = p_user_id
  for update;

  -- 2. 잔액 부족 체크
  if v_current_balance < p_amount then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'message', '크레딧이 부족합니다.',
      'current_balance', v_current_balance,
      'required_amount', p_amount
    );
  end if;

  -- 3. 크레딧 차감
  v_new_balance := v_current_balance - p_amount;
  
  update public.profiles
  set credits = v_new_balance
  where id = p_user_id;

  -- 4. 거래 내역 기록
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

  -- 5. 성공 응답
  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'amount_deducted', p_amount
  );
end;
$$;

-- 크레딧 추가 함수 (원자성 보장)
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
  -- 1. 현재 잔액 조회 (FOR UPDATE로 락 걸기)
  select credits into v_current_balance
  from public.profiles
  where id = p_user_id
  for update;

  -- 2. 크레딧 추가
  v_new_balance := v_current_balance + p_amount;
  
  update public.profiles
  set credits = v_new_balance
  where id = p_user_id;

  -- 3. 거래 내역 기록
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

  -- 4. 성공 응답
  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'amount_added', p_amount
  );
end;
$$;

-- ============================================
-- 완료
-- ============================================
