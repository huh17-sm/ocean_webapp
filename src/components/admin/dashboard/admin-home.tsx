'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Users,
  FileText,
  Award,
  Bell,
  ArrowRight,
  Plus,
  Clock,
  MapPin,
  CreditCard,
  ListChecks,
  Video
} from 'lucide-react'
import { DashboardStats } from '@/app/admin/actions/dashboard'
import { QuickClassDialog } from './quick-class-dialog'
import { QuickRequestApproval } from './quick-request-approval'
import { QuickCertActions } from './quick-cert-actions'
import { PendingCourseRequests } from '../pending-course-requests'
import { ClassDetailModal } from '../class-detail-modal'
import type { ClassData } from '../availability-calendar'
import type { PendingCourseRequest } from '@/app/admin/actions/course-enrollment'

interface AdminHomeProps {
  stats: DashboardStats
  pendingCourseRequests?: PendingCourseRequest[]
}

export function AdminHome({ stats, pendingCourseRequests = [] }: AdminHomeProps) {
  const {
    todayClasses,
    pendingClassRequests,
    pendingCertificates,
    upcomingClassesCount,
    topPendingRequests,
    topPendingCertificates
  } = stats

  // State for ClassDetailModal
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  // 날짜 포맷팅
  const todayDate = new Date().toLocaleDateString('ko-KR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleOpenClassDetail = (cls: any) => {
    // Convert to ClassData format
    const classData: ClassData = {
      id: cls.id,
      date: cls.date,
      time: cls.time,
      title: cls.title || cls.class_name,
      type: cls.type || cls.class_type,
      location: typeof cls.location === 'string' ? cls.location : cls.location?.name,
      location_id: cls.location_id,
      max_capacity: cls.max_capacity || cls.max_students,
      current_enrollment: cls.current_enrollment || (cls.reservations?.[0]?.count || 0),
      media_link: cls.media_link,
      created_at: cls.created_at,
    }
    setSelectedClass(classData)
    setIsDetailModalOpen(true)
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. 상단 타이틀 */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">관리자 대시보드</h2>
          <p className="text-slate-500 mt-1">{todayDate}</p>
        </div>
        <div className="flex gap-2">
            <QuickClassDialog onSuccess={() => window.location.reload()} />
            <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                알림 센터 ({pendingClassRequests + pendingCertificates + pendingCourseRequests.length})
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. 오늘의 수업 (메인 섹션 - 좌측 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full border-t-4 border-t-blue-600 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  오늘의 수업
                </CardTitle>
                <CardDescription>
                  오늘 예정된 수업 일정입니다.
                </CardDescription>
              </div>
                <Link href="/admin/classes/availability?tab=schedule">
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600">
                        전체 일정 보기 <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todayClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <Calendar className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="font-medium text-lg">오늘 예정된 수업이 없습니다.</p>
                  <p className="text-sm mb-4">새로운 수업을 개설해 보세요.</p>
                  <Link href="/admin/classes/availability">
                    <Button variant="outline">수업 스케줄 관리</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-all hover:border-blue-200 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center w-14 h-14 bg-blue-50 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <span className="text-lg font-bold">{cls.time.substring(0, 5)}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="font-normal text-xs">
                                    {cls.class_type}
                                </Badge>
                                <span className="font-bold text-slate-800 text-lg">
                                    {cls.class_name || cls.class_type + ' 수업'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {/* location이 string인 경우와 객체인 경우 모두 처리 */}
                                    {typeof cls.location === 'string'
                                      ? cls.location
                                      : (cls.location?.name || (cls.location_id ? '수영장' : '장소 미정'))}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    예약 {cls.reservations && cls.reservations[0]?.count || 0}/{cls.max_students || cls.max_capacity}명
                                </span>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                          onClick={() => handleOpenClassDetail(cls)}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">디브리핑 & 미디어</span>
                          <span className="sm:hidden">관리</span>
                        </Button>
                        <Link href={`/admin/classes/availability?date=${cls.date}`}>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <ListChecks className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">상세보기</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 3. 빠른 메뉴 & 통계 (우측 1/3) */}
        <div className="space-y-6">
            {/* 통계 요약 */}
            <div className="grid grid-cols-1 gap-4">
                <Link href="/admin/classes/availability">
                    <Card className="hover:bg-slate-50 cursor-pointer transition-colors border-l-4 border-l-green-500">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
                                이번 주 수업
                                <Calendar className="w-4 h-4 text-green-600" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                            <div className="text-2xl font-bold">{upcomingClassesCount}건</div>
                            <p className="text-xs text-slate-500 mt-1">예정된 스케줄</p>
                        </CardContent>
                    </Card>
                </Link>

                <QuickRequestApproval
                    requests={topPendingRequests}
                    totalPendingCount={pendingClassRequests}
                />

                <QuickCertActions
                    certificates={topPendingCertificates}
                    totalPendingCount={pendingCertificates}
                />

                {/* 과정 신청 대기 */}
                <PendingCourseRequests requests={pendingCourseRequests} />

                {/* 5.4.1 크레딧 충전 요청 알림 (Design Only - Pending Implementation) */}
                <Card className="border-l-4 border-l-slate-300 opacity-70 cursor-not-allowed">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 flex justify-between">
                            크레딧 충전 요청
                            <CreditCard className="w-4 h-4 text-slate-600" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1">
                         <div className="text-2xl font-bold">0건</div>
                         <p className="text-xs text-slate-500 mt-1">준비 중인 기능입니다</p>
                    </CardContent>
                </Card>
            </div>
            
            {/* 최근 알림 / 메모 */}
            <Card>
                <CardHeader className="pb-3 border-b bg-slate-50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Bell className="w-4 h-4" /> 최근 알림
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        <div className="p-4 text-sm text-slate-500 text-center py-8">
                            새로운 알림이 없습니다.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* ClassDetailModal for Debriefing & Media */}
      {selectedClass && (
        <ClassDetailModal
          classData={selectedClass}
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          onRefresh={() => window.location.reload()}
        />
      )}
    </div>
  )
}
