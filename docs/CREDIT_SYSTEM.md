# 🌊 오션프리다이빙 크레딧 시스템

## 📋 개요

이 문서는 오션프리다이빙 서비스의 크레딧 시스템 설계 및 구현 가이드입니다.

### 기본 원칙

- **화폐 단위**: 1,000원 = 1 크레딧 (C)
- **표시 방식**: 사용자 화면에는 소수점 없이 정수로 표시
- **목표**: 정규 커리큘럼 결제 시 보너스 혜택 제공, 무분별한 무료 트레이닝 방지

---

## 💰 크레딧 단가표

### 강습 크레딧

| 항목 | 차감 크레딧 | 비고 |
|------|-------------|------|
| 이론 교육 | **50 C** | 모든 과정 공통 1회 |
| 풀장 수업 | **100 C** | 강사 레슨 1회 세션 |

### 트레이닝 크레딧

| 항목 | 차감 크레딧 | 비고 |
|------|-------------|------|
| 트레이닝 (1인) | **80 C** | 1:1 또는 소수 정예 |
| 트레이닝 (2인 이상) | **60 C/인** | 다인 신청 시 할인 |

### 자격증 발급 크레딧

| 항목 | 차감 크레딧 | 비고 |
|------|-------------|------|
| AIDA 1 발급 | **30 C** | 입문 단계 |
| AIDA 2 발급 | **50 C** | 초급 단계 |
| AIDA 2 Pool 발급 | **30 C** | 초급 미완수 시 하향 발급 |
| AIDA 3 발급 | **60 C** | 중급 단계 |

---

## 📦 정규 커리큘럼 패키지

### 입문 과정 (15만 원)

- **지급 크레딧**: 180 C
- **구성**:
  - 이론 교육 (50 C)
  - 풀장 수업 1회 (100 C)
  - AIDA 1 자격증 (30 C)
- **잔액**: 0 C (딱 떨어짐)

### 초급 과정 (40만 원)

- **지급 크레딧**: 430 C
- **구성**:
  - 이론 교육 (50 C)
  - 풀장 수업 3회 (300 C)
  - AIDA 2 자격증 (50 C)
- **잔액**: 30 C (크레딧 추가 구매 유도)

### 중급 과정 (55만 원)

- **지급 크레딧**: 580 C
- **구성**:
  - 이론 교육 (50 C)
  - 풀장 수업 4회 (400 C)
  - AIDA 3 자격증 (60 C)
- **잔액**: 70 C (다인 트레이닝 1회 가능)

---

## 🎁 보너스 크레딧 정책

### 정기 트레이닝 참여 보너스

- **참여 1회당**: +10 C
- **월 최대**: 40 C (주 1회 참여 시)
- **조건**: 출석 체크 필수, 노쇼 시 지급 안 됨

### 활용 예시

```
중급 과정 구매 (580 C) 
→ 필수 과정 이수 (510 C 소진, 잔액 70 C)
→ 정기 트레이닝 1회 참여 (+10 C, 잔액 80 C)
→ 1인 트레이닝 1회 예약 (80 C 소진)
```

---

## 🗂️ 데이터베이스 스키마

### 1. credit_transactions (크레딧 거래 내역)

모든 크레딧 입출금 내역을 기록합니다.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → profiles)
- transaction_type: 'purchase' | 'deduct' | 'refund' | 'bonus'
- amount: INTEGER (양수: 증가, 음수: 감소)
- balance_before: INTEGER
- balance_after: INTEGER
- reason: TEXT (거래 사유)
- related_entity_id: UUID (연관 엔티티 ID)
- related_entity_type: TEXT (연관 엔티티 타입)
- memo: TEXT
- created_at: TIMESTAMP
```

### 2. certification_requests (자격증 발급 신청)

자격증 발급 신청 및 처리 내역을 기록합니다.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → profiles)
- certification_type: 'AIDA1' | 'AIDA2' | 'AIDA2_POOL' | 'AIDA3'
- credit_cost: INTEGER
- status: 'pending' | 'approved' | 'rejected'
- requested_by: 'user' | 'instructor'
- requested_at: TIMESTAMP
- processed_at: TIMESTAMP
- processed_by: UUID (관리자 ID)
- admin_memo: TEXT
- created_at: TIMESTAMP
```

