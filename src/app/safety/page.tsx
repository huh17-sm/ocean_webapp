import { Metadata } from 'next'
import { PolicyLayout } from '@/components/layout/policy-layout'

export const metadata: Metadata = {
  title: '안전 고지사항 - Ocean Freediving',
  description: 'Ocean Freediving 프리다이빙 안전 수칙 및 고지사항',
}

export default function SafetyPage() {
  return (
    <PolicyLayout title="안전 고지사항" lastUpdated="2026년 2월 11일">
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">프리다이빙 안전 고지사항</h2>
          <p className="text-slate-600">
            현재 안전 고지사항을 작성 중입니다.
            <br />
            전문가 검토 후 정식 내용이 업데이트될 예정입니다.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-2">중요 안전 수칙</h3>
          <ul className="text-sm text-red-800 space-y-2">
            <li>• 절대 혼자 프리다이빙하지 마세요 (Never dive alone)</li>
            <li>• 자신의 한계를 인지하고 무리하지 마세요</li>
            <li>• 수업 전 건강 상태를 반드시 확인하세요</li>
            <li>• 강사의 지시를 정확히 따라주세요</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">임시 안내</h3>
          <p className="text-sm text-blue-800">
            프리다이빙은 안전 수칙을 준수해야 하는 수중 스포츠입니다.
            자세한 안전 지침, 응급 상황 대처 방법, 의료적 주의사항 등이 곧 공개될 예정입니다.
          </p>
        </div>
      </div>
    </PolicyLayout>
  )
}
