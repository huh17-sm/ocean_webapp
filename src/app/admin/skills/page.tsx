import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SkillManagementTable } from '@/components/admin/skill-management-table'
import { CourseProgressManagement } from '@/components/admin/course-progress-management'
import { CheckCircle2, BookOpen } from 'lucide-react'

// 캐싱 방지
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminSkillsPage() {
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

  if (!profile || !['instructor', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // 학생 목록 가져오기
  const { data: students } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'user')
    .order('name', { ascending: true })

  return (
    <div className="container mx-auto p-6 max-w-7xl pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">스킬 체크 관리</h1>
        <p className="text-slate-500 mt-2">
          학생들의 스킬 완료 현황을 관리하고 코스 진도를 업데이트하세요
        </p>
      </div>

      <div className="space-y-8">
        {/* 스킬 체크 관리 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" /> 스킬 체크
          </h2>
          <SkillManagementTable students={students || []} />
        </section>

        {/* 코스 진도 관리 */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-500" /> 코스 진도 관리
          </h2>
          <CourseProgressManagement students={students || []} />
        </section>
      </div>
    </div>
  )
}
