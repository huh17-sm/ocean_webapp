'use client'

/**
 * 학생 상세 모달 컴포넌트
 *
 * 학생을 클릭했을 때 열리는 모달:
 * - 탭 1: 교육 진도 (이론/풀세션/상태 변경)
 * - 탭 2: 스킬 체크 (개별 스킬 완료/취소)
 * - 탭 3: 자격증 관리 (신청 승인/발급)
 */

import { useEffect, useState, useTransition, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, BookOpen, CheckCircle2, GraduationCap } from 'lucide-react'
import { getStudentDetail, type StudentDetail } from '@/app/admin/actions/course-management'
import { TabProgress } from './tab-progress'
import { TabSkills } from './tab-skills'
import { TabCert } from './tab-cert'

interface StudentDetailModalProps {
  open: boolean
  onClose: () => void
  userId: string | null
  courseLevel: string | null
}

export function StudentDetailModal({
  open,
  onClose,
  userId,
  courseLevel,
}: StudentDetailModalProps) {
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('progress')

  /** 학생 상세 데이터 로드 */
  const loadDetail = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await getStudentDetail(userId)
      setDetail(data)
    } catch (error) {
      console.error('Failed to load student detail:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (open && userId) {
      loadDetail()
      setActiveTab('progress')
    } else {
      setDetail(null)
    }
  }, [open, userId, loadDetail])

  // 현재 과정의 진도 정보
  const currentProgress = detail?.courseProgress?.find(
    (p: any) => p.course_level === courseLevel
  )

  // 현재 과정의 스킬 정보
  const currentSkills = (detail?.skills || []).filter(
    (s: any) => s.course_level === courseLevel
  )

  // 현재 과정의 자격증 정보
  const currentCerts = (detail?.certificates || []).filter(
    (c: any) => c.certificate_level === courseLevel
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {/* 학생 아바타 */}
            {detail?.profile ? (
              <>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {detail.profile.name?.charAt(0) || '?'}
                </div>
                <div>
                  <span className="text-lg">{detail.profile.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {courseLevel}
                  </Badge>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    {detail.profile.email}
                    {detail.profile.phone && ` · ${detail.profile.phone}`}
                  </p>
                </div>
              </>
            ) : (
              <span>학생 정보</span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 로딩 중 */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-slate-500">데이터 로드 중...</span>
          </div>
        )}

        {/* 데이터 로드 완료 */}
        {!loading && detail && userId && courseLevel && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="progress" className="flex items-center gap-1"><BookOpen className="w-4 h-4 text-blue-500"/> 교육 진도</TabsTrigger>
              <TabsTrigger value="skills" className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500"/> 스킬 체크</TabsTrigger>
              <TabsTrigger value="cert" className="flex items-center gap-1"><GraduationCap className="w-4 h-4 text-purple-500"/> 자격증</TabsTrigger>
            </TabsList>

            {/* 교육 진도 탭 */}
            <TabsContent value="progress" className="mt-4">
              <TabProgress
                userId={userId}
                courseLevel={courseLevel}
                progress={currentProgress}
                onUpdate={loadDetail}
              />
            </TabsContent>

            {/* 스킬 체크 탭 */}
            <TabsContent value="skills" className="mt-4">
              <TabSkills
                userId={userId}
                courseLevel={courseLevel}
                skills={currentSkills}
                onUpdate={loadDetail}
              />
            </TabsContent>

            {/* 자격증 탭 */}
            <TabsContent value="cert" className="mt-4">
              <TabCert
                userId={userId}
                courseLevel={courseLevel}
                certificates={currentCerts}
                onUpdate={loadDetail}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
