import { getMyDebriefings } from '@/app/actions/progress'
import { DebriefingTimeline } from '@/components/dashboard/debriefing-timeline'
import { Separator } from '@/components/ui/separator'

export const metadata = {
  title: '내 디브리핑 | Ocean Freediving',
  description: '수업 피드백과 미디어 링크를 확인하세요.',
}

export default async function DebriefingsPage() {
  const debriefings = await getMyDebriefings()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">내 디브리핑</h3>
        <p className="text-sm text-slate-500">
          지난 수업의 피드백과 사진/영상 링크를 모아볼 수 있습니다.
        </p>
      </div>
      <Separator />
      <DebriefingTimeline debriefings={debriefings} />
    </div>
  )
}
