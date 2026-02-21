'use client'

/**
 * 스킬 체크 탭 컴포넌트
 *
 * 과정 레벨별 필수 스킬의 완료/미완료를 관리:
 * - 스킬 목록을 체크리스트로 표시
 * - 개별 토글로 완료/취소
 * - 메모 기록 가능
 */

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Circle,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { completeSkill, uncompleteSkill } from '@/app/admin/actions/skills'

interface TabSkillsProps {
  userId: string
  courseLevel: string
  skills: any[]
  onUpdate: () => void
}

// 각 과정 레벨별 예상 스킬 목록
const SKILL_DEFINITIONS: Record<string, { type: string; label: string }[]> = {
  '입문': [
    { type: 'theory', label: '이론 학습' },
    { type: 'static', label: '스태틱 (정적 무호흡)' },
    { type: 'dynamic', label: '다이내믹 (동적 수영)' },
  ],
  '초급': [
    { type: 'theory', label: '이론 학습' },
    { type: 'static', label: '스태틱 (정적 무호흡)' },
    { type: 'dynamic', label: '다이내믹 (동적 수영)' },
    { type: 'depth', label: '수심 다이빙' },
    { type: 'rescue', label: '구조 기술' },
  ],
  '중급': [
    { type: 'theory', label: '이론 학습' },
    { type: 'static', label: '스태틱 (정적 무호흡)' },
    { type: 'dynamic', label: '다이내믹 (동적 수영)' },
    { type: 'depth', label: '수심 다이빙' },
    { type: 'rescue', label: '구조 기술' },
  ],
  '고급': [
    { type: 'theory', label: '이론 학습' },
    { type: 'static', label: '스태틱 (정적 무호흡)' },
    { type: 'dynamic', label: '다이내믹 (동적 수영)' },
    { type: 'depth', label: '수심 다이빙' },
    { type: 'rescue', label: '구조 기술' },
  ],
}

export function TabSkills({
  userId,
  courseLevel,
  skills,
  onUpdate,
}: TabSkillsProps) {
  const [processingSkill, setProcessingSkill] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 이 과정의 스킬 정의 목록
  const skillDefs = SKILL_DEFINITIONS[courseLevel] || SKILL_DEFINITIONS['초급']

  // 기존 스킬 현황을 맵으로 변환
  const skillMap = new Map(
    skills.map((s: any) => [s.skill_type, s])
  )

  // 전체 완료 수 / 총 스킬 수
  const completedCount = skillDefs.filter(
    (def) => skillMap.get(def.type)?.is_completed
  ).length
  const totalCount = skillDefs.length
  const allCompleted = completedCount === totalCount

  /** 스킬 완료 토글 */
  const handleToggleSkill = (skillType: string, isCompleted: boolean) => {
    setProcessingSkill(skillType)
    startTransition(async () => {
      try {
        if (isCompleted) {
          // 완료 → 취소
          const existingSkill = skillMap.get(skillType)
          if (existingSkill) {
            const result = await uncompleteSkill(existingSkill.id)
            if (result.success) {
              toast.success('스킬이 미완료로 변경되었습니다.')
              onUpdate()
            } else {
              toast.error(result.message)
            }
          }
        } else {
          // 미완료 → 완료
          const result = await completeSkill({
            user_id: userId,
            course_level: courseLevel,
            skill_type: skillType as any,
          })
          if (result.success) {
            toast.success('스킬이 완료 처리되었습니다.')
            onUpdate()
          } else {
            toast.error(result.message)
          }
        }
      } catch {
        toast.error('스킬 업데이트 중 오류가 발생했습니다.')
      } finally {
        setProcessingSkill(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* 진행률 요약 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium">
            스킬 완료: {completedCount} / {totalCount}
          </span>
        </div>
        {allCompleted && (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            전체 완료
          </Badge>
        )}
      </div>

      {/* 진행 바 */}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            allCompleted ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* 스킬 목록 */}
      <div className="space-y-2">
        {skillDefs.map((def) => {
          const existing = skillMap.get(def.type)
          const isCompleted = existing?.is_completed || false
          const isProcessing = processingSkill === def.type && isPending

          return (
            <Card
              key={def.type}
              className={`overflow-hidden transition-colors ${
                isCompleted
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-slate-200'
              }`}
            >
              <CardContent className="p-3">
                <button
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => handleToggleSkill(def.type, isCompleted)}
                  disabled={isProcessing}
                >
                  {/* 아이콘 */}
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 flex-shrink-0" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  )}

                  {/* 스킬명 */}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted ? 'text-green-700' : 'text-slate-700'
                      }`}
                    >
                      {def.label}
                    </p>
                    {isCompleted && existing?.completed_at && (
                      <p className="text-xs text-slate-400">
                        완료일:{' '}
                        {new Date(existing.completed_at).toLocaleDateString(
                          'ko-KR'
                        )}
                      </p>
                    )}
                  </div>

                  {/* 완료 뱃지 */}
                  {isCompleted && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-green-300 text-green-600"
                    >
                      완료
                    </Badge>
                  )}
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 전체 미완료 시 경고 */}
      {!allCompleted && completedCount > 0 && (
        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            아직 완료되지 않은 스킬이 있습니다. 자격증 발급 전 모든 스킬을
            완료하는 것을 권장합니다.
          </p>
        </div>
      )}
    </div>
  )
}
