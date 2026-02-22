'use client'

import { SkillCompletion } from '@/app/actions/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle } from 'lucide-react'
import { SKILL_DEFINITIONS } from '@/lib/constants'

interface SkillCompletionsCardProps {
  skills: SkillCompletion[]
}



const levelLabels: Record<string, string> = {
  입문: '입문',
  초급: '초급',
  중급: '중급',
  고급: '고급',
}

export function SkillCompletionsCard({ skills }: SkillCompletionsCardProps) {
  if (skills.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-slate-500 py-8">
            아직 체크된 스킬이 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  // 코스 레벨별로 그룹화
  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.course_level]) {
      acc[skill.course_level] = []
    }
    acc[skill.course_level].push(skill)
    return acc
  }, {} as Record<string, SkillCompletion[]>)

  return (
    <div className="space-y-4">
      {Object.entries(groupedSkills).map(([level, levelSkills]) => {
        const completedCount = levelSkills.filter((s) => s.is_completed).length
        const totalCount = levelSkills.length

        return (
          <Card key={level}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  {levelLabels[level] || level} 과정
                </CardTitle>
                <Badge variant={completedCount === totalCount ? 'secondary' : 'outline'}>
                  {completedCount}/{totalCount} 완료
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {levelSkills.map((skill) => {
                  const defaultLabel = (SKILL_DEFINITIONS[level] || SKILL_DEFINITIONS['초급'])?.find(sd => sd.type === skill.skill_type)?.label || skill.skill_type

                  return (
                    <div
                      key={skill.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        skill.is_completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {skill.is_completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {defaultLabel}
                        </p>
                        {skill.is_completed && skill.completed_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(skill.completed_at).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                        {skill.notes && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {skill.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
