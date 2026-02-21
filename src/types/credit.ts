/**
 * 크레딧 시스템 타입 정의
 */

// ============================================
// 1. 크레딧 거래 내역 (Credit Transactions)
// ============================================

export type TransactionType = 'purchase' | 'deduct' | 'refund' | 'bonus';

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  related_entity_id?: string;
  related_entity_type?: string;
  memo?: string;
  created_at: string;
  profiles?: {
    name: string | null;
    email: string | null;
  };
}

// ============================================
// 2. 자격증 발급 신청 (Certification Requests)
// ============================================

export type CertificationType = 'AIDA1' | 'AIDA2' | 'AIDA2_POOL' | 'AIDA3';
export type CertificationStatus = 'pending' | 'approved' | 'rejected';
export type RequestedBy = 'user' | 'instructor';

export interface CertificationRequest {
  id: string;
  user_id: string;
  certification_type: CertificationType;
  credit_cost: number;
  status: CertificationStatus;
  requested_by: RequestedBy;
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  admin_memo?: string;
  created_at: string;
}

// ============================================
// 3. 정기 트레이닝 출석 기록 (Attendance Logs)
// ============================================

export interface AttendanceLog {
  id: string;
  user_id: string;
  attendance_date: string;
  training_type: string;
  bonus_credited: boolean;
  bonus_amount: number;
  admin_memo?: string;
  recorded_by?: string;
  created_at: string;
}

// ============================================
// 4. 패키지 구매 내역 (Package Purchases)
// ============================================

export type PackageType = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type PaymentStatus = 'completed' | 'pending' | 'cancelled';

export interface PackagePurchase {
  id: string;
  user_id: string;
  package_type: PackageType;
  price: number;
  credits_granted: number;
  payment_status: PaymentStatus;
  payment_method?: string;
  payment_id?: string;
  admin_memo?: string;
  created_at: string;
}

// ============================================
// 5. 크레딧 함수 응답 타입
// ============================================

export interface CreditOperationResult {
  success: boolean;
  transaction_id?: string;
  balance_before?: number;
  balance_after?: number;
  amount_deducted?: number;
  amount_added?: number;
  error?: string;
  message?: string;
  current_balance?: number;
  required_amount?: number;
}

// ============================================
// 6. 사용자 프로필 확장 (크레딧 포함)
// ============================================

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  role: 'admin' | 'user';
  credits: number; // 크레딧 잔액
  phone_number?: string;
  created_at: string;
}

// ============================================
// 7. 예약 확장 (크레딧 정보 포함)
// ============================================

export interface ReservationWithCredit {
  id: string;
  user_id: string;
  class_id: string;
  status: 'confirmed' | 'cancelled';
  credit_cost: number; // 차감된 크레딧
  credit_refunded: boolean; // 환불 여부
  feedback_text?: string;
  media_link_url?: string;
  created_at: string;
}

export interface RechargeRequest extends PackagePurchase {
  profiles?: {
    name: string | null;
    email: string | null;
  };
}
