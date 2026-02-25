import { LucideIcon, Home, Calendar, CalendarCheck, MoreHorizontal, MessageSquare } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

/**
 * 앱 전체에서 사용되는 메인 네비게이션 아이템
 * - 모바일: 하단 네비게이션 바
 * - 태블릿/데스크톱: 상단 헤더 네비게이션
 *
 * 순서: 홈 → 예약 → 내 수업(예약현황) → 피드백 → 더보기
 * - "내 수업": 내가 예약한 수업 목록을 바로 확인 (자주 쓰는 기능)
 * - "피드백": 수업 후 디브리핑 확인 (교육 등록 후 사용빈도 높음)
 * - 교육과정/진도: 대시보드 및 더보기에서 접근 가능
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: '홈', icon: Home },
  { href: '/classes', label: '예약', icon: Calendar },
  { href: '/dashboard/reservations', label: '내 수업', icon: CalendarCheck },
  { href: '/dashboard/debriefings', label: '피드백', icon: MessageSquare },
  { href: '/dashboard/more', label: '더보기', icon: MoreHorizontal },
]

/**
 * 현재 경로가 네비게이션 아이템과 활성 상태인지 확인
 * @param pathname - 현재 경로
 * @param href - 네비게이션 아이템의 경로
 * @returns 활성 상태 여부
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}
