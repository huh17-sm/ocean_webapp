import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CertificatesManagement } from '@/components/admin/certificates-management'
import { getAllCertificates, getPendingCertificates } from '@/app/admin/actions/certificates-v2'

// 캐싱 방지
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminCertificatesV2Page() {
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

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // 대기 중인 자격증과 전체 자격증 가져오기
  const [pendingCertificates, allCertificates] = await Promise.all([
    getPendingCertificates(),
    getAllCertificates(),
  ])

  return (
    <div className="container mx-auto p-6 max-w-7xl pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">자격증 관리 (v2)</h1>
        <p className="text-slate-500 mt-2">
          자격증 신청을 승인하고 발급 처리하세요
        </p>
      </div>

      <CertificatesManagement
        pendingCertificates={pendingCertificates}
        allCertificates={allCertificates}
      />
    </div>
  )
}
