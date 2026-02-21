import { getAdminDashboardStats } from './actions/dashboard'
import { getPendingCourseRequests, type PendingCourseRequest } from './actions/course-enrollment'
import { AdminHome } from '@/components/admin/dashboard/admin-home'

// 캐싱 방지
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats()

    // 과정 신청 대기 조회
    let pendingCourseRequests: PendingCourseRequest[] = []
    try {
        pendingCourseRequests = await getPendingCourseRequests()
    } catch (error) {
        console.error('Error fetching pending course requests:', error)
        // 에러가 발생해도 페이지는 정상적으로 로드되도록 빈 배열 유지
        pendingCourseRequests = []
    }

    return (
        <AdminHome
            stats={stats}
            pendingCourseRequests={pendingCourseRequests}
        />
    )
}
