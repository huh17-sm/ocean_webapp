'use client'

import { useState } from 'react'
import { MyDebriefing } from '@/app/actions/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Calendar,
  ChevronDown,
  ExternalLink,
  MapPin,
  MessageSquare,
  Award,
  TrendingUp,
  Target,
  GraduationCap,
  Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import { CLASS_TYPES } from '@/lib/constants'

interface DebriefingTimelineProps {
  debriefings: MyDebriefing[]
}

/**
 * 디브리핑 목록을 아코디언(접이식) 형태로 표시하는 컴포넌트
 * - 접힌 상태: 수업 유형 뱃지 + 제목 + 날짜 + 미디어 링크
 * - 펼친 상태: 수행 평가 / 잘한 점 / 개선 포인트 / 다음 목표
 */
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
    <div className="space-y-3">
      {debriefings.map((debriefing) => (
        <DebriefingAccordionItem key={debriefing.id} debriefing={debriefing} />
      ))}
    </div>
  )
}

/**
 * 개별 디브리핑 아코디언 아이템
 * 클릭하면 상세 피드백 내용이 펼쳐진다
 */
function DebriefingAccordionItem({ debriefing }: { debriefing: MyDebriefing }) {
  const [isOpen, setIsOpen] = useState(false)
  const classInfo = debriefing.reservation?.classes

  if (!classInfo) return null

  const classDate = new Date(classInfo.date)
  const isRecent =
    new Date().getTime() - new Date(debriefing.created_at).getTime() <
    7 * 24 * 60 * 60 * 1000 // 최근 7일 이내

  // 피드백 내용이 있는지 확인 (하나라도 있으면 true)
  const hasContent = !!(
    debriefing.performance ||
    debriefing.strengths ||
    debriefing.improvement ||
    debriefing.next_goal
  )

  return (
    <Card className={`transition-shadow ${isOpen ? 'shadow-md' : 'hover:shadow-sm'} ${isRecent ? 'border-l-4 border-l-blue-500' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* 접힌 상태에서 보이는 헤더 영역 */}
        <CollapsibleTrigger className="w-full text-left" disabled={!hasContent}>
          <div className={`p-4 ${hasContent ? 'cursor-pointer hover:bg-slate-50/50' : ''} transition-colors`}>
            <div className="flex items-start gap-4">
              {/* 왼쪽: 날짜 블록 — 눈에 띄게 크게 표시 */}
              <div className={`flex flex-col items-center justify-center rounded-xl w-14 h-14 shrink-0 ${isRecent ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                <span className="text-[11px] font-semibold leading-none">
                  {classDate.getMonth() + 1}월
                </span>
                <span className="text-xl font-bold leading-tight">
                  {classDate.getDate()}
                </span>
                <span className="text-[9px] text-slate-400 leading-none">
                  {classDate.getFullYear()}
                </span>
              </div>

              {/* 오른쪽: 수업 정보 */}
              <div className="flex-1 min-w-0">
                {/* 뱃지 행 */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                  <Badge variant={isRecent ? 'default' : 'secondary'} className="text-xs">
                    {CLASS_TYPES[classInfo.type as keyof typeof CLASS_TYPES] || classInfo.type}
                  </Badge>
                  {classInfo.media_link && (
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      사진
                    </Badge>
                  )}
                  {!hasContent && (
                    <Badge variant="outline" className="text-xs text-slate-400 border-slate-200">
                      피드백 미작성
                    </Badge>
                  )}
                </div>

                {/* 제목 */}
                <h3 className="font-bold text-[15px] text-slate-800 truncate">
                  {classInfo.title || classInfo.location}
                </h3>

                {/* 장소 + 시간 + 강사 */}
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                  {classInfo.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {classInfo.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {classInfo.time?.substring(0, 5)} 시작
                  </span>
                  {debriefing.instructor && (
                    <span className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                        {debriefing.instructor.name[0]}
                      </div>
                      {debriefing.instructor.name} 강사
                    </span>
                  )}
                </div>
              </div>

              {/* 오른쪽 끝: 미디어 버튼 + 화살표 */}
              <div className="flex items-center gap-2 shrink-0 pt-1">
                {classInfo.media_link && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={classInfo.media_link} target="_blank" rel="noopener noreferrer">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                      <span className="hidden sm:inline text-blue-600 font-medium">앨범</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </Link>
                  </Button>
                )}
                {hasContent && (
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        {/* 펼쳐졌을 때 보이는 상세 피드백 영역 */}
        {hasContent && (
          <CollapsibleContent>
            <CardContent className="pt-0 pb-5 px-4 space-y-3">
              <div className="h-px bg-slate-100 w-full mb-1" />

              {/* 수행 평가 */}
              {debriefing.performance && (
                <div className="bg-slate-50 rounded-lg p-3.5">
                  <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-1.5 text-sm">
                    <Award className="h-4 w-4 text-orange-500" />
                    수행 평가
                  </h4>
                  <p className="text-slate-700 whitespace-pre-wrap ml-6 text-sm leading-relaxed">
                    {debriefing.performance}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 잘한 점 */}
                {debriefing.strengths && (
                  <div className="bg-green-50/50 border border-green-100 rounded-lg p-3.5">
                    <h4 className="flex items-center gap-2 font-semibold text-green-800 mb-1.5 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      잘한 점
                    </h4>
                    <p className="text-slate-700 whitespace-pre-wrap ml-6 text-sm leading-relaxed">
                      {debriefing.strengths}
                    </p>
                  </div>
                )}

                {/* 개선 포인트 */}
                {debriefing.improvement && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3.5">
                    <h4 className="flex items-center gap-2 font-semibold text-blue-800 mb-1.5 text-sm">
                      <Target className="h-4 w-4 text-blue-600" />
                      개선 포인트
                    </h4>
                    <p className="text-slate-700 whitespace-pre-wrap ml-6 text-sm leading-relaxed">
                      {debriefing.improvement}
                    </p>
                  </div>
                )}
              </div>

              {/* 다음 목표 */}
              {debriefing.next_goal && (
                <div className="bg-yellow-50/50 border border-yellow-100 rounded-lg p-3.5">
                  <h4 className="flex items-center gap-2 font-semibold text-yellow-800 mb-1.5 text-sm">
                    <GraduationCap className="h-4 w-4 text-yellow-600" />
                    다음 목표
                  </h4>
                  <p className="text-slate-700 whitespace-pre-wrap ml-6 text-sm leading-relaxed">
                    {debriefing.next_goal}
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  )
}
