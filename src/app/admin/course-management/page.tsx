/**
 * 통합 교육 관리 페이지 (서버 컴포넌트)
 *
 * 기존에 분산되어 있던 과정 신청 관리, 스킬 체크, 자격증 관리를
 * 하나의 페이지에서 효율적으로 처리할 수 있도록 통합합니다.
 */

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import {
  getEnrolledStudents,
  getActiveCourses,
  getAllStudents,
} from '@/app/admin/actions/course-management'
import { getPendingCourseRequests } from '@/app/admin/actions/course-enrollment'
import { getPendingCertificates } from '@/app/admin/actions/certificates-v2'
import { CourseManagementClient } from '@/components/admin/course-management/course-management-client'

// 캐싱 방지 - 항상 최신 데이터를 보여줌
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CourseManagementPage() {
  // 1. 권한 확인 (관리자/강사만 접근 가능)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'instructor'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // 2. 모든 데이터를 병렬로 가져옴 (로딩 시간 최소화)
  const [
    enrolledStudents,
    pendingRequests,
    pendingCertificates,
    activeCourses,
    allStudents,
  ] = await Promise.all([
    getEnrolledStudents(),
    getPendingCourseRequests(),
    getPendingCertificates(),
    getActiveCourses(),
    getAllStudents(),
  ])

  return (
    <CourseManagementClient
      enrolledStudents={enrolledStudents}
      pendingRequests={pendingRequests}
      pendingCertificates={pendingCertificates}
      activeCourses={activeCourses}
      allStudents={allStudents}
    />
  )
}
