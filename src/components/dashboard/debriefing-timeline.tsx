'use client'

import { MyDebriefing } from '@/app/actions/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  MapPin,
  ExternalLink,
  MessageSquare,
  Award,
  TrendingUp,
  Target,
  Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'

interface DebriefingTimelineProps {
  debriefings: MyDebriefing[]
}

export function DebriefingTimeline({ debriefings }: DebriefingTimelineProps) {
  if (debriefings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center text-center">
          <MessageSquare className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">
            아직 받은 피드백이 없습니다
          </h3>
          <p className="text-slate-500 max-w-sm">
            수업을 완료하면 강사님이 작성해주신 피드백과 사진을 이곳에서 확인할 수
            있습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative space-y-8 pl-4 md:pl-0">
      {/* Timeline Line (Desktop only) */}
      <div className="absolute left-8 top-4 bottom-4 w-px bg-slate-200 hidden md:block" />

      {debriefings.map((debriefing) => (
        <DebriefingTimelineItem key={debriefing.id} debriefing={debriefing} />
      ))}
    </div>
  )
}

function DebriefingTimelineItem({ debriefing }: { debriefing: MyDebriefing }) {
  const classInfo = debriefing.reservation?.classes

  if (!classInfo) return null

  const classDate = new Date(classInfo.date)
  const isRecent =
    new Date().getTime() - new Date(debriefing.created_at).getTime() <
    7 * 24 * 60 * 60 * 1000 // Last 7 days

  return (
    <div className="relative md:pl-20">
      {/* Date Badge (Desktop) */}
      <div className="hidden md:flex flex-col items-center absolute left-0 w-16 pt-1">
        <span className="text-sm font-bold text-slate-900">
          {classDate.getMonth() + 1}월 {classDate.getDate()}일
        </span>
        <span className="text-xs text-slate-500">
          {classDate.getFullYear()}
        </span>
      </div>

      {/* Timeline Dot (Desktop) */}
      <div className="hidden md:block absolute left-8 w-3 h-3 bg-white border-2 border-primary rounded-full -translate-x-1.5 mt-2 z-10" />

      <Card className={`border-l-4 ${isRecent ? 'border-l-primary' : 'border-l-slate-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={isRecent ? 'default' : 'secondary'}>
                  {classInfo.type}
                </Badge>
                <div className="md:hidden text-sm font-medium text-slate-500">
                  {classInfo.date}
                </div>
              </div>
              <CardTitle className="text-lg flex items-center gap-2">
                {classInfo.location} 수업 피드백
              </CardTitle>
            </div>
            
            {classInfo.media_link && (
              <Button asChild variant="outline" size="sm" className="gap-2 shrink-0">
                <Link href={classInfo.media_link} target="_blank" rel="noopener noreferrer">
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600 font-medium">사진 앨범 보기</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </Link>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {classInfo.time} 시작
            </span>
            {debriefing.instructor && (
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  {debriefing.instructor.name[0]}
                </div>
                {debriefing.instructor.name} 강사
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Performance */}
          {debriefing.performance && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
                <Award className="h-4 w-4 text-orange-500" />
                수행 평가
              </h4>
              <p className="text-slate-700 whitespace-pre-wrap ml-6 text-sm leading-relaxed">
                {debriefing.performance}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            {debriefing.strengths && (
              <div className="bg-green-50/50 border border-green-100 rounded-lg p-4">
                <h4 className="flex items-center gap-2 font-semibold text-green-800 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  잘한 점
                </h4>
                <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {debriefing.strengths}
                </p>
              </div>
            )}

            {/* Improvement */}
            {debriefing.improvement && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                <h4 className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  개선 포인트
                </h4>
                <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {debriefing.improvement}
                </p>
              </div>
            )}
          </div>

          {/* Next Goal */}
          {debriefing.next_goal && (
            <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-4 mt-2">
              <h4 className="flex items-center gap-2 font-semibold text-yellow-800 mb-2">
                <Target className="h-4 w-4 text-yellow-600" />
                다음 목표
              </h4>
              <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                {debriefing.next_goal}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
