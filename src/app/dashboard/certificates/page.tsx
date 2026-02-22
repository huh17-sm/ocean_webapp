import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CertificatesView } from '@/components/dashboard/certificates-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CertificatesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 내 자격증 조회
  const { data: certificates } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 내 진도 조회 (자격증 신청 가능 여부 확인용)
  const { data: courseProgress } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 내 프로필 (크레딧 확인용)
  const { data: profile } = await supabase
    .from('profiles')
    .select('general_credits, credits')
    .eq('id', user.id)
    .single()

  return (
    <CertificatesView
      certificates={certificates || []}
      courseProgress={courseProgress || []}
      userCredits={Math.max(profile?.general_credits || 0, profile?.credits || 0)}
    />
  )
}
