'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Award } from 'lucide-react'
import type { MyProgressSummary } from '@/app/actions/progress'

interface ProgressViewProps {
  progressData: MyProgressSummary
}

const skillTypeLabels: Record<string, { label: string; emoji: string }> = {
  static: { label: 'Static (스태틱)', emoji: '🧘' },
  dynamic: { label: 'Dynamic (다이나믹)', emoji: '🏊' },
  depth: { label: 'Depth (수심)', emoji: '🤿' },
  rescue: { label: 'Rescue (구조)', emoji: '🆘' },
  theory: { label: 'Theory (이론)', emoji: '📚' },
}

const levelLabels: Record<string, string> = {
  입문: '입문',
  초급: '초급',
  중급: '중급',
  고급: '고급',
}

export function ProgressView({ progressData }: ProgressViewProps) {
  const [expandedSection, setExpandedSection] = useState<string>('current')

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

  // 현재 과정의 스킬
  const currentLevel = currentCourses[0]?.course_level
  const currentSkills = progressData.skillCompletions.filter(
    (s) => s.course_level === currentLevel
  )

  const completedSkillsCount = currentSkills.filter((s) => s.is_completed).length
  const allSkillsCompleted = currentSkills.length > 0 && completedSkillsCount === currentSkills.length

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section)
  }

  return (
    <div className="space-y-6">
      {/* 신청 대기중 */}
      {pendingApplications.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span>⏳ 신청 대기중</span>
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
                <span>📖 현재 과정</span>
                <Badge variant="default">진행중</Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('current')}
              >
                {expandedSection === 'current' ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
          {expandedSection === 'current' && (
            <CardContent className="space-y-6">
              {currentCourses.map((course) => {
                const totalSessions = 10 // 예시값
                const completedPercentage = Math.min(
                  (course.pool_sessions_completed / totalSessions) * 100,
                  100
                )

                return (
                  <div key={course.id} className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">
                          {levelLabels[course.course_level]} 과정
                        </h3>
                        <span className="text-sm text-slate-600">
                          {Math.round(completedPercentage)}% 완료
                        </span>
                      </div>
                      <Progress value={completedPercentage} className="h-2" />
                    </div>

                    {/* 이론/풀장 완료 현황 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
                        {course.theory_completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium">이론 교육</p>
                          <p className="text-xs text-slate-500">
                            {course.theory_completed ? '완료' : '미완료'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
                        <div className="h-5 w-5 flex items-center justify-center text-xs font-bold text-blue-600">
                          {course.pool_sessions_completed}
                        </div>
                        <div>
                          <p className="text-sm font-medium">풀장 세션</p>
                          <p className="text-xs text-slate-500">
                            {course.pool_sessions_completed}회 완료
                          </p>
                        </div>
                      </div>
                    </div>

                    {course.notes && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-slate-700">{course.notes}</p>
                      </div>
                    )}

                    <div className="text-xs text-slate-500">
                      시작일: {new Date(course.started_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-slate-500 py-8">
              아직 시작한 과정이 없습니다
            </p>
          </CardContent>
        </Card>
      )}

      {/* 스킬 체크리스트 */}
      {currentLevel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <span>✅ 스킬 체크리스트</span>
                <Badge variant={allSkillsCompleted ? 'secondary' : 'outline'}>
                  {completedSkillsCount}/{currentSkills.length} 완료
                </Badge>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('skills')}
              >
                {expandedSection === 'skills' ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
          {expandedSection === 'skills' && (
            <CardContent>
              <div className="space-y-3">
                {currentSkills.map((skill) => {
                  const skillInfo =
                    skillTypeLabels[skill.skill_type] || {
                      label: skill.skill_type,
                      emoji: '✅',
                    }

                  return (
                    <div
                      key={skill.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                        skill.is_completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {skill.is_completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-6 w-6 text-slate-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-base mb-1">
                          {skillInfo.emoji} {skillInfo.label}
                        </p>
                        {skill.is_completed && skill.completed_at && (
                          <p className="text-sm text-slate-600 mb-1">
                            완료일: {new Date(skill.completed_at).toLocaleDateString('ko-KR')}
                          </p>
                        )}
                        {skill.notes && (
                          <p className="text-sm text-slate-600 bg-white p-2 rounded mt-2">
                            {skill.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 자격증 신청 버튼 */}
              <div className="mt-6">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!allSkillsCompleted}
                >
                  <Award className="mr-2 h-5 w-5" />
                  {allSkillsCompleted
                    ? '자격증 신청하기'
                    : '모든 스킬을 완료하면 신청 가능합니다'}
                </Button>
                {!allSkillsCompleted && (
                  <p className="text-xs text-center text-amber-600 mt-2">
                    ⚠️ 스킬 미완료 상태에서도 신청은 가능하지만, 승인이 지연될 수 있습니다
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 최근 디브리핑 */}
      {progressData.debriefings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">📝 최근 디브리핑</CardTitle>
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
                      className="p-4 border rounded-lg bg-slate-50 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          {classInfo && (
                            <>
                              <Badge variant="outline" className="mb-2">
                                {classInfo.type}
                              </Badge>
                              <p className="text-sm text-slate-600">
                                {new Date(classInfo.date).toLocaleDateString('ko-KR')}
                              </p>
                            </>
                          )}
                        </div>
                        {debriefing.instructor && (
                          <p className="text-xs text-slate-500">
                            강사: {debriefing.instructor.name}
                          </p>
                        )}
                      </div>

                      {debriefing.performance && (
                        <div className="text-sm">
                          <p className="font-semibold text-slate-700 mb-1">
                            수행 평가:
                          </p>
                          <p className="text-slate-600">{debriefing.performance}</p>
                        </div>
                      )}

                      {debriefing.next_goal && (
                        <div className="text-sm">
                          <p className="font-semibold text-slate-700 mb-1">
                            다음 목표:
                          </p>
                          <p className="text-slate-600">{debriefing.next_goal}</p>
                        </div>
                      )}
                    </div>
                  )
                })}

                {progressData.debriefings.length > 3 && (
                  <Button variant="outline" className="w-full mt-4">
                    전체 디브리핑 보기 ({progressData.debriefings.length})
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* 과거 과정 */}
      {completedCourses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">🏆 완료한 과정</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('completed')}
              >
                {expandedSection === 'completed' ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
          {expandedSection === 'completed' && (
            <CardContent>
              <div className="space-y-3">
                {completedCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 border rounded-lg bg-green-50 border-green-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          {levelLabels[course.course_level]} 과정
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          {new Date(course.started_at).toLocaleDateString('ko-KR')} ~{' '}
                          {course.completed_at &&
                            new Date(course.completed_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
