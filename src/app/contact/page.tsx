import { Metadata } from 'next'
import { PolicyLayout } from '@/components/layout/policy-layout'

export const metadata: Metadata = {
  title: '문의하기 - Ocean Freediving',
  description: 'Ocean Freediving 문의 및 고객 지원',
}

export default function ContactPage() {
  return (
    <PolicyLayout title="문의하기">
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">문의하기</h2>
          <p className="text-slate-600">
            현재 문의 폼을 준비 중입니다.
            <br />
            당분간 아래 연락처로 문의해 주시기 바랍니다.
          </p>
        </div>

        <div className="bg-slate-50 border rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">📧 이메일</h3>
            <p className="text-slate-700">contact@oceanfreediving.com</p>
            <p className="text-sm text-slate-500 mt-1">영업일 기준 24시간 내 답변 드립니다.</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">📱 카카오톡</h3>
            <p className="text-slate-700">@oceanfreediving</p>
            <p className="text-sm text-slate-500 mt-1">평일 10:00 - 18:00 실시간 상담</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">📞 전화</h3>
            <p className="text-slate-700">02-1234-5678</p>
            <p className="text-sm text-slate-500 mt-1">평일 10:00 - 18:00 (점심시간 12:00 - 13:00)</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">임시 안내</h3>
          <p className="text-sm text-blue-800">
            온라인 문의 폼 기능은 개발 중입니다.
            향후 카테고리별 문의, 파일 첨부, 문의 내역 조회 등의 기능이 제공될 예정입니다.
          </p>
        </div>
      </div>
    </PolicyLayout>
  )
}
