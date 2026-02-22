'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Coins,
  Calendar,
  TrendingUp,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  Plus,
  User,
  Bell,
  Flame,
  PartyPopper,
  Mail
} from 'lucide-react'
import { formatCredits } from '@/lib/credit-constants'
import { UpcomingClassDialog } from '@/components/dashboard/upcoming-class-dialog'

interface DashboardHomeProps {
  profile: any
  upcomingReservations: any[]
  courseProgress: any[]
  latestDebriefing: any | null
  expiringCredits: number // 현재 DB 구조상 0으로 전달됨
}

export function DashboardHome({
  profile,
  upcomingReservations,
  courseProgress,
  latestDebriefing,
  expiringCredits,
}: DashboardHomeProps) {
  const currentCourse = courseProgress.find((c) => c.status === 'in_progress')
  const [selectedReservation, setSelectedReservation] = useState<any>(null)

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-xl space-y-6 pb-24">
      {/* 1. 상단 헤더: 로고/알림/프로필 (SiteHeader에 있지만 모바일 대시보드 느낌을 위해 추가 가능, 
          하지만 기획서 5.2.3 구성요소에 따라 본문 상단에 배치) */}
      <div className="flex justify-between items-center mb-2">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                {/* 프로필 이미지가 있다면 Image 컴포넌트 사용, 없으면 아이콘 */}
                <User className="w-6 h-6 text-slate-400" />
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                {profile?.name}님
                </h1>
                <p className="text-xs text-slate-500">오늘도 안전한 다이빙 되세요!</p>
            </div>
         </div>
         <Button variant="ghost" size="icon" className="text-slate-400 relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
         </Button>
      </div>

      {/* 2. 내 크레딧 (Gradient Card) */}
      <Card className="bg-linear-to-br from-blue-600 to-indigo-700 text-white border-none shadow-lg shadow-blue-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 opacity-90">
              <Coins className="h-5 w-5" />
              <span className="font-medium">내 크레딧</span>
            </div>
            <Link href="/dashboard/credits">
               <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 px-3 py-1 cursor-pointer">
                  내역보기 <ArrowRight className="w-3 h-3 ml-1" />
               </Badge>
            </Link>
          </div>
          
          <div className="flex justify-between items-end">
             <div>
                <span className="text-4xl font-bold tracking-tight">
                    {Math.max(profile?.general_credits || 0, profile?.credits || 0).toLocaleString()}
                </span>
                <span className="text-lg ml-1 opacity-80">C</span>
             </div>
             <Link href="/dashboard/credits/charge">
                <Button className="bg-white text-blue-700 hover:bg-blue-50 border-0 font-bold shadow-sm">
                    <Plus className="w-4 h-4 mr-1" /> 충전하기
                </Button>
             </Link>
          </div>

          {/* 만료 예정 표시 (데이터 연동 전이라도 UI 구성) */}
          {expiringCredits > 0 ? (
             <div className="mt-4 flex items-center gap-2 p-2 bg-white/10 rounded text-sm backdrop-blur-sm animate-pulse">
                <AlertCircle className="w-4 h-4 text-amber-300" />
                <span><b className="text-amber-300">{expiringCredits}C</b>가 곧 만료됩니다.</span>
             </div>
          ) : (
             <div className="mt-4 flex justify-between text-sm opacity-70">
                <span>일반/보너스 합계</span>
                {/* 상세 구분은 클릭해서 확인하도록 유도 */}
             </div>
          )}
        </CardContent>
      </Card>

      {/* 3. 다가오는 수업 */}
      <section>
        <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-700" />
                다가오는 수업
            </h2>
            {upcomingReservations.length > 0 && (
                <Link href="/dashboard/reservations" className="text-sm text-slate-500 hover:text-blue-600">
                    전체보기
                </Link>
            )}
        </div>
        
        {upcomingReservations.length === 0 ? (
            <Card className="border-dashed shadow-sm bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-slate-500 mb-4 font-medium">아직 예약된 수업이 없습니다</p>
                    <Link href="/classes">
                        <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                            수업 예약하러 가기
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-3">
                {upcomingReservations.map(reservation => (
                    <div key={reservation.id} onClick={() => setSelectedReservation(reservation)}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg w-14 h-14 text-blue-700">
                                        <span className="text-xs font-semibold">
                                            {new Date(reservation.classes.date).toLocaleDateString('ko-KR', { month: 'short' })}
                                        </span>
                                        <span className="text-xl font-bold leading-none">
                                            {new Date(reservation.classes.date).getDate()}
                                        </span>
                                    </div>
                                    <div>
                                        <Badge variant="secondary" className="mb-1 text-xs">
                                            {reservation.classes.type === 'pool' ? '풀장 교육' : 
                                             reservation.classes.type === 'theory' ? '이론 교육' : '트레이닝'}
                                        </Badge>
                                        <h3 className="font-bold text-slate-800">
                                            {reservation.classes.time.substring(0, 5)} 수업
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                                            {reservation.classes.title || reservation.classes.location}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-slate-300" />
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
        )}
      </section>

      {/* 4. 내 진도 */}
      <section>
        <div className="flex justify-between items-center mb-3 px-1">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-700" />
                내 진도
            </h2>
            <Link href="/dashboard/progress" className="text-sm text-slate-500 hover:text-blue-600">
                상세보기
            </Link>
        </div>

        {!currentCourse ? (
             <Card className="border-dashed shadow-sm bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-slate-500 mb-2">진행 중인 교육 과정이 없습니다</p>
                    <Link href="/dashboard/courses">
                        <Button variant="link" className="text-blue-600 p-0 h-auto">
                            교육 과정 둘러보기 <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        ) : (
            <Card>
                <CardContent className="p-5">
                    {(() => {
                        const minPoolSessions = currentCourse.session_count || 3
                        const totalSteps = 1 + minPoolSessions
                        const currentSteps = (currentCourse.theory_completed ? 1 : 0) + currentCourse.pool_sessions_completed
                        const completedPercentage = Math.min((currentSteps / totalSteps) * 100, 100)
                        
                        return (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {currentCourse.course_level} 과정
                                        </span>
                                        <h3 className="font-bold text-lg mt-1">
                                            {currentCourse.status === 'in_progress' ? <span className="flex items-center gap-1">교육 진행중 <Flame className="w-5 h-5 text-orange-500" /></span> : <span className="flex items-center gap-1">수료 완료 <PartyPopper className="w-5 h-5 text-yellow-500" /></span>}
                                        </h3>
                                    </div>
                                    <div className="text-right">
                                         <span className="text-2xl font-bold text-slate-900">
                                            {Math.round(completedPercentage)}%
                                         </span>
                                    </div>
                                </div>
                                
                                <Progress value={completedPercentage} className="h-3 mb-4" />
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-slate-500">이론 교육</span>
                                        <span className={`font-bold ${currentCourse.theory_completed ? 'text-blue-600' : 'text-slate-400'}`}>
                                            {currentCourse.theory_completed ? '완료' : '미완료'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between">
                                        <span className="text-slate-500">풀장 교육</span>
                                        <span className="font-bold text-slate-900">
                                            {currentCourse.pool_sessions_completed} / {minPoolSessions}회
                                        </span>
                                    </div>
                                </div>
                            </>
                        )
                    })()}
                </CardContent>
            </Card>
        )}
      </section>

      {/* 5. 최근 디브리핑 (미리보기) */}
      {latestDebriefing && (
          <section>
            <div className="flex justify-between items-center mb-3 px-1">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-slate-700" />
                    최근 디브리핑
                </h2>
                <Link href="/dashboard/debriefings" className="text-sm text-slate-500 hover:text-blue-600">
                    전체보기
                </Link>
            </div>
            <Link href="/dashboard/debriefings">
                <Card className="bg-slate-900 text-white cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <Badge variant="outline" className="text-slate-300 border-slate-600 mb-2">
                                    {new Date(latestDebriefing.created_at).toLocaleDateString()}
                                </Badge>
                                <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                                    강사 피드백 도착 <Mail className="w-4 h-4 text-blue-300" />
                                </CardTitle>
                            </div>
                            <ArrowRight className="text-slate-400 w-5 h-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-white/10 rounded-lg p-3 text-sm text-slate-200 line-clamp-2">
                            &quot;{latestDebriefing.performance || latestDebriefing.strengths || '수고하셨습니다!'}&quot;
                        </div>
                    </CardContent>
                </Card>
            </Link>
          </section>
      )}

      {/* 다가오는 수업 클릭 시 뜨는 모달 */}
      <UpcomingClassDialog
        reservation={selectedReservation}
        isOpen={!!selectedReservation}
        onClose={() => setSelectedReservation(null)}
      />
    </div>
  )
}