### 3. attendance_logs (정기 트레이닝 출석)

정기 트레이닝 출석 및 보너스 지급 내역을 기록합니다.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → profiles)
- attendance_date: DATE
- training_type: TEXT (기본값: 'regular_training')
- bonus_credited: BOOLEAN
- bonus_amount: INTEGER
- admin_memo: TEXT
- recorded_by: UUID (관리자 ID)
- created_at: TIMESTAMP
```

### 4. package_purchases (패키지 구매 내역)

정규 커리큘럼 패키지 구매 내역을 기록합니다.

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → profiles)
- package_type: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
- price: INTEGER
- credits_granted: INTEGER
- payment_status: 'completed' | 'pending' | 'cancelled'
- payment_method: TEXT
- payment_id: TEXT
- admin_memo: TEXT
- created_at: TIMESTAMP
```

---

## 🔧 주요 함수

### 1. deduct_credits() - 크레딧 차감

```sql
deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_related_entity_id UUID DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
) RETURNS JSONB
```

**기능**:
- 사용자 크레딧 차감
- 잔액 부족 시 오류 반환
- 거래 내역 자동 기록
- 트랜잭션으로 원자성 보장

### 2. add_credits() - 크레딧 추가

```sql
add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_related_entity_id UUID DEFAULT NULL,
  p_related_entity_type TEXT DEFAULT NULL,
  p_memo TEXT DEFAULT NULL
) RETURNS JSONB
```

**기능**:
- 사용자 크레딧 추가
- 거래 내역 자동 기록
- 트랜잭션으로 원자성 보장

---

## 📁 파일 구조

```
src/
├── lib/
│   └── credit-constants.ts          # 크레딧 상수 정의
├── types/
│   └── credit.ts                     # 크레딧 타입 정의
└── app/
    └── admin/
        └── actions/
            ├── credits.ts            # 크레딧 서버 액션
            ├── certifications.ts     # 자격증 서버 액션
            └── attendance.ts         # 출석 서버 액션

supabase/
└── migrations/
    └── 20260209_credit_system.sql   # 크레딧 시스템 마이그레이션

scripts/
└── migrate-credit-system.sh         # 마이그레이션 실행 스크립트
```

---

## 🚀 설치 및 실행

### 1. 마이그레이션 실행

```bash
# 스크립트 실행 권한 부여
chmod +x scripts/migrate-credit-system.sh

# 마이그레이션 실행
./scripts/migrate-credit-system.sh
```

또는 Supabase CLI 직접 사용:

```bash
supabase db push
```

### 2. 개발 서버 재시작

```bash
npm run dev
```

---

## 📝 주요 비즈니스 로직

### 1. 패키지 구매 플로우

```
1. 사용자가 패키지 선택 (예: 중급 과정)
2. 결제 처리 (외부 결제 시스템)
3. add_credits() 함수 호출 → 580C 지급
4. package_purchases 테이블에 구매 내역 기록
5. credit_transactions 테이블에 거래 내역 자동 기록
```

### 2. 수업 예약 플로우

```
1. 사용자가 수업 예약 (예: 풀장 수업)
2. 크레딧 잔액 확인
3. deduct_credits() 함수 호출 → 100C 차감
4. reservations 테이블에 예약 기록 (credit_cost: 100)
5. credit_transactions 테이블에 거래 내역 자동 기록
```

### 3. 예약 취소 플로우

