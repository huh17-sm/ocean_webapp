'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Award, MessageSquareHeart, AlertCircle, XCircle, AlertTriangle, Trophy } from 'lucide-react'
import type { MyProgressSummary } from '@/app/actions/progress'
import { SKILL_DEFINITIONS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { applyCertificate } from '@/app/admin/actions/certificates-v2'

interface ProgressViewProps {
  progressData: MyProgressSummary
}

const levelLabels: Record<string, string> = {
  입문: '입문',
  초급: '초급',
  중급: '중급',
  고급: '고급',
}

export function ProgressView({ progressData }: ProgressViewProps) {
  const [expandedSection, setExpandedSection] = useState<string>('current')
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // 현재 진행 중인 과정, 완료된 과정, pending 신청 분리
  const pendingApplications = progressData.courseProgress.filter(
    (c) => c.status === 'pending'
  )
  const currentCourses = progressData.courseProgress.filter(
    (c) => c.status === 'in_progress'
  )
  const completedCourses = progressData.courseProgress.filter(
    (c) => c.status === 'completed'
  )
  const droppedCourses = progressData.courseProgress.filter(
    (c) => c.status === 'dropped'
  )

  const currentCourse = currentCourses[0]
  const currentLevel = currentCourse?.course_level
  const currentSkills = progressData.skillCompletions.filter(
    (s) => s.course_level === currentLevel
  )

  const existingCertificate = progressData.certificates
    ?.filter((c) => c.certificate_level === currentLevel)
    ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  
  const isRejected = existingCertificate?.status === 'rejected'
  // 거절된 상태면 신청이 접수되었거나 발급된 상태가 아님 -> 재신청 가능
  const isAppliedOrIssued = existingCertificate && ['pending', 'approved', 'issued'].includes(existingCertificate.status)

  const SKILL_ORDER = ['theory', 'static', 'dynamic', 'depth', 'rescue']

  // 표시할 전체 스킬 목록 생성 (DB에 정의된 필수 스킬 우선, 없으면 하드코딩된 정의 사용)
  const skillDefs: Array<{ type: string; label: string; requirement?: string }> = currentCourse?.required_skills && currentCourse.required_skills.length > 0
    ? currentCourse.required_skills.map((s: { type: string; requirement?: string }) => {
        const defaultLabel = (SKILL_DEFINITIONS[currentLevel] || SKILL_DEFINITIONS['초급'])?.find((sd: { type: string; label: string }) => sd.type === s.type)?.label || s.type
        return { type: s.type, label: defaultLabel, requirement: s.requirement }
      }).sort((a: { type: string }, b: { type: string }) => {
        const orderA = SKILL_ORDER.indexOf(a.type)
        const orderB = SKILL_ORDER.indexOf(b.type)
        return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB)
      })
    : SKILL_DEFINITIONS[currentLevel] || SKILL_DEFINITIONS['초급'] || []

  // 스킬 완료 현황 맵
  const skillMap = new Map(currentSkills.map(s => [s.skill_type, s]))

  // 완료된 스킬 개수 (전체 스킬 목록 기준)
  const completedSkillsCount = skillDefs.filter((def: { type: string }) => skillMap.get(def.type as any)?.is_completed).length
  const allSkillsCompleted = skillDefs.length > 0 && completedSkillsCount === skillDefs.length

  const handleApplyCertificate = () => {
    if (!currentLevel) return

    startTransition(async () => {
      const result = await applyCertificate({
        certificate_level: currentLevel,
      })

      if (result.success) {
        toast({
          title: '자격증 신청 완료',
          description: result.message,
        })
      } else {
        toast({
          title: '신청 실패',
          description: result.message,
          variant: 'destructive',
        })
      }
    })
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section)
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="in_progress" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="in_progress">진행중인 과정</TabsTrigger>
          <TabsTrigger value="completed">수료한 과정</TabsTrigger>
          <TabsTrigger value="dropped">만료된 과정</TabsTrigger>
        </TabsList>

        <TabsContent value="in_progress" className="space-y-6">
          {/* 신청 대기중 */}
          {pendingApplications.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>⏳ 과정 신청 승인 대기중</span>
                  <Badge variant="secondary">{pendingApplications.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingApplications.map((application) => (
                    <div
                      key={application.id}
                      className="p-3 bg-white rounded-lg border border-amber-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">
                            {levelLabels[application.course_level] || application.course_level} 과정
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            신청일: {new Date(application.applied_at || application.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-amber-100">
                          승인 대기
                        </Badge>
                      </div>
                      <p className="text-xs text-amber-700 mt-2">
                        관리자의 승인을 기다리고 있습니다.
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 현재 과정 */}
          {currentCourses.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <span>📖 현재 수강 과정</span>
                    <Badge variant="default">진행중</Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {currentCourses.map((course) => {
                  // 진도 계산 로직
                  const minPoolSessions = course.session_count || 3
                  const totalSteps = 1 + minPoolSessions
                  const currentSteps = (course.theory_completed ? 1 : 0) + course.pool_sessions_completed
                  const completedPercentage = Math.min((currentSteps / totalSteps) * 100, 100)

                  return (
                    <div key={course.id} className="space-y-6">
                      {/* 1. 과정 진행 현황 */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold text-blue-700">
                            {levelLabels[course.course_level] || course.course_level} 과정
                          </h3>
                          <span className="text-sm font-bold text-slate-700">
                            {Math.round(completedPercentage)}% 완료
                          </span>
                        </div>
                        <Progress value={completedPercentage} className="h-2.5 mb-4" />

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50 shadow-sm">
                            {course.theory_completed ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : (
                              <Circle className="h-6 w-6 text-slate-300" />
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800">이론 교육</p>
                              <p className="text-xs text-slate-500 font-medium">
                                {course.theory_completed ? '완료됨' : '미완료'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50 shadow-sm">
                            <div className={`h-6 w-6 flex flex-shrink-0 items-center justify-center text-xs font-bold rounded-full ${course.pool_sessions_completed >= minPoolSessions ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {course.pool_sessions_completed}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">풀장 세션</p>
                              <p className="text-xs text-slate-500 font-medium">
                                {course.pool_sessions_completed}회 완료 / {minPoolSessions}회
                              </p>
                            </div>
                          </div>
                        </div>

                        {course.notes && (
                          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
                            <p className="text-sm text-slate-700">{course.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-slate-100 w-full" />

                      {/* 2. 스킬 체크리스트 (종속) */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-base flex items-center gap-2">
                            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> 스킬 체크리스트</span>
                            <Badge variant={allSkillsCompleted ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0 h-4">
                              {completedSkillsCount}/{skillDefs.length} 완료
                            </Badge>
                          </h4>
                        </div>
                        
                        <div className="space-y-3">
                          {skillDefs.map((def: { type: string; label: string; requirement?: string }) => {
                            const existingRecord = skillMap.get(def.type as any)
                            const isCompleted = !!existingRecord?.is_completed

                            return (
                              <div
                                key={def.type}
                                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                                  isCompleted
                                    ? 'bg-green-50/50 border-green-200'
                                    : 'bg-white border-slate-200 shadow-sm'
                                }`}
                              >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-slate-200 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-[15px] text-slate-800">
                                      {def.label}
                                    </p>
                                    {'requirement' in def && def.requirement && (
                                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-bold tracking-tight">
                                        목표: {def.requirement}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {isCompleted ? (
                                      <p className="text-[11px] font-medium text-green-700/70 mb-2">
                                        완료일: {existingRecord?.completed_at ? new Date(existingRecord.completed_at).toLocaleDateString('ko-KR') : '-'}
                                      </p>
                                  ) : !existingRecord?.notes && (
                                    <p className="text-xs font-medium text-slate-400">
                                      아직 완료되지 않았습니다.
                                    </p>
                                  )}

                                  {existingRecord?.notes && (
                                    <div className="mt-2 text-sm text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-lg flex items-start gap-2 shadow-inner">
                                      <MessageSquareHeart className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                      <p className="flex-1 leading-snug break-keep text-[13px] text-slate-700 font-medium">
                                        {existingRecord.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* 3. 자격증 신청 영역 */}
                      <div className="pt-4 border-t border-slate-100">
                        {isRejected && (
                          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 flex-col sm:flex-row shadow-sm">
                            <div className="flex items-center gap-2 text-red-700 shrink-0 font-bold mb-1 sm:mb-0">
                               <AlertCircle className="w-5 h-5" />
                               <span>자격증 반려 안내</span>
                            </div>
                            <div className="text-sm text-red-800 bg-white/60 p-2 rounded border border-red-100 flex-1 w-full">
                                <span className="font-semibold block mb-1">사유:</span>
                                {existingCertificate.rejection_reason || '조건 미충족으로 자격증 발급이 반려되었습니다. 스킬을 보완해주세요.'}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <Button
                            className={`w-full font-bold shadow-sm ${allSkillsCompleted && !isAppliedOrIssued ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                            size="lg"
                            variant={isAppliedOrIssued ? "outline" : (allSkillsCompleted ? "default" : "secondary")}
                            onClick={handleApplyCertificate}
                            disabled={isPending || !!isAppliedOrIssued}
                          >
                            <Award className="mr-2 h-5 w-5" />
                            {isPending ? '신청 처리 중...' : isAppliedOrIssued
                              ? (existingCertificate.status === 'issued' ? '🎉 자격증 발급 완료' : '⏳ 자격증 심사 중')
                              : (isRejected ? '자격증 재신청하기' : (allSkillsCompleted ? '자격증 신청하기' : '자격증 신청 (스킬 미완료)'))}
                          </Button>
                          {!allSkillsCompleted && !isAppliedOrIssued && !isRejected && (
                            <p className="text-[11px] font-medium text-center text-amber-600 mt-2">
                              <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 모든 스킬을 이수하지 않은 상태로 신청 시 승인이 반려될 수 있습니다.</span>
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-slate-50 border-slate-200">
              <CardContent className="pt-6">
                <p className="text-center text-slate-500 py-12 font-medium">
                  아직 수강을 시작한 실습 과정이 없습니다.<br/>
                  <span className="text-xs text-slate-400 mt-2 block">입문 과정을 예약하고 로드맵을 채워보세요.</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* 최근 디브리핑 */}
          {progressData.debriefings.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquareHeart className="w-5 h-5 text-pink-500" />
                    <span>최근 디브리핑</span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('debriefings')}
                  >
                    {expandedSection === 'debriefings' ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              {expandedSection === 'debriefings' && (
                <CardContent>
                  <div className="space-y-4">
                    {progressData.debriefings.slice(0, 3).map((debriefing) => {
                      const classInfo = debriefing.reservation?.classes

                      return (
                        <div
                          key={debriefing.id}
                          className="p-4 border border-slate-200 rounded-xl bg-slate-50 shadow-sm space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              {classInfo && (
                                <>
                                  <Badge variant="outline" className="mb-2 bg-white font-bold">
                                    {classInfo.type === 'pool' ? '풀장 실습' : classInfo.type}
                                  </Badge>
                                  <p className="text-xs font-semibold text-slate-500">
                                    {new Date(classInfo.date).toLocaleDateString('ko-KR')}
                                  </p>
                                </>
                              )}
                            </div>
                            {debriefing.instructor && (
                              <p className="text-[11px] font-bold tracking-tight px-2 py-1 bg-slate-200/50 rounded text-slate-600">
                                👨‍🏫 강사: {debriefing.instructor.name}
                              </p>
                            )}
                          </div>

                          {debriefing.performance && (
                            <div className="text-sm bg-white p-2.5 rounded border border-slate-100">
                              <p className="text-[11px] font-bold tracking-tight text-slate-400 mb-0.5">
                                [수행 평가]
                              </p>
                              <p className="text-slate-700 font-medium leading-relaxed">{debriefing.performance}</p>
                            </div>
                          )}

                          {debriefing.next_goal && (
                            <div className="text-sm bg-blue-50/50 border border-blue-100 p-2.5 rounded">
                              <p className="text-[11px] font-bold tracking-tight text-blue-600 mb-0.5">
                                [다음 목표]
                              </p>
                              <p className="text-slate-700 font-medium leading-relaxed">{debriefing.next_goal}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {completedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedCourses.map((course) => {
                // 발급된 자격증 매칭
                const issuedCert = progressData.certificates?.find(
                  (c) => c.certificate_level === course.course_level && c.status === 'issued'
                )
                const displayName = issuedCert?.certificate_number || `${levelLabels[course.course_level] || course.course_level} 과정`

                return (
                  <Card key={course.id} className="border-green-200 bg-linear-to-br from-green-50 to-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <Badge className="bg-green-600 text-white hover:bg-green-700 mb-3 px-3">
                            수료 완료
                          </Badge>
                          <h3 className="font-bold text-xl text-slate-800">
                            {displayName}
                          </h3>
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-3 space-y-1">
                          <p>시작: {new Date(course.started_at).toLocaleDateString('ko-KR')}</p>
                          <p>수료: {course.completed_at ? new Date(course.completed_at).toLocaleDateString('ko-KR') : '-'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed bg-slate-50">
               <CardContent className="pt-6">
                <p className="text-center text-slate-500 py-16 font-medium">
                  아직 수료한 과정이 없습니다.<br/>
                  <span className="text-sm font-normal text-slate-400 flex items-center justify-center gap-1 mt-2">자격증을 획득하고 이 곳에 명예의 전당을 채워보세요! <Trophy className="w-5 h-5 text-yellow-500" /></span>
                </p>
               </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dropped" className="space-y-6">
          {droppedCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {droppedCourses.map((course) => {
                return (
                  <Card key={course.id} className="border-rose-200 bg-linear-to-br from-rose-50 to-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <Badge className="bg-rose-600 text-white hover:bg-rose-700 mb-3 px-3">
                            교육 만료
                          </Badge>
                          <h3 className="font-bold text-xl text-slate-800">
                            {levelLabels[course.course_level] || course.course_level} 과정
                          </h3>
                        </div>
                        <div className="text-xs font-medium text-slate-500 mt-3 space-y-1">
                          <p>시작: {new Date(course.started_at).toLocaleDateString('ko-KR')}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-start gap-2 text-sm text-rose-700 bg-white/60 p-3 rounded-lg border border-rose-100">
                        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="font-medium">교육 기간이 만료되었거나 기타 사유로 인해 만료된 과정입니다.</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed bg-slate-50">
               <CardContent className="pt-6">
                <p className="text-center text-slate-500 py-16 font-medium">
                  만료된 교육 과정이 없습니다.
                </p>
               </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
