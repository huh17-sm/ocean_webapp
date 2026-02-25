'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Save, Link as LinkIcon, CheckCircle2, Circle, Target, Sparkles, TrendingUp, GraduationCap } from 'lucide-react'
// Actions
import { saveDebriefingBulk } from '@/app/admin/actions/debriefings'
import { updateClassMediaLink, completeReservation } from '@/app/admin/actions'

interface ClassClosingManagerProps {
  classInfo: any
  reservations: any[]
  existingDebriefings: any[]
}

export function ClassClosingManager({
  classInfo,
  reservations,
  existingDebriefings,
}: ClassClosingManagerProps) {

  const [isPending, startTransition] = useTransition()

  // Media Link State
  const [mediaLink, setMediaLink] = useState(classInfo.media_link || '')

  // Debriefings State
  // Map: reservation_id -> Debriefing Data
  const [debriefingData, setDebriefingData] = useState<Record<string, any>>(() => {
    const initialData: Record<string, any> = {}
    reservations.forEach((r) => {
      const existing = existingDebriefings.find((d) => d.reservation_id === r.id)
      initialData[r.id] = {
        performance: existing?.performance || '',
        improvement: existing?.improvement || '',
        strengths: existing?.strengths || '',
        next_goal: existing?.next_goal || '',
        mark_attended: r.status === 'attended', // Initialize attendance status
      }
    })
    return initialData
  })

  // Helper to update debriefing field
  const updateField = (reservationId: string, field: string, value: any) => {
    setDebriefingData((prev) => ({
      ...prev,
      [reservationId]: {
        ...prev[reservationId],
        [field]: value,
      },
    }))
  }

  // Save All Function
  const handleSaveAll = () => {
    startTransition(async () => {
      try {
        // 1. Update Media Link
        if (mediaLink !== classInfo.media_link) {
          const mediaResult = await updateClassMediaLink(classInfo.id, mediaLink)
          if (!mediaResult.success) {
            throw new Error(mediaResult.error || '미디어 링크 저장 실패')
          }
        }

        // 2. Bulk Save Debriefings
        const inputs = Object.entries(debriefingData).map(([reservationId, data]) => ({
            reservation_id: reservationId,
            performance: data.performance || undefined,
            improvement: data.improvement || undefined,
            strengths: data.strengths || undefined,
            next_goal: data.next_goal || undefined,
            mark_attended: data.mark_attended
        }))

        // Filter out empty inputs if needed, existing saveDebriefingBulk handles updates so sending all is fine
        // provided they are initialized correctly.
        
        // Also handle explicit attendance updates if logic requires separate calls?
        // saveDebriefingBulk in 'actions/debriefings.ts' handles 'mark_attended' logic!
        // It checks: if (input.mark_attended) ... update status='attended'.

        const debriefResult = await saveDebriefingBulk(inputs)

        if (!debriefResult.success) {
             throw new Error(debriefResult.message || '디브리핑 저장 실패')
        }
        
        toast.success('저장 완료', {
          description: '수업 마무리 정보가 성공적으로 저장되었습니다.',
        })

        // Refresh is handled by actions revalidatePath usually, but we might want to reload to reflect status changes strictly
        // specifically for attendance status UI update if revalidatePath isn't enough for client state
        // window.location.reload() // Optional, Next.js should handle revalidation
      } catch (error: any) {
        toast.error('저장 실패', {
          description: error.message || '저장 중 오류가 발생했습니다.',
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. Media Link Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            미디어 링크 (사진/영상)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="sr-only">미디어 링크</Label>
              <Input
                value={mediaLink}
                onChange={(e) => setMediaLink(e.target.value)}
                placeholder="구글 드라이브, 네이버 박스 등 공유 링크를 입력하세요"
              />
              <p className="text-xs text-slate-500 mt-1">
                * 이 링크는 수업에 참여한 모든 학생의 마이페이지에 노출됩니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Students Debriefing Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle className="text-lg">학생별 디브리핑 & 출석</CardTitle>
             <Button onClick={handleSaveAll} disabled={isPending} className="gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                전체 저장
             </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {reservations.map((r, index) => {
            const data = debriefingData[r.id] || {}
            const isAttended = data.mark_attended

            return (
              <div key={r.id} className="border rounded-lg p-6 bg-slate-50/50">
                {/* Header: Student Info & Attendance */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                       {r.profiles.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{r.profiles.name}</h4>
                      <span className="text-sm text-slate-500">{r.profiles.phone_number}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border">
                    <Checkbox 
                        id={`attended-${r.id}`}
                        checked={isAttended}
                        onCheckedChange={(checked) => updateField(r.id, 'mark_attended', checked)}
                    />
                    <Label htmlFor={`attended-${r.id}`} className="cursor-pointer font-medium">
                        {isAttended ? <span className="flex items-center gap-1">출석 완료 <CheckCircle2 className="w-4 h-4 text-green-500" /></span> : '출석 전'}
                    </Label>
                  </div>
                </div>

                {/* Debriefing Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Target className="w-3 h-3 text-blue-500"/> 수행 평가 (Performance)</Label>
                        <Textarea 
                            value={data.performance}
                            onChange={(e) => updateField(r.id, 'performance', e.target.value)}
                            placeholder="오늘 수업 수행 능력 평가"
                            className="bg-white min-h-[80px]"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3 text-green-500"/> 잘한 점 (Strengths)</Label>
                        <Textarea 
                            value={data.strengths}
                            onChange={(e) => updateField(r.id, 'strengths', e.target.value)}
                            placeholder="칭찬해줄 부분"
                            className="bg-white min-h-[80px]"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-orange-500"/> 개선 포인트 (Improvement)</Label>
                        <Textarea 
                            value={data.improvement}
                            onChange={(e) => updateField(r.id, 'improvement', e.target.value)}
                            placeholder="보완이 필요한 부분"
                            className="bg-white min-h-[80px]"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-slate-500 mb-1 flex items-center gap-1"><GraduationCap className="w-3 h-3 text-purple-500"/> 다음 목표 (Next Goal)</Label>
                        <Textarea 
                            value={data.next_goal}
                            onChange={(e) => updateField(r.id, 'next_goal', e.target.value)}
                            placeholder="다음 수업 연습 목표"
                            className="bg-white min-h-[80px]"
                        />
                    </div>
                </div>
              </div>
            )
          })}
          
          {reservations.length === 0 && (
             <p className="text-center text-slate-500 py-4">등록된 학생이 없습니다.</p>
          )}
        </CardContent>
        
        {/* Footer Actions */}
        <div className="p-6 pt-0 flex justify-end">
            <Button onClick={handleSaveAll} disabled={isPending} size="lg" className="w-full md:w-auto gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                수업 마무리 및 저장
            </Button>
        </div>
      </Card>
    </div>
  )
}
