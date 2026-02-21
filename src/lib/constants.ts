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