```
1. 사용자가 예약 취소
2. 예약 정보에서 credit_cost 조회 (예: 100C)
3. add_credits() 함수 호출 → 100C 환불
4. reservations 테이블 업데이트 (status: 'cancelled', credit_refunded: true)
5. credit_transactions 테이블에 환불 내역 자동 기록
```

### 4. 자격증 발급 플로우

#### 교육생 신청 시:
```
1. 교육생이 자격증 발급 신청 (예: AIDA2)
2. deduct_credits() 함수 호출 → 50C 차감
3. certification_requests 테이블에 신청 기록 (status: 'pending')
4. 관리자 승인 대기
5. 승인 시: status → 'approved'
6. 거부 시: add_credits() 호출 → 50C 환불, status → 'rejected'
```

#### 강사 직접 발급 시:
```
1. 강사가 교육생에게 직접 발급 (예: AIDA2)
2. deduct_credits() 함수 호출 → 50C 차감
3. certification_requests 테이블에 기록 (status: 'approved', requested_by: 'instructor')
```

### 5. 정기 트레이닝 출석 플로우

```
1. 관리자가 출석 체크
2. 중복 출석 확인 (같은 날짜)
3. 월별 보너스 한도 확인 (최대 40C)
4. 보너스 지급 가능 시:
   - add_credits() 함수 호출 → 10C 지급
   - attendance_logs 테이블에 기록 (bonus_credited: true, bonus_amount: 10)
5. 보너스 한도 초과 시:
   - attendance_logs 테이블에 기록 (bonus_credited: false, bonus_amount: 0)
```

---

## ⚠️ 중요 정책

### 노쇼 정책

- **예약 노쇼**: 크레딧 반환 안 됨
- **다인 트레이닝 노쇼**: 크레딧 반환 안 됨 (예약 시 명확한 안내 필요)

### 자격증 발급 정책

- **기준 이수 시**: 강사 우선 발급 (자동 차감)
- **기준 미달 시**: 교육생 요청 우선 (딸각 신청)
- **발급 불가 시**: 크레딧 자동 환불

### 트랜잭션 보장

- 모든 크레딧 변동은 `deduct_credits()` 또는 `add_credits()` 함수를 통해서만 처리
- 데이터베이스 트랜잭션으로 원자성 보장
- 실패 시 자동 롤백

---

## 🧪 테스트 체크리스트

### 패키지 구매 테스트

- [ ] 입문 과정 구매 → 180C 지급 확인
- [ ] 초급 과정 구매 → 430C 지급 확인
- [ ] 중급 과정 구매 → 580C 지급 확인
- [ ] 거래 내역에 기록되는지 확인
- [ ] 패키지 구매 내역에 기록되는지 확인

### 수업 예약 테스트

- [ ] 이론 교육 예약 → 50C 차감 확인
- [ ] 풀장 수업 예약 → 100C 차감 확인
- [ ] 1인 트레이닝 예약 → 80C 차감 확인
- [ ] 2인 트레이닝 예약 → 60C/인 차감 확인
- [ ] 잔액 부족 시 예약 차단 확인

### 예약 취소 테스트

- [ ] 예약 취소 → 크레딧 환불 확인
- [ ] 마이페이지에서 잔액 증가 확인
- [ ] 거래 내역에 환불 기록 확인

### 자격증 발급 테스트

- [ ] 교육생 신청 → 크레딧 차감 확인
- [ ] 관리자 승인 → 상태 변경 확인
- [ ] 관리자 거부 → 크레딧 환불 확인
- [ ] 강사 직접 발급 → 크레딧 차감 및 자동 승인 확인

### 정기 트레이닝 출석 테스트

- [ ] 출석 체크 → 보너스 10C 지급 확인
- [ ] 중복 출석 차단 확인
- [ ] 월별 한도 40C 체크 확인
- [ ] 한도 초과 시 보너스 미지급 확인

---

## 📞 문의

크레딧 시스템 관련 문의사항은 개발팀에 연락주세요.

---

**마지막 업데이트**: 2026-02-09
