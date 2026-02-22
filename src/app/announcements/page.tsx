import { Metadata } from 'next'
import { PolicyLayout } from '@/components/layout/policy-layout'
import { Megaphone } from 'lucide-react'

export const metadata: Metadata = {
  title: '공지사항 - Ocean Freediving',
  description: 'Ocean Freediving 공지사항 및 새로운 소식',
}

export default function AnnouncementsPage() {
  return (
    <PolicyLayout title="공지사항">
      <div className="space-y-6">
        <div className="text-center py-12 flex flex-col items-center">
          <Megaphone className="h-16 w-16 text-blue-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">공지사항</h2>
          <p className="text-slate-600">
            현재 공지사항이 없습니다.
            <br />
            새로운 소식이 있으면 이곳에 게시됩니다.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">임시 안내</h3>
          <p className="text-sm text-blue-800">
            공지사항 관리 시스템은 개발 중입니다.
            향후 중요한 공지, 수업 일정 변경, 이벤트 안내 등이 이곳에 게시될 예정입니다.
          </p>
        </div>
      </div>
    </PolicyLayout>
  )
}
