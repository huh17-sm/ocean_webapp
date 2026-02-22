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
  MessageSquare,
  MessageSquareHeart
} from 'lucide-react'
import { toast } from 'sonner'
import { completeSkill, uncompleteSkill, updateSkillNote } from '@/app/admin/actions/skills'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { SKILL_DEFINITIONS } from '@/lib/constants'

interface TabSkillsProps {
  userId: string
  courseLevel: string
  skills: any[]
  requiredSkills?: { type: string; requirement: string }[]
  onUpdate: () => void
}

export function TabSkills({
  userId,
  courseLevel,
  skills,
  requiredSkills,
  onUpdate,
}: TabSkillsProps) {
  const [processingSkill, setProcessingSkill] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')

  const SKILL_ORDER = ['theory', 'static', 'dynamic', 'depth', 'rescue']

  // 이 과정의 스킬 정의 목록 (requiredSkills가 있으면 그것을, 없으면 기존 하드코딩 맵 사용)
  const skillDefs: Array<{ type: string; label: string; requirement?: string }> = requiredSkills && requiredSkills.length > 0
    ? requiredSkills.map(s => {
        const defaultLabel = (SKILL_DEFINITIONS[courseLevel] || SKILL_DEFINITIONS['초급'])?.find(sd => sd.type === s.type)?.label || s.type
        return { type: s.type, label: defaultLabel, requirement: s.requirement }
      }).sort((a, b) => {
        const orderA = SKILL_ORDER.indexOf(a.type)
        const orderB = SKILL_ORDER.indexOf(b.type)
        return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB)
      })
    : SKILL_DEFINITIONS[courseLevel] || SKILL_DEFINITIONS['초급']

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

  const handleSaveNote = (skillType: string) => {
    // startTransition 안배고 바로 서버 액션 호출해도 됩니다
    setProcessingSkill(skillType)
    startTransition(async () => {
      try {
        const result = await updateSkillNote({
          user_id: userId,
          course_level: courseLevel,
          skill_type: skillType as any,
          notes: noteContent
        })
        if (result.success) {
          toast.success('메모가 저장되었습니다.')
          setEditingNoteFor(null)
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch (error) {
        toast.error('메모 저장 중 오류가 발생했습니다.')
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
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
                  onClick={() => handleToggleSkill(def.type, isCompleted)}
                  disabled={isProcessing}
                >
                  {/* 아이콘 */}
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500 shrink-0" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                  )}

                  {/* 스킬명 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          isCompleted ? 'text-green-700' : 'text-slate-700'
                        }`}
                      >
                        {def.label}
                      </p>
                      {/* 목표 기준치 표시 */}
                      {'requirement' in def && def.requirement && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border">
                          목표: {def.requirement}
                        </span>
                      )}
                    </div>
                    {isCompleted && existing?.completed_at && (
                      <p className="text-xs text-slate-400">
                        완료일:{' '}
                        {new Date(existing.completed_at).toLocaleDateString(
                          'ko-KR'
                        )}
                      </p>
                    )}
                    {existing?.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic border-l-2 border-slate-200 pl-2">
                        {existing.notes}
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
                
                {/* 메모 작성 팝오버 */}
                <div className="flex gap-2">
                  <Popover 
                    open={editingNoteFor === def.type} 
                    onOpenChange={(open) => {
                      if (open) {
                        setNoteContent(existing?.notes || '')
                        setEditingNoteFor(def.type)
                      } else {
                        setEditingNoteFor(null)
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-500 shrink-0">
                        {existing?.notes ? (
                          <MessageSquareHeart className="h-4 w-4 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">메모 작성 ({def.label})</h4>
                        <Textarea 
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="스킬 수행 관련 특이사항이나 메모를 남겨주세요."
                          className="text-sm min-h-[100px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditingNoteFor(null)}>취소</Button>
                          <Button size="sm" onClick={() => handleSaveNote(def.type)} disabled={isPending}>
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : null}
                            저장
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 전체 미완료 시 경고 */}
      {!allCompleted && completedCount > 0 && (
        <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            아직 완료되지 않은 스킬이 있습니다. 자격증 발급 전 모든 스킬을
            완료하는 것을 권장합니다.
          </p>
        </div>
      )}
    </div>
  )
}
