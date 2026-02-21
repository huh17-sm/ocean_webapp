# 🔧 과정 등록 시스템 및 전체 에러 수정 가이드

## 📋 수정된 내용

### 1. 코드 수정 (자동 완료 ✅)
- ✅ `src/app/actions/progress.ts` - 에러 핸들링 개선
- ✅ `src/app/admin/actions/credits.ts` - 에러 핸들링 개선
- ✅ `src/app/admin/actions/course-enrollment.ts` - 안전한 에러 처리
- ✅ 모든 fetch 함수가 에러 발생 시 빈 값 반환하여 크래시 방지

### 2. 데이터베이스 마이그레이션 (실행 필요 ⚠️)
- `supabase/migrations/20260214_fix_all_rls_and_course_enrollment.sql` 생성됨
- 모든 RLS 정책 및 과정 등록 시스템 설정 포함

---

## 🚀 데이터베이스 수정 실행 방법

### Supabase 대시보드에서 실행:

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택

2. **SQL Editor 열기**
   - 좌측 메뉴에서 **SQL Editor** 클릭
   - **New query** 버튼 클릭

3. **SQL 복사 및 실행**
   - 아래 파일 내용을 복사:
     ```
     supabase/migrations/20260214_fix_all_rls_and_course_enrollment.sql
     ```
   - SQL Editor에 붙여넣기
   - 우측 하단 **Run** 버튼 클릭 (또는 Ctrl+Enter)

4. **성공 확인**
   - "✅ 모든 RLS 정책과 마이그레이션이 성공적으로 적용되었습니다!" 메시지 확인
   - 또는 "Success. No rows returned" 메시지 확인

---

## 🧪 테스트 절차

### 1단계: 브라우저 새로고침
```bash
# 앱 전체 새로고침
Ctrl+R (또는 F5)
```

### 2단계: 사용자 기능 테스트
- [ ] 대시보드 홈 접속 → 에러 없이 로드되는지 확인
- [ ] "교육 과정 둘러보기" 클릭 → `/dashboard/courses` 페이지 로드 확인
- [ ] 과정 카드에서 "과정 신청하기" 버튼 클릭
- [ ] 다이얼로그에서 과정 정보 확인
- [ ] "신청하기" 버튼 클릭 → 성공 메시지 확인
- [ ] 대시보드 홈으로 이동 → "신청 대기중" 섹션에 표시되는지 확인

### 3단계: 관리자 기능 테스트
- [ ] 관리자 대시보드 접속 → 에러 없이 로드되는지 확인
- [ ] "과정 신청 대기" 위젯에 pending 요청 표시 확인
- [ ] [승인] 버튼 클릭 → 성공 메시지 및 크레딧 지급 확인
- [ ] 사용자 대시보드 확인 → "현재 과정"으로 표시되는지 확인

---

## ✅ 수정된 기능 목록

### 에러 핸들링
- ❌ **이전**: 에러 발생 시 페이지 전체 크래시
- ✅ **현재**: 에러 발생 시 빈 값 반환하여 페이지 정상 로드

### 과정 등록 시스템
- ✅ 사용자가 과정 신청 가능 (`/dashboard/courses`)
- ✅ 관리자가 신청 승인/거부 가능
- ✅ 승인 시 자동 크레딧 지급
- ✅ 중복 신청 방지
- ✅ Pending 상태 표시

### RLS 정책
- ✅ `course_progress`: 사용자 조회, 신청 권한
- ✅ `profiles`: 공개 조회 및 본인 수정 권한
- ✅ `debriefings`: 본인 및 강사/관리자 조회 권한
- ✅ `courses`: 공개 조회 권한

---

## 🐛 문제 해결

### 여전히 "과정 신청에 실패했습니다" 에러가 나는 경우:

1. **브라우저 콘솔 확인** (F12 → Console 탭)
   - 상세 에러 메시지 확인
   - 스크린샷 캡처 후 개발자에게 전달

2. **Supabase 로그 확인**
   - Supabase Dashboard → Logs → Postgres Logs
   - 최근 에러 확인

3. **RLS 정책 확인**
   - Table Editor → course_progress → RLS 버튼
   - "Users can apply for courses" 정책 존재 확인

### 관리자 페이지가 로드되지 않는 경우:

- 브라우저 콘솔에서 에러 확인
- `getPendingCourseRequests` 함수 에러 로그 확인
- 관리자 권한 확인 (role = 'admin')

---

## 📞 지원

문제가 지속되면:
1. 브라우저 콘솔 스크린샷
2. Supabase Postgres Logs 스크린샷
3. 재현 단계

위 정보를 제공해주세요.
