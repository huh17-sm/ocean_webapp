/**
 * 과정 등록 신청 시스템 타입 정의
 */

// 과정 진도 상태
export type CourseProgressStatus = 'pending' | 'in_progress' | 'completed' | 'dropped'

// 기본 과정 진도 인터페이스
export interface CourseProgress {
  id: number
  user_id: string
  course_id: string | null
  course_level: string
  status: CourseProgressStatus
  theory_completed: boolean
  pool_sessions_completed: number
  applied_at: string | null
  approved_by: string | null
  approved_at: string | null
  started_at: string | null
  completed_at: string | null
  credits_granted: number
  credit_grant_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// 상세 정보가 포함된 과정 진도 (조인된 데이터 포함)
export interface CourseProgressWithDetails extends CourseProgress {
  courses?: {
    id: string
    title: string
    level: string
    price: any
    curriculum_details: string[]
    description?: string
    status?: string
  }
  profiles?: {
    id: string
    name: string
    email: string
  }
  approved_by_profile?: {
    id: string
    name: string
  }
}

// 과정 신청/배정 결과
export interface CourseEnrollmentResult {
  success: boolean
  message: string
  progressId?: number
}

// 과정 정보 (courses 테이블)
export interface Course {
  id: string
  title: string
  level: string
  description?: string
  price?: {
    standard?: number
    credits?: number
    [key: string]: any
  }
  duration?: string
  certification?: string
  curriculum_details?: string[]
  requirements?: any
  features?: string[]
  icon?: string
  status: 'ACTIVE' | 'INACTIVE' | 'INQUIRY_ONLY'
  sort_order: number
  created_at: string
}

// Pending 요청 (관리자용)
export interface PendingCourseRequest {
  id: number
  user_id: string
  course_id: string | null
  course_level: string
  status: CourseProgressStatus
  applied_at: string
  created_at: string
  profiles?: {
    id: string
    name: string
    email: string
  }
  courses?: {
    id: string
    title: string
    level: string
    price: any
  }
}

// 사용자 신청 내역 (getMyCourseApplications 반환값)
export interface MyCourseApplication {
  id: number
  user_id: string
  course_id: string | null
  course_level: string
  status: CourseProgressStatus
  applied_at: string
  started_at: string | null
  completed_at: string | null
  credits_granted: number
  created_at: string
  updated_at: string
  courses?: {
    id: string
    title: string
    level: string
    price: any
    curriculum_details: string[]
  }
}
