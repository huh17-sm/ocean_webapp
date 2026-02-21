import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getMyProgressSummary } from '@/app/actions/progress'
import { ProgressView } from '@/components/dashboard/progress-view'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

// 캐싱 방지
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProgressPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  // 진도 데이터 가져오기
  const progressData = await getMyProgressSummary()

  return (
    <div className="container mx-auto p-6 max-w-4xl pb-20">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">📚 내 진도</h1>
          <p className="text-slate-500 mt-2">
            {profile?.name}님의 교육 진도와 스킬 현황
          </p>
        </div>
      </div>

      <ProgressView progressData={progressData} />
    </div>
  )
}
