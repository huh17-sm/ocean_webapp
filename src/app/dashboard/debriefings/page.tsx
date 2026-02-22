import { getMyDebriefings } from '@/app/actions/progress'
import { DebriefingTimeline } from '@/components/dashboard/debriefing-timeline'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare } from 'lucide-react'

export const metadata = {
  title: '내 디브리핑 | Ocean Freediving',
  description: '수업 피드백과 미디어 링크를 확인하세요.',
}

export default async function DebriefingsPage() {
  const debriefings = await getMyDebriefings()

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-500" />
            내 디브리핑
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            지난 수업의 피드백과 사진/영상 링크를 모아볼 수 있습니다.
          </p>
        </div>
      </div>

      <Separator />
      
      <div className="pt-4">
        <DebriefingTimeline debriefings={debriefings} />
      </div>
    </div>
  )
}
