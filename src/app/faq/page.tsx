import { Metadata } from 'next'
import { PolicyLayout } from '@/components/layout/policy-layout'

export const metadata: Metadata = {
  title: '자주 묻는 질문 - Ocean Freediving',
  description: 'Ocean Freediving 자주 묻는 질문 (FAQ)',
}

export default function FAQPage() {
  return (
    <PolicyLayout title="자주 묻는 질문 (FAQ)">
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">❓</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">자주 묻는 질문</h2>
          <p className="text-slate-600">
            현재 FAQ 내용을 작성 중입니다.
            <br />
            회원님들의 질문을 수집하여 곧 업데이트될 예정입니다.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">임시 안내</h3>
          <p className="text-sm text-blue-800 mb-4">
            자주 묻는 질문 페이지는 준비 중입니다.
            궁금하신 사항이 있으시면 문의하기를 통해 연락 주시기 바랍니다.
          </p>
          <p className="text-sm text-blue-800">
            <strong>예정된 주제:</strong> 예약 방법, 크레딧 사용법, 수업 일정, 환불 정책,
            필요한 준비물, 자격증 취득 과정 등
          </p>
        </div>
      </div>
    </PolicyLayout>
  )
}
