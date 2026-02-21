'use client'

/**
 * 통합 교육 관리 클라이언트 컴포넌트
 *
 * 4가지 섹션으로 구성됨:
 * 1. 상단: 요약 카드
 * 2. 탭 1: 신청 대기 큐 (빠른 승인/거부)
 * 3. 탭 2: 교육 진행 중 학생 테이블
 * 4. 탭 3: 수료 완료 학생 테이블
 * 5. 모달: 학생 상세 (진도/스킬/자격증 탭)
 */

import { useState, useCallback, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GraduationCap, Clock, BookOpen, UserPlus, CheckCircle2 } from 'lucide-react'
import type { StudentEnrollmentSummary } from '@/app/admin/actions/course-management'
import type { PendingCourseRequest } from '@/app/admin/actions/course-enrollment'
import { RequestQueue } from './request-queue'
import { StudentTable } from './student-table'
import { StudentDetailModal } from './student-detail-modal'
import { ManualRegisterDialog } from './manual-register-dialog'

interface CourseManagementClientProps {
  enrolledStudents: StudentEnrollmentSummary[]
  pendingRequests: PendingCourseRequest[]
  pendingCertificates: any[]
  activeCourses: any[]
  allStudents: any[]
}

export function CourseManagementClient({
  enrolledStudents,
  pendingRequests,
  pendingCertificates,
  activeCourses,
  allStudents,
}: CourseManagementClientProps) {
  // 학생 상세 모달 상태
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedCourseLevel, setSelectedCourseLevel] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // 임의 등록 다이얼로그 상태
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false)

  // 상태별 학생 필터링
  const inProgressStudents = useMemo(
    () => enrolledStudents.filter((s) => s.status === 'in_progress'),
    [enrolledStudents]
  )
  const completedStudents = useMemo(
    () => enrolledStudents.filter((s) => s.status === 'completed'),
    [enrolledStudents]
  )

  /** 학생 클릭 → 모달 오픈 */
  const handleStudentClick = useCallback((userId: string, courseLevel: string) => {
    setSelectedStudentId(userId)
    setSelectedCourseLevel(courseLevel)
    setModalOpen(true)
  }, [])

  /** 모달 닫기 */
  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setSelectedStudentId(null)
    setSelectedCourseLevel(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-blue-600" />
            통합 교육 관리
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            과정 신청 · 교육 진도 · 스킬 체크 · 자격증을 한 곳에서 관리합니다
          </p>
        </div>

        {/* 임의 등록 버튼 */}
        <Button
          onClick={() => setRegisterDialogOpen(true)}
          className="gap-2 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          과정 임의 등록
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="신청 대기"
          value={pendingRequests.length}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
        />
        <SummaryCard
          label="교육 진행 중"
          value={inProgressStudents.length}
          icon={<BookOpen className="h-4 w-4" />}
          color="blue"
        />
        <SummaryCard
          label="수료 완료"
          value={completedStudents.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="green"
        />
        <SummaryCard
          label="자격증 대기"
          value={pendingCertificates.length}
          icon={<GraduationCap className="h-4 w-4" />}
          color="purple"
        />
      </div>

      {/* 탭: 신청 대기 / 교육 진행 / 수료 완료 */}
      <Tabs defaultValue={pendingRequests.length > 0 ? 'pending' : 'students'}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">신청 대기</span>
            <span className="sm:hidden">대기</span>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">교육 진행</span>
            <span className="sm:hidden">진행</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {inProgressStudents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">수료 완료</span>
            <span className="sm:hidden">수료</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {completedStudents.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* 신청 대기 탭 */}
        <TabsContent value="pending" className="mt-4">
          <RequestQueue requests={pendingRequests} />
        </TabsContent>

        {/* 교육 진행 탭 */}
        <TabsContent value="students" className="mt-4">
          <StudentTable
            students={inProgressStudents}
            onStudentClick={handleStudentClick}
            emptyMessage="교육 중인 학생이 없습니다"
          />
        </TabsContent>

        {/* 수료 완료 탭 */}
        <TabsContent value="completed" className="mt-4">
          <StudentTable
            students={completedStudents}
            onStudentClick={handleStudentClick}
            emptyMessage="수료 완료된 학생이 없습니다"
          />
        </TabsContent>
      </Tabs>

      {/* 학생 상세 모달 */}
      <StudentDetailModal
        open={modalOpen}
        onClose={handleModalClose}
        userId={selectedStudentId}
        courseLevel={selectedCourseLevel}
      />

      {/* 임의 등록 다이얼로그 */}
      <ManualRegisterDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        activeCourses={activeCourses}
        allStudents={allStudents}
      />
    </div>
  )
}

// ============================================
// 요약 카드 컴포넌트
// ============================================

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: 'amber' | 'blue' | 'green' | 'purple' | 'slate'
}) {
  const colorMap = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold">{value}</p>
    </div>
  )
}
