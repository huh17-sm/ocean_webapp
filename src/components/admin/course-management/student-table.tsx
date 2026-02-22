'use client'

/**
 * 교육 현황 학생 테이블 컴포넌트
 *
 * 교육 진행 중인 학생을 한눈에 파악할 수 있는 테이블
 * - 학생 이름, 과정, 진도율, 스킬 완료율, 자격증 상태를 표시
 * - 클릭 시 학생 상세 모달을 오픈
 * - 이름/과정으로 검색 가능
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Award,
  Inbox,
} from 'lucide-react'
import type { StudentEnrollmentSummary } from '@/app/admin/actions/course-management'

interface StudentTableProps {
  students: StudentEnrollmentSummary[]
  onStudentClick: (userId: string, courseLevel: string) => void
  emptyMessage?: string
  /** 다중 선택 모드 활성화 (휴지통 등에서 사용) */
  selectable?: boolean
  selectedIds?: number[]
  onSelectionChange?: (ids: number[]) => void
}

export function StudentTable({
  students,
  onStudentClick,
  emptyMessage,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: StudentTableProps) {
  // 검색어 및 과정 필터
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    let result = students

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter(
        (s) =>
          s.userName.toLowerCase().includes(query) ||
          s.userEmail.toLowerCase().includes(query) ||
          s.courseLevel.toLowerCase().includes(query) ||
          s.courseTitle.toLowerCase().includes(query)
      )
    }

    // 과정 레벨 필터
    if (levelFilter && levelFilter !== 'all') {
      result = result.filter((s) => s.courseLevel === levelFilter)
    }

    return result
  }, [students, searchQuery, levelFilter])

  // 과정 레벨 목록 (필터 셀렉트용)
  const courseLevels = useMemo(() => {
    return [...new Set(students.map((s) => s.courseLevel))]
  }, [students])
  // 전체 선택 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      const allIds = filteredStudents.map((s) => s.courseProgressId)
      onSelectionChange(allIds)
    } else {
      onSelectionChange([])
    }
  }

  // 개별 선택 핸들러
  const handleSelectRow = (progressId: number, checked: boolean) => {
    if (!onSelectionChange) return
    if (checked) {
      onSelectionChange([...selectedIds, progressId])
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== progressId))
    }
  }

  const isAllSelected =
    filteredStudents.length > 0 && selectedIds.length === filteredStudents.length
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 검색 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="이름, 이메일, 과정으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 과정 필터 */}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="과정 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 과정</SelectItem>
              {courseLevels.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectable && filteredStudents.length > 0 && (
          <div className="flex items-center gap-2 mt-4 px-1">
            <Checkbox
              id="select-all"
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              현재 목록 전체 선택 ({selectedIds.length}/{filteredStudents.length})
            </label>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              {searchQuery ? '검색 결과가 없습니다' : (emptyMessage || '학생이 없습니다')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((student) => (
              <StudentRow
                key={`${student.userId}_${student.courseLevel}_${student.courseProgressId}`}
                student={student}
                onClick={() =>
                  onStudentClick(student.userId, student.courseLevel)
                }
                selectable={selectable}
                isSelected={selectedIds.includes(student.courseProgressId)}
                onToggleSelect={(checked) => handleSelectRow(student.courseProgressId, checked)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 개별 학생 행 컴포넌트
// ============================================

function StudentRow({
  student,
  onClick,
  selectable,
  isSelected,
  onToggleSelect,
}: {
  student: StudentEnrollmentSummary
  onClick: () => void
  selectable?: boolean
  isSelected?: boolean
  onToggleSelect?: (checked: boolean) => void
}) {
  // 스킬 완료 퍼센트 계산
  const skillPercent =
    student.skillsTotal > 0
      ? Math.round((student.skillsCompleted / student.skillsTotal) * 100)
      : 0

  // 자격증 상태 뱃지
  const certBadge = getCertBadge(student.certStatus)

  return (
    <div className="flex items-center gap-2 group w-full">
      {selectable && onToggleSelect && (
        <div className="pl-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="w-5 h-5"
          />
        </div>
      )}
      <button
        onClick={onClick}
        className="flex-1 flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left"
      >
        {/* 학생 아바타 */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
          {student.userName.charAt(0)}
        </div>

      {/* 학생 정보 */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* 이름 + 과정 + 상태 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-900 text-sm truncate">
            {student.userName}
          </span>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {student.courseLevel}
          </Badge>
          {student.status === 'completed' && (
            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 flex-shrink-0">
              수료
            </Badge>
          )}
        </div>

        {/* 진도 표시줄 */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {/* 이론 */}
          <span className="flex items-center gap-1">
            {student.theoryCompleted ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-slate-300" />
            )}
            이론
          </span>

          {/* 풀세션 */}
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-blue-500" />
            풀 {student.poolSessionsCompleted}회
          </span>

          {/* 스킬 */}
          <span className="flex items-center gap-1">
            <CheckCircle2
              className={`h-3.5 w-3.5 ${skillPercent === 100 ? 'text-green-500' : 'text-slate-300'}`}
            />
            스킬 {student.skillsCompleted}/{student.skillsTotal}
          </span>

          {/* 자격증 */}
          {certBadge}
        </div>
      </div>

      {/* 화살표 */}
      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
      </button>
    </div>
  )
}

// ============================================
// 자격증 상태 뱃지 헬퍼
// ============================================

function getCertBadge(status: string) {
  switch (status) {
    case 'issued':
      return (
        <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5">
          <Award className="h-3 w-3 mr-0.5" />
          발급 완료
        </Badge>
      )
    case 'approved':
      return (
        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5">
          승인됨
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5">
          심사 중
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5">
          거부됨
        </Badge>
      )
    default:
      return null
  }
}
