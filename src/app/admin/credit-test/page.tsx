'use client'

/**
 * 크레딧 시스템 테스트 페이지 (Ver 2.0)
 * 
 * 주요 업데이트:
 * - 트레이닝 (1인/그룹) 예약 테스트 추가
 * - 모든 자격증 (AIDA 1~3, Pool) 신청 버튼 추가
 * - [관리자용] 자격증 승인/거절 시뮬레이터 추가
 * - 데이터 로딩 안전장치 강화
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { CheckCircle2, XCircle, Receipt, Glasses, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  getUserCredits, 
  purchasePackage, 
  deductCreditsForReservation, 
  getCreditTransactions
} from '@/app/admin/actions/credits'
import { 
  requestCertification,
  getCertificationRequests,
  getAllCertificationRequests, // 관리자용 전체 조회
  approveCertificationRequest, // 승인
  rejectCertificationRequest   // 거절
} from '@/app/admin/actions/certifications'
import {
  CURRICULUM_PACKAGES,
  CERTIFICATION_CREDIT_COSTS,
  TRAINING_CREDIT_COSTS,
  LESSON_CREDIT_COSTS,
  formatCredits,
  formatKRW,
  type PackageType,
} from '@/lib/credit-constants'
import type {
  CreditTransaction,
  CertificationRequest,
  CertificationType,
} from '@/types/credit'

export default function CreditSystemTestPage() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentCredits, setCurrentCredits] = useState<number>(0)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [certRequests, setCertRequests] = useState<CertificationRequest[]>([])
  const [pendingRequests, setPendingRequests] = useState<CertificationRequest[]>([]) // (관리자용) 대기 목록
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 1. 초기 데이터 로드
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          console.error("Auth Error:", error)
          setLoading(false)
          return
        }

        setUser(user)

        // 관리자 여부 확인 (나중에 RLS로 막히더라도 UI 처리를 위해)
         // *참고: 실제 권한 체크는 서버 액션에서 다시 함
         const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile?.role === 'admin') {
          setIsAdmin(true)
        }

        // 데이터 로드 시작
        await refreshData(user.id, profile?.role === 'admin')

      } catch (e) {
        console.error("Init Error:", e)
        setLoading(false)
      }
    }
    init()
  }, [])

  // 2. 데이터 새로고침 (Fail-safe)
  const refreshData = async (userId: string, adminMode = false) => {
    try {
      // 병렬 요청 대신 개별 요청으로 안전하게 처리
      
      // 1) 내 크레딧
      try {
        const credits = await getUserCredits(userId)
        setCurrentCredits(credits)
      } catch (e) {
        console.error("크레딧 조회 실패")
      }

      // 2) 내 거래 내역
      try {
        const history = await getCreditTransactions(userId, 10)
        setTransactions(history)
      } catch (e) {
        console.error("거래 내역 조회 실패")
      }

      // 3) 내 자격증 신청 내역
      try {
        const myCerts = await getCertificationRequests(userId)
        setCertRequests(myCerts)
      } catch (e) {
        console.error("내 자격증 조회 실패")
      }

      // 4) [관리자용] 전체 승인 대기 목록
      if (adminMode) {
        try {
          const all = await getAllCertificationRequests()
          // 대기중인 것만 필터링
          setPendingRequests(all.filter(req => req.status === 'pending'))
        } catch (e) {
          console.error("관리자 데이터 조회 실패 (권한 부족 가능성)")
        }
      }

    } catch (globalError) {
      console.error("치명적 에러:", globalError)
    } finally {
      setLoading(false)
    }
  }

  // -----------------------
  // 액션 핸들러들
  // -----------------------

  // 패키지 구매
  const handlePurchase = async (pkgType: PackageType) => {
    if (!user) return
    setActionLoading(true)
    setMessage(null)
    try {
      const result = await purchasePackage(user.id, pkgType, 'test-card', 'TEST-' + Date.now(), '테스트 페이지 구매')
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        await refreshData(user.id, isAdmin)
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: '구매 실패: ' + e.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 수업/트레이닝 예약 (차감 테스트)
  const handleDeduct = async (name: string, cost: number) => {
    if (!user) return
    setActionLoading(true)
    setMessage(null)
    try {
      const result = await deductCreditsForReservation(user.id, cost, crypto.randomUUID(), name)
      if (result.success) {
        setMessage({ type: 'success', text: `${name} 예약 완료 (-${formatCredits(cost)})` })
        await refreshData(user.id, isAdmin)
      } else {
        setMessage({ type: 'error', text: result.message || '크레딧 차감에 실패했습니다.' })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: '차감 실패: ' + e.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 자격증 신청
  const handleCertRequest = async (type: CertificationType, cost: number) => {
    if (!user) return
    setActionLoading(true)
    setMessage(null)
    try {
      const result = await requestCertification(user.id, type)
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        await refreshData(user.id, isAdmin)
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: '신청 실패: ' + e.message })
    } finally {
      setActionLoading(false)
    }
  }

  // [관리자] 자격증 승인/거절
  const handleAdminAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!user) return
    setActionLoading(true)
    setMessage(null)

    try {
      let result
      if (action === 'approve') {
        result = await approveCertificationRequest(requestId, '관리자 시뮬레이터 자동 승인')
      } else {
        // 거절 시 환불됨
        result = await rejectCertificationRequest(requestId, '관리자 시뮬레이터 거절 (환불 테스트)')
      }

      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        await refreshData(user.id, isAdmin)
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: '관리자 작업 실패: ' + e.message })
    } finally {
      setActionLoading(false)
    }
  }

  const helperFormatDate = (d: string) => {
    return new Date(d).toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  // -----------------------
  // 렌더링
  // -----------------------

  if (loading) return <div className="p-10 text-center"><Loader2 className="w-4 h-4 animate-spin inline-block mr-2" /> 시스템 초기화 중...</div>
  
  if (!user) {
    return (
      <div className="p-10 text-center">
        <Alert variant="destructive"><AlertTitle>로그인 필요</AlertTitle></Alert>
        <Button className="mt-4" onClick={()=>window.location.href='/login'}>로그인하러 가기</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 pb-20">
      
      {/* 1. 상단 정보 바 */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Glasses className="w-6 h-6 text-blue-500" /> 크레딧 & 자격증 통합 테스트
            {isAdmin ? <Badge>관리자 권한</Badge> : <Badge variant="secondary">일반 유저</Badge>}
          </h1>
          <p className="text-gray-500 text-sm mt-1">로그인 계정: {user.email}</p>
        </div>
        <div className="text-right bg-slate-50 p-4 rounded-xl border min-w-[200px]">
          <div className="text-xs text-slate-500 font-bold uppercase">Current Balance</div>
          <div className="text-3xl font-black text-blue-600">
            {currentCredits.toLocaleString()} <span className="text-lg text-slate-400">C</span>
          </div>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
          <AlertTitle className="flex items-center gap-2">{message.type === 'success' ? <><CheckCircle2 className="w-4 h-4 text-green-600" /> 성공</> : <><XCircle className="w-4 h-4 text-red-600" /> 오류</>}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* 2. 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 좌측: 크레딧 충전 및 사용 */}
        <div className="space-y-6">
          
          {/* A. 패키지 구매 */}
          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="bg-blue-50/50 pb-3">
              <CardTitle className="text-blue-700 text-lg">① 크레딧 충전 (패키지 구매)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {Object.values(CURRICULUM_PACKAGES).map((pkg) => (
                <div key={pkg.id} className="flex justify-between items-center p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-bold text-sm">{pkg.name}</div>
                    <div className="text-xs text-slate-500">{formatKRW(pkg.price)}</div>
                  </div>
                  <Button size="sm" onClick={() => handlePurchase(pkg.id)} disabled={actionLoading} className="bg-blue-600 h-8 text-xs">
                    +{pkg.totalCredits} C 구매
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* B. 수업/트레이닝 예약 */}
          <Card className="border-red-100 shadow-sm">
            <CardHeader className="bg-red-50/50 pb-3">
              <CardTitle className="text-red-700 text-lg">② 수업/트레이닝 예약 (차감)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {/* 기본 수업 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3 bg-white text-center">
                  <div className="font-bold text-sm">이론 교육</div>
                  <div className="text-red-500 font-bold text-xs mb-2">-{LESSON_CREDIT_COSTS.THEORY} C</div>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => handleDeduct('이론 교육', LESSON_CREDIT_COSTS.THEORY)} disabled={actionLoading}>예약</Button>
                </div>
                <div className="border rounded-lg p-3 bg-white text-center">
                  <div className="font-bold text-sm">풀장 교육</div>
                  <div className="text-red-500 font-bold text-xs mb-2">-{LESSON_CREDIT_COSTS.POOL} C</div>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => handleDeduct('풀장 교육', LESSON_CREDIT_COSTS.POOL)} disabled={actionLoading}>예약</Button>
                </div>
              </div>
              
              {/* 트레이닝 (요청사항 반영) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3 bg-white text-center ring-1 ring-red-100">
                  <div className="font-bold text-sm">트레이닝 (1인)</div>
                  <div className="text-red-500 font-bold text-xs mb-2">-{TRAINING_CREDIT_COSTS.SOLO} C</div>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs hover:bg-red-50 hover:text-red-600" onClick={() => handleDeduct('트레이닝(1인)', TRAINING_CREDIT_COSTS.SOLO)} disabled={actionLoading}>예약하기</Button>
                </div>
                <div className="border rounded-lg p-3 bg-white text-center ring-1 ring-red-100">
                  <div className="font-bold text-sm">트레이닝 (그룹)</div>
                  <div className="text-red-500 font-bold text-xs mb-2">-{TRAINING_CREDIT_COSTS.GROUP} C</div>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs hover:bg-red-50 hover:text-red-600" onClick={() => handleDeduct('트레이닝(그룹)', TRAINING_CREDIT_COSTS.GROUP)} disabled={actionLoading}>예약하기</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 우측: 자격증 및 관리자 기능 */}
        <div className="space-y-6">
          
          {/* C. 자격증 신청 */}
          <Card className="border-green-100 shadow-sm">
            <CardHeader className="bg-green-50/50 pb-3">
              <CardTitle className="text-green-700 text-lg">③ 자격증 발급 신청</CardTitle>
              <CardDescription className="text-xs">신청 시 크레딧 차감, 거절 시 자동 환불</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CERTIFICATION_CREDIT_COSTS).map(([key, cost]) => (
                  <Button 
                    key={key}
                    variant="outline" 
                    className="h-auto py-2 flex flex-col items-center justify-center border-green-200 hover:bg-green-50 hover:text-green-700"
                    onClick={() => handleCertRequest(key as CertificationType, cost)}
                    disabled={actionLoading}
                  >
                    <span className="font-bold text-sm">{key}</span>
                    <span className="text-xs text-green-600">-{cost} C</span>
                  </Button>
                ))}
              </div>

              {/* 내 신청 현황 */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500">내 신청 내역 ({certRequests.length})</span>
                </div>
                <div className="space-y-1 max-h-[120px] overflow-y-auto">
                  {certRequests.length === 0 ? <p className="text-center text-xs text-slate-400 py-2">내역 없음</p> : 
                    certRequests.map(req => (
                      <div key={req.id} className="flex justify-between items-center bg-white border px-2 py-1 rounded text-xs">
                        <span>{req.certification_type}</span>
                        <Badge className={`h-5 px-1 ${
                          req.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                          req.status === 'approved' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                          'bg-red-100 text-red-800 hover:bg-red-100'
                        }`}>
                          {req.status === 'pending' ? '대기' : req.status === 'approved' ? '승인' : '거절'}
                        </Badge>
                      </div>
                    ))
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* D. 관리자 승인 시뮬레이터 */}
          <Card className="border-purple-100 shadow-lg ring-1 ring-purple-200">
            <CardHeader className="bg-purple-50 pb-3">
              <CardTitle className="text-purple-700 text-lg flex justify-between items-center">
                ④ 관리자 승인 시뮬레이터
                {!isAdmin && <Badge variant="destructive" className="text-xs">관리자 권한 필요</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">
                실제로는 관리자 페이지에만 있는 기능입니다. <br/>
                여기서 승인/거절을 테스트해보세요. (거절 시 환불됨)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 max-h-[300px] overflow-y-auto">
              {!isAdmin ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  관리자 계정으로 로그인해야 테스트할 수 있습니다.<br/>
                  (현재 계정 role이 admin이 아닙니다)
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded border border-dashed">
                  현재 승인 대기중인 요청이 없습니다.<br/>
                  위에서 자격증을 먼저 신청해보세요!
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="p-3 bg-white border border-purple-100 rounded-lg shadow-sm flex flex-col gap-2">
                       <div className="flex justify-between items-start">
                         <div>
                           <div className="font-bold text-sm text-purple-900">{req.certification_type}</div>
                           <div className="text-xs text-slate-500">신청자: {req.user_id.slice(0,6)}...</div>
                           <div className="text-xs text-slate-400">{helperFormatDate(req.created_at)}</div>
                         </div>
                         <Badge variant="outline" className="text-purple-600 border-purple-200">Pending</Badge>
                       </div>
                       <div className="flex gap-2 mt-1">
                         <Button className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleAdminAction(req.id, 'approve')} disabled={actionLoading}>
                           승인
                         </Button>
                         <Button className="flex-1 h-7 text-xs" variant="destructive" onClick={() => handleAdminAction(req.id, 'reject')} disabled={actionLoading}>
                           거절 (환불)
                         </Button>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 4. 영수증 (트랜잭션) */}
      <Card className="mt-8">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2"><Receipt className="w-5 h-5 text-slate-600" /> 실시간 거래 영수증</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-slate-500 font-medium">시간</th>
                  <th className="px-4 py-2 text-slate-500 font-medium">구분</th>
                  <th className="px-4 py-2 text-slate-500 font-medium">내용</th>
                  <th className="px-4 py-2 text-right text-slate-500 font-medium">변동</th>
                  <th className="px-4 py-2 text-right text-slate-500 font-medium">잔액</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 text-xs">{helperFormatDate(tx.created_at)}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline" className={
                        tx.transaction_type === 'purchase' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                        tx.transaction_type === 'deduct' ? 'text-red-600 border-red-200 bg-red-50' :
                        'text-slate-600'
                      }>
                        {tx.transaction_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{tx.memo}</td>
                    <td className={`px-4 py-2 text-right font-bold ${tx.amount > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 font-mono">{tx.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
