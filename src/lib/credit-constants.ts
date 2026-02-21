/**
 * 크레딧 시스템 상수 정의
 *
 * 기본 원칙:
 * - 1 크레딧(C) = 1,000원
 * - 사용자 화면에는 정수로 표시 (소수점 없음)
 *
 * NOTE: 이 파일의 수업 단가(LESSON_CREDIT_COSTS, TRAINING_CREDIT_COSTS)는
 * 커리큘럼 패키지의 가치 구성 및 산정용입니다.
 * 실제 수업 예약 시 차감되는 크레딧은 DB의 class_type_settings 테이블에서 관리됩니다.
 * 수업 예약 비용을 변경하려면 관리자 설정 페이지를 사용하세요.
 */

// ============================================
// 1. 수업 및 자격증 단가 (패키지 가치 산정용)
// ============================================

/**
 * 강습 크레딧 단가 (패키지 구성 가치 산정용)
 * 실제 예약 차감 비용은 class_type_settings DB 테이블 참조
 */
export const LESSON_CREDIT_COSTS = {
  /** 이론 교육 (모든 과정 공통 1회) */
  THEORY: 50,
  /** 풀장 수업 (강사 레슨 1회 세션) */
  POOL: 100,
} as const;

/**
 * 트레이닝 크레딧 단가
 */
export const TRAINING_CREDIT_COSTS = {
  /** 1인 트레이닝 */
  SOLO: 80,
  /** 2인 이상 트레이닝 (인당) */
  GROUP: 60,
} as const;

/**
 * 자격증 발급 크레딧 단가
 */
export const CERTIFICATION_CREDIT_COSTS = {
  /** AIDA 1 발급 (입문 단계) */
  AIDA1: 30,
  /** AIDA 2 발급 (초급 단계) */
  AIDA2: 50,
  /** AIDA 2 Pool 발급 (초급 미완수 시 하향 발급용) */
  AIDA2_POOL: 30,
  /** AIDA 3 발급 (중급 단계) */
  AIDA3: 60,
} as const;

// ============================================
// 2. 정규 커리큘럼 패키지 (Curriculum Packages)
// ============================================

/**
 * 패키지 타입 정의
 */
export type PackageType = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/**
 * 패키지 구성 인터페이스
 */
export interface CurriculumPackage {
  /** 패키지 ID */
  id: PackageType;
  /** 패키지 이름 */
  name: string;
  /** 가격 (원) */
  price: number;
  /** 지급 크레딧 (보너스 포함) */
  totalCredits: number;
  /** 필수 소진 크레딧 */
  requiredCredits: number;
  /** 잔여 크레딧 (보너스) */
  bonusCredits: number;
  /** 패키지 구성 내역 */
  composition: {
    theory: number;
    pool: number;
    certification: string;
  };
  /** 설명 */
  description: string;
}

/**
 * 정규 커리큘럼 패키지 정의
 */
export const CURRICULUM_PACKAGES: Record<PackageType, CurriculumPackage> = {
  /** 입문 과정 (15만 원) */
  BEGINNER: {
    id: 'BEGINNER',
    name: '입문 과정',
    price: 150000,
    totalCredits: 180,
    requiredCredits: 180,
    bonusCredits: 0,
    composition: {
      theory: 1, // 50C
      pool: 1, // 100C
      certification: 'AIDA1', // 30C
    },
    description: '이론(50C) + 풀장1회(100C) + AIDA1(30C) = 잔액 0C',
  },
  
  /** 초급 과정 (40만 원) */
  INTERMEDIATE: {
    id: 'INTERMEDIATE',
    name: '초급 과정',
    price: 400000,
    totalCredits: 430,
    requiredCredits: 400,
    bonusCredits: 30,
    composition: {
      theory: 1, // 50C
      pool: 3, // 300C
      certification: 'AIDA2', // 50C
    },
    description: '이론(50C) + 풀장3회(300C) + AIDA2(50C) = 잔액 30C (크레딧 추가 구매 유도)',
  },
  
  /** 중급 과정 (55만 원) */
  ADVANCED: {
    id: 'ADVANCED',
    name: '중급 과정',
    price: 550000,
    totalCredits: 580,
    requiredCredits: 510,
    bonusCredits: 70,
    composition: {
      theory: 1, // 50C
      pool: 4, // 400C
      certification: 'AIDA3', // 60C
    },
    description: '이론(50C) + 풀장4회(400C) + AIDA3(60C) = 잔액 70C (다인 트레이닝 1회 가능)',
  },
};

