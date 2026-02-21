import { Metadata } from 'next'
import { PolicyLayout } from '@/components/layout/policy-layout'

export const metadata: Metadata = {
  title: '앱 정보 - Ocean Freediving',
  description: 'Ocean Freediving 앱 정보 및 버전',
}

export default function AboutPage() {
  return (
    <PolicyLayout title="앱 정보">
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">ℹ️</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ocean Freediving</h2>
          <p className="text-slate-600 mb-4">프리다이빙 교육 및 예약 플랫폼</p>
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full font-semibold">
            Version 1.0.0 (Beta)
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 border rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-3">기술 스택</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-slate-700">프론트엔드:</span>
                <p className="text-slate-600">Next.js 16 + React 19</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">스타일링:</span>
                <p className="text-slate-600">Tailwind CSS 4</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">백엔드:</span>
                <p className="text-slate-600">Supabase</p>
              </div>
              <div>
                <span className="font-medium text-slate-700">UI 컴포넌트:</span>
                <p className="text-slate-600">Radix UI (shadcn/ui)</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-3">주요 기능</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>✓ 프리다이빙 수업 예약 및 관리</li>
              <li>✓ 크레딧 기반 결제 시스템</li>
              <li>✓ 학습 진도 추적</li>
              <li>✓ 자격증 관리</li>
              <li>✓ 실시간 알림</li>
              <li>✓ 관리자 대시보드</li>
            </ul>
          </div>

          <div className="bg-slate-50 border rounded-lg p-6">
            <h3 className="font-semibold text-slate-900 mb-3">개발 정보</h3>
            <div className="text-sm text-slate-700 space-y-1">
              <p><span className="font-medium">개발:</span> Ocean Freediving Team</p>
              <p><span className="font-medium">런칭:</span> 2026년 2월</p>
              <p><span className="font-medium">라이선스:</span> Proprietary</p>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-slate-400 pt-6 border-t">
          <p>© 2026 Ocean Freediving. All rights reserved.</p>
        </div>
      </div>
    </PolicyLayout>
  )
}
