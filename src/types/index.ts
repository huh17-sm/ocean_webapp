export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  general_credits: number; // 일반 크레딧
  bonus_credits: number;   // 보너스 크레딧
  credits?: number;        // 하위 호환성 (general_credits 값을 사용하도록 함)
  phone: string | null;
  phone_number?: string | null; // 하위 호환성용
  created_at: string;

  // New Member Management Fields
  current_progress?: string | null;
  mileage?: number;
  equalization?: string | null;
  cwt_record?: number | null;
  sta_record?: string | null;
  dny_record?: number | null;
  pb_cwt?: number | null; // 하위 호환성용
  pb_sta?: string | null; // 하위 호환성용
  pb_dyn?: number | null; // 하위 호환성용
  equipment?: string | null;
  cert_status?: string | null;
  expiry_date?: string | null; // ISO string for timestamp
  health_memo?: string | null;
  diving_notes?: string | null; // DB 컬럼명 대응
  birth_date: string | null;
  birthdate?: string | null; // 하위 호환성용
}

export interface TimeRange {
  id: string;
  start: string;
  end: string;
}

export interface PoolSchedule {
  weekday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
  holiday: TimeRange[];
}

export type HolidayRule = {
  id: string;
  type: "monthly";
  week: number;
  day: number;
};

export interface Pool {
  id: string;
  name: string;
  description?: string;
  schedule: PoolSchedule;
  holidayRules: HolidayRule[];
  is_active: boolean; // Changed from isActive to matches DB snake_case (or map it)
  created_at?: string;
}

export interface ClassTypeSetting {
  type: string;
  label: string;
  credit_cost: number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

// Supabase 조인 타입 정의
export interface ReservationWithClass {
  id: string;
  user_id: string;
  class_id: string;
  status: string;
  credit_cost: number;
  credit_refunded: boolean;
  is_archived: boolean;
  debriefing: string | null;
  debriefing_at: string | null;
  created_at: string;
  classes: {
    id: string;
    date: string;
    time: string;
    type: string;
    location: string | null;
    current_enrollment: number;
    media_link: string | null;
  } | null;
}

