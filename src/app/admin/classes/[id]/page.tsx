import { redirect } from 'next/navigation'

// 수업 상세는 캘린더 view의 모달에서 처리하므로,
// 직접 URL로 접근 시 캘린더 페이지로 리다이렉트합니다.
export default async function ClassDetailPage() {
  redirect('/admin/classes/availability')
}
