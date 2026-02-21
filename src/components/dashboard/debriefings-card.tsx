'use client'

import { MyDebriefing } from '@/app/actions/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Calendar, MapPin } from 'lucide-react'
import { useState } from 'react'

interface DebriefingsCardProps {
  debriefings: MyDebriefing[]
}

export function DebriefingsCard({ debriefings }: DebriefingsCardProps) {
  if (debriefings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-slate-500 py-8">
            아직 피드백이 작성된 수업이 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {debriefings.map((debriefing) => (
        <DebriefingItem key={debriefing.id} debriefing={debriefing} />
      ))}
    </div>
  )
}

function DebriefingItem({ debriefing }: { debriefing: MyDebriefing }) {
  const [isOpen, setIsOpen] = useState(false)
  const classInfo = debriefing.reservation?.classes

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex justify-between items-start">
              <div className="flex-1 text-left">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {classInfo && (
                    <>
                      <Badge variant="outline">{classInfo.type}</Badge>
                      <span>수업 피드백</span>
                    </>
                  )}
                </CardTitle>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                  {classInfo && (
                    <>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(classInfo.date).toLocaleDateString('ko-KR')} {classInfo.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {classInfo.location}
                      </span>
                    </>
                  )}
                </div>
                {debriefing.instructor && (
                  <p className="text-xs text-slate-500 mt-1">
                    강사: {debriefing.instructor.name}
                  </p>
                )}
              </div>
              <ChevronDown
                className={`h-5 w-5 text-slate-400 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {debriefing.performance && (
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">
                  🎯 수행 평가
                </h4>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md whitespace-pre-wrap">
                  {debriefing.performance}
                </p>
              </div>
            )}

            {debriefing.strengths && (
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">
                  ✨ 잘한 점
                </h4>
                <p className="text-sm text-slate-600 bg-green-50 p-3 rounded-md whitespace-pre-wrap">
                  {debriefing.strengths}
                </p>
              </div>
            )}

            {debriefing.improvement && (
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">
                  📈 개선 포인트
                </h4>
                <p className="text-sm text-slate-600 bg-blue-50 p-3 rounded-md whitespace-pre-wrap">
                  {debriefing.improvement}
                </p>
              </div>
            )}

            {debriefing.next_goal && (
              <div>
                <h4 className="font-semibold text-sm text-slate-700 mb-2">
                  🎓 다음 목표
                </h4>
                <p className="text-sm text-slate-600 bg-yellow-50 p-3 rounded-md whitespace-pre-wrap">
                  {debriefing.next_goal}
                </p>
              </div>
            )}

            <div className="text-xs text-slate-400 pt-2 border-t">
              작성일: {new Date(debriefing.created_at).toLocaleDateString('ko-KR')}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
