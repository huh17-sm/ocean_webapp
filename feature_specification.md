# 프리다이빙 교육 과정 등록 및 진도 관리 기능 명세서

이 문서는 **사용자 교육 과정 등록, 관리자 승인, 자동 크레딧 지급, 그리고 진도 현황 표시** 기능을 구현하기 위한 상세 명세서입니다. 다른 AI 모델이나 개발자가 이 문서를 보고 바로 코드를 작성할 수 있도록 구체적인 로직과 요구사항을 정리했습니다.

---

## 1. 프로젝트 컨텍스트 & 규칙

- **기술 스택**: Next.js 14 (App Router), Supabase (Auth/DB), Tailwind CSS, Shadcn UI.
- **언어**: TypeScript.
- **필수 규칙**:
    - 모든 주석과 설명은 **한국어**로 작성.
    - 데이터 삭제(`DELETE`) 금지 (Soft Delete 지향).
    - 결제/크레딧/상태 변경 등 중요한 로직은 **트랜잭션** 필수 사용.
    - **`diving-app/src`** 디렉토리 내에서 작업.

---

## 2. 데이터베이스 변경 사항 (Database Schema)

### 2.1. `course_progress` 테이블 (기존 테이블 수정)
- **목표**: 등록 대기('pending') 상태를 추가하여 승인 프로세스 지원.
- **변경 내용**:
    - `status` 컬럼의 Check Constraint 또는 Enum을 업데이트하여 `'pending'` 허용.
    - (참고) 현재 상태 값: `'in_progress'`, `'completed'`, `'dropped'` -> `'pending'` 추가 필요.

### 2.2. `courses` 테이블 (참조용, 수정 불필요)
- **구조 확인**: `price` 컬럼(JSONB)에 `credits` 정보가 포함되어 있음 (`price->>credits`).
- **역할**: 과정별 제공 크레딧 및 커리큘럼 특징(`features`) 정보의 원천 데이터(Source of Truth).

---

## 3. 백엔드 로직 (Server Actions)

모든 액션은 `src/app/actions/progress.ts` 또는 `src/app/admin/actions.ts`에 위치해야 합니다.

### 3.1. 사용자 기능: 과정 등록 신청
- **함수명**: `requestCourseRegistration(courseId: string, courseLevel: string)`
- **로직**:
    1. 사용자의 현재 세션(User ID) 확인.
    2. 이미 진행 중(`in_progress`)이거나 대기 중(`pending`)인 과정이 있는지 확인 (중복 방지).
    3. `course_progress` 테이블에 레코드 생성:
        - `user_id`: 현재 사용자
        - `course_id`: 입력받은 ID
        - `course_level`: 입력받은 Level
        - `status`: **`'pending'`**
        - `started_at`: `null` (승인 시 설정) 또는 현재 시간.
    4. 성공/실패 결과 반환.

### 3.2. 관리자 기능: 과정 승인 (핵심!)
- **함수명**: `approveCourseRequest(progressId: string)`
- **위치**: `src/app/admin/actions.ts`
- **로직 (반드시 트랜잭션 처리 권장)**:
    1. `progressId`로 해당 요청 조회.
    2. `courses` 테이블에서 해당 과정의 `credits` (가격 정보) 조회.
    3. **상태 업데이트**: `course_progress` 상태를 `'in_progress'`로 변경, `started_at`을 현재 시간으로 설정.
    4. **크레딧 자동 지급 (만약 `credits > 0` 이라면)**:
        - `credit_transactions` 테이블에 `type: 'charge'`, `amount: credits`, `description: '과정명 등록 지급'`으로 기록 추가.
        - `profiles` 테이블의 `general_credits` 증가.
    5. 오류 발생 시 전체 롤백.
    6. `revalidatePath`로 UI 갱신.

### 3.3. 관리자 기능: 수동 등록 (Manual Assignment)
- **함수명**: `assignCourseToUser(userId: string, courseId: string)`
- **로직**:
    - 사용자에게 신청 절차 없이 관리자가 즉시 과정을 부여하는 기능.
    - 로직은 **3.2 승인** 로직과 거의 동일하지만, `request` 단계 없이 바로 `'in_progress'` 상태로 레코드를 생성함.
    - **크레딧 자동 지급 로직 포함 필수.**

### 3.4. 사용자 기능: 진도 조회 (Curriculum 연동)
- **함수명**: `getMyCourseProgressWithDetails()`
- **개선 사항**:
    - 기존 `getMyCourseProgress`를 수정하거나 새로 생성.
    - `course_progress` 데이터를 가져올 때, `courses` 테이블을 조인(Join)하여 과정의 **`features` (특징/커리큘럼)** 및 `title`, `description`을 함께 반환한다.
    - 목적: 대시보드에서 단순 진도율뿐만 아니라, 구체적으로 어떤 내용을 배우는지 보여주기 위함.

---

## 4. UI 구현 (User Interface)

### 4.1. 사용자 대시보드 (`src/components/dashboard/home.tsx`, `course-progress-card.tsx`)
1.  **등록 버튼 ('Register')**:
    -   사용자가 진행 중인 과정이 없을 때만 표시.
    -   클릭 시 `CourseRegistrationDialog` 오픈.
2.  **등록 신청 모달 (`CourseRegistrationDialog`)**:
    -   활성화된 과정(`courses`) 목록을 선택 가능.
    -   신청 시 `requestCourseRegistration` 액션 호출.
3.  **진도 카드 개선**:
    -   상태가 `'pending'`일 경우: "승인 대기 중" 배지 표시.
    -   상태가 `'in_progress'`일 경우: `courses.features`를 리스트 형태의 체크리스트나 커리큘럼으로 시각화하여 "무엇을 배우는지" 보여줌.

### 4.2. 관리자 - 사용자 상세 페이지 (`src/app/admin/users/[id]/page.tsx`)
1.  **과정 관리 섹션 추가**:
    -   현재 사용자의 진행 중/대기 중인 과정 표시.
    -   **'과정 배정' 버튼**: 클릭 시 관리자가 직접 과정을 선택하여 `assignCourseToUser` 액션 실행.

### 4.3. 관리자 - 요청 관리 (`src/app/admin/dashboard/page.tsx` 등)
-   (선택 사항) 대시보드 또는 별도 탭에 "승인 대기 중인 요청 목록"을 보여주고, [승인] / [거절] 버튼 배치.

---

## 5. 작업 순서 가이드

1.  **DB & Type 수정**: Supabase 타입 정의 업데이트 및 `status` Enum 확인.
2.  **Server Actions 구현**: `request`, `approve`, `assign` 함수 작성 (트랜잭션 및 크레딧 로직 포함).
3.  **프로필 조회 로직 개선**: 과정 상세 정보(`features`)를 포함하도록 쿼리 수정.
4.  **UI 컴포넌트 개발**: 다이얼로그 및 버튼 생성, 대시보드 연동.
5.  **검증**:
    -   사용자 신청 -> 관리자 승인 -> 크레딧 지급 확인.
    -   관리자 수동 등록 -> 크레딧 지급 확인.
    -   대시보드에 커리큘럼 내용 표시 확인.
