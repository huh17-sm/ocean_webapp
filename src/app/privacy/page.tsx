import { Metadata } from 'next'
import { PolicyLayout } from '@/components/layout/policy-layout'

export const metadata: Metadata = {
  title: '개인정보처리방침 - Ocean Freediving',
  description: 'Ocean Freediving 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <PolicyLayout title="개인정보처리방침" lastUpdated="2026년 2월 11일">
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">개인정보처리방침</h2>
          <p className="text-slate-600">
            현재 개인정보처리방침을 작성 중입니다.
            <br />
            법무 검토 후 정식 내용이 업데이트될 예정입니다.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">임시 안내</h3>
          <p className="text-sm text-blue-800">
            Ocean Freediving은 개인정보보호법에 따라 회원의 개인정보를 안전하게 보호하고 있습니다.
            수집하는 개인정보의 항목, 이용 목적, 보유 기간 등에 대한 상세한 내용이 곧 공개될 예정입니다.
          </p>
        </div>
      </div>
    </PolicyLayout>
  )
}