// ============================================
// 3. 보너스 크레딧 정책 (Bonus Credits)
// ============================================

/**
 * 정기 트레이닝 참여 보너스
 */
export const REGULAR_TRAINING_BONUS = {
  /** 참여 1회당 지급 크레딧 */
  PER_ATTENDANCE: 10,
  /** 월 최대 지급 크레딧 */
  MONTHLY_MAX: 40,
  /** 설명 */
  description: '정기 트레이닝 참여 시 10C 지급 (월 최대 40C)',
} as const;

// ============================================
// 4. 크레딧 단독 구매 옵션 (Credit Purchase Options)
// ============================================

/**
 * 크레딧 단독 구매 옵션 인터페이스
 */
export interface CreditPurchaseOption {
  /** 옵션 ID */
  id: string;
  /** 구매 크레딧 */
  credits: number;
  /** 가격 (원) */
  price: number;
  /** 보너스 크레딧 */
  bonusCredits: number;
  /** 총 지급 크레딧 */
  totalCredits: number;
  /** 라벨 */
  label: string;
}

/**
 * 크레딧 단독 구매 옵션 (추후 구현 예정)
 */
export const CREDIT_PURCHASE_OPTIONS: CreditPurchaseOption[] = [
  {
    id: 'small',
    credits: 30,
    price: 30000,
    bonusCredits: 0,
    totalCredits: 30,
    label: '소액 충전',
  },
  {
    id: 'medium',
    credits: 100,
    price: 100000,
    bonusCredits: 0,
    totalCredits: 100,
    label: '기본 충전',
  },
  {
    id: 'large',
    credits: 300,
    price: 300000,
    bonusCredits: 30,
    totalCredits: 330,
    label: '대량 충전 (보너스 +30C)',
  },
];

// ============================================
// 5. 헬퍼 함수 (Helper Functions)
// ============================================

/**
 * 크레딧을 원화로 변환
 * @param credits 크레딧
 * @returns 원화 (원)
 */
export function creditsToKRW(credits: number): number {
  return credits * 1000;
}

/**
 * 원화를 크레딧으로 변환
 * @param krw 원화 (원)
 * @returns 크레딧
 */
export function krwToCredits(krw: number): number {
  return Math.floor(krw / 1000);
}

import { CREDIT_UNIT } from "@/lib/constants";

/**
 * 크레딧을 포맷팅된 문자열로 변환
 * @param credits 크레딧
 * @returns 포맷팅된 문자열 (예: "100 C")
 */
export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} ${CREDIT_UNIT}`;
}

/**
 * 원화를 포맷팅된 문자열로 변환
 * @param krw 원화 (원)
 * @returns 포맷팅된 문자열 (예: "100,000원")
 */
export function formatKRW(krw: number): string {
  return `${krw.toLocaleString()}원`;
}

/**
 * 트레이닝 크레딧 계산 (인원수에 따라)
 * @param participantCount 참가 인원 수
 * @returns 인당 크레딧
 */
export function calculateTrainingCreditCost(participantCount: number): number {
  return participantCount >= 2 
    ? TRAINING_CREDIT_COSTS.GROUP 
    : TRAINING_CREDIT_COSTS.SOLO;
}

/**
 * 자격증 타입에 따른 크레딧 비용 조회
 * @param certificationType 자격증 타입
 * @returns 크레딧 비용
 */
export function getCertificationCreditCost(
  certificationType: 'AIDA1' | 'AIDA2' | 'AIDA2_POOL' | 'AIDA3'
): number {
  return CERTIFICATION_CREDIT_COSTS[certificationType];
}
