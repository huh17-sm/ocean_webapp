'use client'

import { useState, useTransition, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  saveDebriefingBulk,
  getDebriefingsByClass,
  updateClassMediaLink,
} from '@/app/admin/actions/debriefings'
import { getClassStudents } from '@/app/admin/actions'
import { Calendar, MapPin, Save, Loader2, Target, Sparkles, TrendingUp, GraduationCap, Image as ImageIcon, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { CLASS_TYPES } from '@/lib/constants'

// 수업 정보 타입
interface ClassInfo {
  id: string
  date: string
  time: string
  type: string
  location: string
  media_link?: string | null
  hasPendingDebriefing?: boolean
  title?: string
}

// 컴포넌트 Props
interface DebriefingManagementProps {
  classes: ClassInfo[]
  instructorId: string
}

/**
 * 디브리핑 관리 컴포넌트
 * - 수업별로 학생 디브리핑을 작성/수정/조회합니다.
 * - 좌측: 탭 기반 수업 목록 (작성 필요/완료/전체), 우측: 수업 공통 정보(미디어 링크) & 학생별 디브리핑 폼
 */
export function DebriefingManagement({
  classes,
  instructorId,
}: DebriefingManagementProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5
  
  // 미디어 링크 상태
  const [mediaLink, setMediaLink] = useState('')
  const [isSavingMedia, setIsSavingMedia] = useState(false)

  // 학생별 디브리핑 데이터 (reservation_id → 디브리핑 내용)
  const [debriefings, setDebriefings] = useState<Map<string, {
    student_name: string
    student_email: string
    status: string
    performance: string
    improvement: string
    strengths: string
    next_goal: string
    mark_attended: boolean
  }>>(new Map())

  // 수업 목록 필터링
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      if (activeTab === 'all') return true
      if (activeTab === 'pending') return c.hasPendingDebriefing === true
      if (activeTab === 'completed') return c.hasPendingDebriefing === false
      return true
    })
  }, [classes, activeTab])

  // 페이지네이션 적용 (5개씩)
  const totalPages = Math.ceil(filteredClasses.length / ITEMS_PER_PAGE)
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return filteredClasses.slice(start, end)
  }, [filteredClasses, currentPage])

  // 탭 변경 시 페이지 1로 초기화
  const handleTabChange = (val: string) => {
    setActiveTab(val as any)
    setCurrentPage(1)
  }

  // 수업 선택 시 학생 목록 + 기존 디브리핑 불러오기
  const handleSelectClass = async (classInfo: ClassInfo) => {
    setSelectedClass(classInfo)
    setMediaLink(classInfo.media_link || '')
    setIsLoading(true)

    try {
      const [classStudents, existingDebriefings] = await Promise.all([
        getClassStudents(classInfo.id),
        getDebriefingsByClass(classInfo.id),
      ])

      const newMap = new Map<string, any>()

      ;(classStudents as any[]).forEach((student: any) => {
        const existing = (existingDebriefings as any[]).find(
          (d: any) => d.reservation_id === student.id
        )
        newMap.set(student.id, {
          student_name: student.profiles?.name || '이름 없음',
          student_email: student.profiles?.email || '',
          status: student.status,
          performance: existing?.performance || '',
          improvement: existing?.improvement || '',
          strengths: existing?.strengths || '',
          next_goal: existing?.next_goal || '',
          mark_attended: student.status === 'attended',
        })
      })

      setDebriefings(newMap)
    } catch (error) {
      console.error('디브리핑 조회 실패:', error)
      toast.error('데이터 불러오기 실패')
      setDebriefings(new Map())
    } finally {
      setIsLoading(false)
    }
  }

  // 사진 앨범(미디어 링크) 저장
  const handleSaveMediaLink = async () => {
    if (!selectedClass) return
    
    setIsSavingMedia(true)
    try {
      const result = await updateClassMediaLink(selectedClass.id, mediaLink)
      if (result.success) {
        toast.success(result.message)
        setSelectedClass({ ...selectedClass, media_link: mediaLink })
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsSavingMedia(false)
    }
  }

  // 개별 학생 디브리핑 필드 업데이트
  const updateField = (reservationId: string, field: string, value: any) => {
    setDebriefings(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(reservationId)
      if (current) {
        newMap.set(reservationId, { ...current, [field]: value })
      }
      return newMap
    })
  }

  // 일괄 저장
  const handleSaveBulk = () => {
    if (!selectedClass || debriefings.size === 0) {
      toast.error('입력 오류', {
        description: '수업을 선택하고 최소 1명의 디브리핑을 작성해주세요.',
      })
      return
    }

    startTransition(async () => {
      // 내용이 있거나 출석 상태가 변경된 디브리핑 필터링
      const inputs = Array.from(debriefings.entries())
        .filter(([_, data]) =>
          data.performance || data.improvement || data.strengths || data.next_goal || data.mark_attended !== (data.status === 'attended')
        )
        .map(([reservationId, data]) => ({
          reservation_id: reservationId,
          class_id: selectedClass.id,
          instructor_id: instructorId,
          performance: data.performance,
          improvement: data.improvement,
          strengths: data.strengths,
          next_goal: data.next_goal,
          mark_attended: data.mark_attended,
        }))

      if (inputs.length === 0) {
        toast.error('입력 오류', {
          description: '변경 사항이 없거나 작성된 디브리핑이 없습니다.',
        })
        return
      }

      const result = await saveDebriefingBulk(inputs)

      if (result.success) {
        toast.success('디브리핑 저장 완료', {
          description: result.message,
        })
        // 저장 후 데이터 새로고침
        if (selectedClass) {
          await handleSelectClass(selectedClass)
        }
      } else {
        toast.error('저장 실패', {
          description: result.message,
        })
      }
    })
  }

  // 수업 목록 렌더링 헬퍼 함수
  const renderClassList = (emptyMessage: string) => (
    <div className="space-y-4">
      <div className="space-y-2 min-h-[460px]">
        {paginatedClasses.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">{emptyMessage}</p>
        ) : (
          paginatedClasses.map((classInfo) => (
            <button
              key={classInfo.id}
              onClick={() => handleSelectClass(classInfo)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedClass?.id === classInfo.id
                  ? 'bg-blue-50 border-blue-300'
                  : 'hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {CLASS_TYPES[classInfo.type as keyof typeof CLASS_TYPES] || classInfo.type}
                  </Badge>
                  {classInfo.title && <span className="text-sm font-bold text-slate-800">{classInfo.title}</span>}
                </div>
                {classInfo.hasPendingDebriefing && (
                  <div className="w-2 h-2 rounded-full bg-red-500" title="작성 필요" />
                )}
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-2">
                <Calendar className="h-3 w-3" />
                {new Date(classInfo.date).toLocaleDateString('ko-KR')} {classInfo.time}
              </p>
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {classInfo.location}
              </p>
            </button>
          ))
        )}
      </div>

      {/* 페이지네이션 컨트롤 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            이전
          </Button>
          <span className="text-sm text-slate-500 font-medium">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 좌측: 수업 목록 (탭 기반 필터링 포함) */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">수업 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="pending">작성 전</TabsTrigger>
              <TabsTrigger value="completed">작성 완료</TabsTrigger>
              <TabsTrigger value="all">전체</TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-0">
              {renderClassList('디브리핑 작성이 필요한 수업이 없습니다.')}
            </TabsContent>
            <TabsContent value="completed" className="mt-0">
              {renderClassList('작성 완료된 디브리핑이 없습니다.')}
            </TabsContent>
            <TabsContent value="all" className="mt-0">
              {renderClassList('등록된 수업이 없습니다.')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 우측: 디브리핑 작성/수정 영역 */}
      <div className="lg:col-span-3 space-y-4">
        {!selectedClass ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-slate-500 py-12">
                왼쪽에서 수업을 선택하면 디브리핑을 작성하거나 사진 앨범을 추가할 수 있습니다
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12 gap-2 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                불러오는 중...
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 상단: 수업 공통 미디어 링크 추가 컴포넌트 */}
            <Card className="border-blue-100 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  수업 사진 앨범 등록
                </CardTitle>
                <CardDescription>
                  구글 드라이브나 노션 등 수업 사진이 공유된 링크를 올려주시면 사용자가 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://drive.google.com/..." 
                    value={mediaLink}
                    onChange={(e) => setMediaLink(e.target.value)}
                    className="flex-1 bg-white"
                  />
                  <Button onClick={handleSaveMediaLink} disabled={isSavingMedia} variant="secondary">
                    {isSavingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : '링크 저장'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 본문: 학생별 디브리핑 폼 */}
            {debriefings.size === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-slate-500 py-12">
                    이 수업에 등록(출석)된 학생이 없어 개인별 디브리핑을 작성할 수 없습니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {Array.from(debriefings.entries()).map(([reservationId, data]) => (
                    <Collapsible key={reservationId} className="w-full">
                      <Card>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50/50 transition-colors">
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                  {data.student_name}
                                  <ChevronDown className="w-4 h-4 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
                                </CardTitle>
                                <p className="text-xs text-slate-500 mt-1">{data.student_email}</p>
                              </div>
                              <div 
                                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border shadow-sm"
                                onClick={(e) => e.stopPropagation()} // Collapse 열림/닫힘 방지
                              >
                                <Checkbox 
                                  id={`attended-${reservationId}`}
                                  checked={data.mark_attended}
                                  onCheckedChange={(checked) => updateField(reservationId, 'mark_attended', checked)}
                                />
                                <Label htmlFor={`attended-${reservationId}`} className="cursor-pointer text-sm font-medium m-0 pt-0.5">
                                  {data.mark_attended ? <span className="flex items-center gap-1 text-slate-900">출석 완료 <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /></span> : <span className="text-slate-500">출석 전</span>}
                                </Label>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="border-t pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                                  <Target className="w-3.5 h-3.5 text-blue-500" /> 수행 평가
                                </label>
                                <Textarea
                                  value={data.performance}
                                  onChange={(e) => updateField(reservationId, 'performance', e.target.value)}
                                  placeholder="이번 수업에서의 전반적인 수행 평가..."
                                  rows={3}
                                  className="text-sm resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-green-500" /> 잘한 점
                                </label>
                                <Textarea
                                  value={data.strengths}
                                  onChange={(e) => updateField(reservationId, 'strengths', e.target.value)}
                                  placeholder="잘한 점, 칭찬할 점 강점 등..."
                                  rows={3}
                                  className="text-sm resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                                  <TrendingUp className="w-3.5 h-3.5 text-orange-500" /> 개선 포인트
                                </label>
                                <Textarea
                                  value={data.improvement}
                                  onChange={(e) => updateField(reservationId, 'improvement', e.target.value)}
                                  placeholder="개선이 필요한 부분 등..."
                                  rows={3}
                                  className="text-sm resize-none"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                                  <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> 다음 목표
                                </label>
                                <Textarea
                                  value={data.next_goal}
                                  onChange={(e) => updateField(reservationId, 'next_goal', e.target.value)}
                                  placeholder="다음 교육이나 트레이닝 목표..."
                                  rows={3}
                                  className="text-sm resize-none"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>

                {/* 저장 버튼 */}
                <div className="flex justify-end sticky bottom-4 z-10 pt-4">
                  <Button
                    onClick={handleSaveBulk}
                    disabled={isPending}
                    size="lg"
                    className="shadow-lg min-w-[200px]"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        개인별 디브리핑 일괄 저장
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
