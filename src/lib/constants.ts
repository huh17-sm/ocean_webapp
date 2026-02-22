// 수업 타입 설정 인터페이스
export interface ClassTypeSetting {
  type: string
  label: string
  credit_cost: number
  is_active: boolean
  sort_order: number
  created_at?: string
}

// 수업 타입별 크레딧 비용 (DB class_type_settings 조회 실패 시 폴백용)
// 실제 수업 예약 비용의 단일 소스는 DB의 class_type_settings 테이블입니다.
// 이 값을 변경하려면 관리자 설정 페이지에서 수정하세요.
// credit-constants.ts의 LESSON_CREDIT_COSTS와는 별개 (패키지 가치 산정용)
export const DEFAULT_CREDIT_COSTS: Record<string, number> = {
  theory: 0,
  pool: 1,
  training: 2,
}

// 수업 타입별 한글 라벨 (기존 상수 유지)
export const CLASS_TYPES = {
  theory: '이론 교육',
  pool: '풀장 교육',
  training: '트레이닝',
} as const

// 수업 타입별 색상 (색약 친화적 색상 - 파란색/주황색/청록색)
// 색약 사용자도 쉽게 구분할 수 있도록 명도와 색조 차이를 극대화
export const CLASS_COLORS = {
  pool: 'bg-blue-600',        // 풀장 교육: 진한 파란색
  theory: 'bg-orange-500',    // 이론 교육: 주황색 (파란색과 대비)
  training: 'bg-teal-500',    // 트레이닝: 청록색 (파란색/주황색과 구분)
  default: 'bg-slate-400',
} as const

export const CLASS_BG_COLORS = {
  pool: 'bg-blue-50 text-blue-700',
  theory: 'bg-orange-50 text-orange-700',
  training: 'bg-teal-50 text-teal-700',
  default: 'bg-slate-50 text-slate-700',
} as const

// 통합 크레딧 단위 (C, Cr, 회 등 혼용 방지)
export const CREDIT_UNIT = "C"

// 스킬 정의 데이터
export const SKILL_DEFINITIONS: Record<
  string,
  { type: string; label: string; minSession?: number }[]
> = {
  입문: [
    { type: 'theory', label: '이론 교육' },
    { type: 'static', label: '스태틱 (숨참기)' },
    { type: 'dynamic', label: '다이나믹 (잠영)' },
    { type: 'rescue', label: '레스큐 (구조)' },
  ],
  초급: [
    { type: 'theory', label: '이론 교육' },
    { type: 'static', label: '스태틱 (숨참기)' },
    { type: 'dynamic', label: '다이나믹 (잠영)' },
    { type: 'depth', label: '수심 (컨스탄트웨이트)' },
    { type: 'rescue', label: '레스큐 (구조)' },
  ],
  중급: [
    { type: 'theory', label: '이론 교육' },
    { type: 'static', label: '스태틱 (숨참기)' },
    { type: 'dynamic', label: '다이나믹 (잠영)' },
    { type: 'depth', label: '수심 (컨스탄트웨이트)' },
    { type: 'rescue', label: '레스큐 (구조)' },
  ],
  고급: [
    { type: 'theory', label: '이론 교육' },
    { type: 'static', label: '스태틱 (숨참기)' },
    { type: 'dynamic', label: '다이나믹 (잠영)' },
    { type: 'depth', label: '수심 (컨스탄트웨이트)' },
    { type: 'rescue', label: '레스큐 (구조)' },
  ],
}

// 취소 및 환불 정책 상수
// 나중에 관리자 페이지 등에서 DB로 이관하거나 쉽게 수정할 수 있도록 분리해 둡니다.
export const REFUND_POLICY = {
  SAME_DAY: {
    daysBefore: 0,
    refundRate: 0, // 당일 0% 환불 (취소 불가)
    message: "당일 취소는 불가합니다.",
  },
  ONE_TO_THREE_DAYS: {
    daysBeforeStart: 1, // 1일 전부터
    daysBeforeEnd: 3,   // 3일 전까지
    refundRate: 0.2, // 80% 차감 (20% 환불)
    message: "수업 1~3일 전 취소 시 위약금(80%)이 차감되어 20%만 환불됩니다.",
  },
  FOUR_OR_MORE_DAYS: {
    daysBefore: 4,      // 4일 전 이상
    refundRate: 1.0, // 100% 환불
    message: "수업 4일 이전 취소 시 100% 전액 환불됩니다.",
  },
} as const
