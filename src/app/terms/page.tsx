import { Metadata } from 'next'
import { PolicyLayout } from '@/components/layout/policy-layout'
import { FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: '이용약관 - Ocean Freediving',
  description: 'Ocean Freediving 서비스 이용약관',
}

export default function TermsPage() {
  return (
    <PolicyLayout title="이용약관" lastUpdated="2026년 2월 11일">
      <div className="space-y-6">
        <div className="text-center py-12 flex flex-col items-center">
          <FileText className="h-16 w-16 text-slate-600 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">이용약관</h2>
          <p className="text-slate-600">
            현재 약관 내용을 작성 중입니다.
            <br />
            법무 검토 후 정식 내용이 업데이트될 예정입니다.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">임시 안내</h3>
          <p className="text-sm text-blue-800">
            Ocean Freediving 서비스를 이용하시기 전에 반드시 이용약관을 확인해 주시기 바랍니다.
            본 약관은 서비스 이용과 관련된 권리, 의무 및 책임사항을 규정하고 있습니다.
          </p>
        </div>
      </div>
    </PolicyLayout>
  )
}
