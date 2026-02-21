# cancelled 상태 추가 가이드

## 문제
관리자가 승인된 수업을 삭제했을 때, 사용자에게 "수업이 취소되었습니다"라고 알려주기 위해 `cancelled` 상태가 필요합니다.

## 해결 방법

### 1단계: Supabase Dashboard 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (`fzsxkssweptpmrengunf`)
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: SQL 실행
아래 SQL을 복사해서 실행하세요:

```sql
-- 기존 제약조건 제거
alter table public.class_requests 
drop constraint if exists class_requests_status_check;

-- cancelled 상태를 포함한 새 제약조건 추가
alter table public.class_requests
add constraint class_requests_status_check 
check (status in ('pending', 'approved', 'rejected', 'cancelled'));
```

### 3단계: 확인
SQL Editor에서 다음 쿼리로 확인:

```sql
-- 제약조건 확인
select conname, pg_get_constraintdef(oid) 
from pg_constraint 
where conrelid = 'public.class_requests'::regclass 
and conname = 'class_requests_status_check';
```

결과에 `'cancelled'`이 포함되어 있으면 성공입니다!

### 4단계: 테스트
관리자 페이지에서:
1. 승인된 수업 하나를 삭제
2. 터미널 로그에서 `[deleteClass] Found X related request(s)` 확인
3. 사용자 대시보드에서 해당 요청이 "취소됨" 상태로 변경되었는지 확인

## 작동 원리

### 수업 삭제 시:
```
관리자가 수업 삭제
  ↓
deleteClass() 함수 실행
  ↓
해당 수업과 일치하는 approved 요청 찾기
  ↓
status를 'cancelled'로 변경
  ↓
admin_comment에 "관리자가 수업을 취소했습니다" 추가
  ↓
사용자 대시보드에 회색 "취소됨" 뱃지 표시
```

### UI 표시:
- **뱃지**: 회색 "취소됨"
- **메시지**: "🚫 수업이 취소되었습니다. 관리자가 수업을 취소했습니다."
