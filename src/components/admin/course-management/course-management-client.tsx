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

import { useState, useCallback, useMemo, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GraduationCap, Clock, BookOpen, UserPlus, CheckCircle2, XCircle, Trash2, ArchiveRestore, AlertOctagon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { emptyTrash, restoreAllFromTrash } from '@/app/admin/actions/course-management'
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
  // 휴지통 선택 상태
  const [selectedTrashIds, setSelectedTrashIds] = useState<number[]>([])
  const [isPending, startTransition] = useTransition()

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
  const droppedStudents = useMemo(
    () => enrolledStudents.filter((s) => s.status === 'dropped'),
    [enrolledStudents]
  )
  const deletedStudents = useMemo(
    () => enrolledStudents.filter((s) => s.status === 'deleted'),
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

  // 삭제 및 복구 다중 실행 핸들러
  const handleEmptyTrash = (isSelective = false) => {
    const idsToProcess = isSelective ? selectedTrashIds : undefined
    const confirmMessage = isSelective
      ? `선택한 ${selectedTrashIds.length}개의 과정을 영구 삭제하시겠습니까? (복구 불가)`
      : '모든 삭제된 과정을 휴지통에서 완전히 비우시겠습니까? (복구 불가)'
    if (!confirm(confirmMessage)) return
    
    startTransition(async () => {
      try {
        const res = await emptyTrash(idsToProcess)
        if (res.success) {
          toast.success('지정된 과정이 영구 삭제되었습니다.')
          setSelectedTrashIds([])
        } else toast.error('삭제 실패: ' + res.error)
      } catch {
        toast.error('오류가 발생했습니다.')
      }
    })
  }

  const handleRestoreTrash = (isSelective = false) => {
    const idsToProcess = isSelective ? selectedTrashIds : undefined
    const confirmMessage = isSelective
      ? `선택한 ${selectedTrashIds.length}개의 과정을 복구하시겠습니까?`
      : '휴지통의 모든 과정을 복구하시겠습니까?'
    if (!confirm(confirmMessage)) return

    startTransition(async () => {
      try {
        const res = await restoreAllFromTrash(idsToProcess)
        if (res.success) {
          toast.success('지정된 과정이 복구되었습니다.')
          setSelectedTrashIds([])
        } else toast.error('복구 실패: ' + res.error)
      } catch {
        toast.error('오류가 발생했습니다.')
      }
    })
  }

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
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
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
          label="만료 과정"
          value={droppedStudents.length}
          icon={<XCircle className="h-4 w-4" />}
          color="rose"
        />
        <SummaryCard
          label="삭제된 과정"
          value={deletedStudents.length}
          icon={<Trash2 className="h-4 w-4" />}
          color="slate"
        />
        <SummaryCard
          label="자격증 대기"
          value={pendingCertificates.length}
          icon={<GraduationCap className="h-4 w-4" />}
          color="purple"
        />
      </div>

      {/* 탭: 신청 대기 / 교육 진행 / 수료 완료 / 만료됨 / 삭제됨 */}
      <Tabs defaultValue={pendingRequests.length > 0 ? 'pending' : 'students'}>
        <TabsList className="flex flex-wrap w-full justify-start gap-1 h-auto p-1 bg-slate-100/50">
          <TabsTrigger value="pending" className="gap-1.5 flex-1 min-w-[80px]">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">신청 대기</span>
            <span className="sm:hidden">대기</span>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5 flex-1 min-w-[80px]">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">교육 진행</span>
            <span className="sm:hidden">진행</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {inProgressStudents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1.5 flex-1 min-w-[80px]">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">수료 완료</span>
            <span className="sm:hidden">수료</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {completedStudents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="dropped" className="gap-1.5 flex-1 min-w-[80px]">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">만료 과정</span>
            <span className="sm:hidden">만료</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {droppedStudents.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-1.5 flex-1 min-w-[80px]">
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">삭제된 과정</span>
            <span className="sm:hidden">삭제</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {deletedStudents.length}
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

        {/* 중단 탭 */}
        <TabsContent value="dropped" className="mt-4">
          <StudentTable
            students={droppedStudents}
            onStudentClick={handleStudentClick}
            emptyMessage="만료된 과정 리스트가 없습니다."
          />
        </TabsContent>

        {/* 삭제 탭 (휴지통) */}
        <TabsContent value="deleted" className="mt-4">
          <div className="flex flex-col gap-4">
            {/* 상단 컨트롤 (휴지통 기능) */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Trash2 className="h-5 w-5 text-slate-500" />
                <span className="font-medium text-slate-700">휴지통 관리</span>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {selectedTrashIds.length > 0 ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreTrash(true)}
                      disabled={isPending}
                      className="flex-1 sm:flex-none text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />}
                      선택 복구 ({selectedTrashIds.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmptyTrash(true)}
                      disabled={isPending}
                      className="flex-1 sm:flex-none text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <AlertOctagon className="h-3.5 w-3.5 mr-1.5" />}
                      선택 완전 삭제
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreTrash(false)}
                      disabled={isPending || deletedStudents.length === 0}
                      className="flex-1 sm:flex-none"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />}
                      전체 복구
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleEmptyTrash(false)}
                      disabled={isPending || deletedStudents.length === 0}
                      className="flex-1 sm:flex-none"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                      휴지통 비우기
                    </Button>
                  </>
                )}
              </div>
            </div>

            <StudentTable
              students={deletedStudents}
              onStudentClick={handleStudentClick}
              emptyMessage="삭제된 과정 리스트가 없습니다."
              selectable={true}
              selectedIds={selectedTrashIds}
              onSelectionChange={setSelectedTrashIds}
            />
          </div>
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
  color: 'amber' | 'blue' | 'green' | 'purple' | 'slate' | 'rose'
}) {
  const colorMap = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
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
