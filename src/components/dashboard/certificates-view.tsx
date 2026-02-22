'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Award, Check, Clock, AlertCircle, Coins, Loader2 } from 'lucide-react'
import { formatCredits } from '@/lib/credit-constants'
import { useToast } from '@/hooks/use-toast'
import { applyCertificate } from '@/app/admin/actions/certificates-v2'

interface CertificatesViewProps {
  certificates: any[]
  courseProgress: any[]
  userCredits: number
}

export function CertificatesView({
  certificates,
  courseProgress,
  userCredits,
}: CertificatesViewProps) {
  // 보유 자격증 (발급 완료)
  const ownedCertificates = certificates.filter((c) => c.status === 'issued')

  // 신청 중 자격증
  const pendingCertificates = certificates.filter(
    (c) => c.status === 'pending' || c.status === 'approved'
  )

  // 신청 가능한 레벨 (진행 완료된 과정 중 자격증이 아직 없는 것)
  const availableLevels = courseProgress
    .filter((cp) => {
      // 과정이 완료되었고
      const isCompleted = cp.status === 'completed'
      // 해당 레벨의 자격증 발급이 진행 중이거나 완료되었으면
      const hasNoCertificate = !certificates.some(
        (cert) => cert.course_level === cp.course_level && ['issued', 'pending', 'approved'].includes(cert.status)
      )
      return isCompleted && hasNoCertificate
    })
    .map((cp) => {
      const rejectedCert = certificates
        .filter(cert => cert.course_level === cp.course_level && cert.status === 'rejected')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        
      return {
        level: cp.course_level,
        requiredCredits: getLevelCreditCost(cp.course_level),
        canApply: userCredits >= getLevelCreditCost(cp.course_level),
        rejectionReason: rejectedCert?.rejection_reason || null
      }
    })

  const [applyingLevel, setApplyingLevel] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const handleApply = (level: string, requiredCredits: number) => {
    setApplyingLevel(level)
    startTransition(async () => {
      const result = await applyCertificate({
        certificate_level: level,
        credit_paid: requiredCredits
      })

      if (result.success) {
        toast({
          title: '자격증 신청 완료',
          description: result.message,
        })
      } else {
        toast({
          title: '신청 실패',
          description: result.message,
          variant: 'destructive',
        })
      }
      setApplyingLevel(null)
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'issued':
        return (
          <Badge variant="default" className="bg-green-600">
            <Check className="h-3 w-3 mr-1" />
            발급완료
          </Badge>
        )
      case 'approved':
        return (
          <Badge variant="default" className="bg-blue-600">
            <Clock className="h-3 w-3 mr-1" />
            승인됨
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            신청중
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            반려됨
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

const router = useRouter()
        return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            자격증 관리
          </h1>
          <p className="text-slate-500 mt-1">자격증 신청 및 발급 내역을 관리하세요</p>
        </div>
      </div>

      {/* 보유 자격증 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            보유 자격증
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ownedCertificates.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>보유한 자격증이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownedCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 border-amber-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-amber-600 text-white rounded-full p-3">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{cert.course_level}</p>
                      <p className="text-sm text-slate-600">
                        발급일:{' '}
                        {cert.issued_at
                          ? new Date(cert.issued_at).toLocaleDateString('ko-KR')
                          : '-'}
                      </p>
                      {cert.certificate_number && (
                        <p className="text-xs text-slate-500">번호: {cert.certificate_number}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(cert.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 신청 가능 */}
      {availableLevels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-600" />
              신청 가능
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableLevels.map((level) => (
                <div key={level.level} className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                         <p className="font-semibold text-slate-900">{level.level}</p>
                         {level.rejectionReason && <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 border-0 h-5 px-1.5 text-[10px]">반려 기록 있음</Badge>}
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Coins className="h-3 w-3" />
                        필요 크레딧: {formatCredits(level.requiredCredits)}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      disabled={!level.canApply || isPending}
                      onClick={() => handleApply(level.level, level.requiredCredits)}
                      className={level.rejectionReason && level.canApply ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                    >
                      {isPending && applyingLevel === level.level ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      {level.canApply ? (level.rejectionReason ? '재신청하기' : '신청하기') : '크레딧 부족'}
                    </Button>
                  </div>
                  
                  {level.rejectionReason && (
                    <div className="bg-red-50/80 border border-red-100 text-red-800 text-sm p-3 rounded-md flex items-start gap-2 shadow-sm">
                       <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                       <div className="leading-snug flex-1">
                         <span className="font-bold block mb-1 text-red-900">이전 신청 반려 사유</span>
                         {level.rejectionReason}
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 신청 중 */}
      {pendingCertificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-600" />
              신청 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{cert.course_level}</p>
                    <p className="text-sm text-slate-600">
                      신청일: {new Date(cert.created_at).toLocaleDateString('ko-KR')}
                    </p>
                    {cert.admin_note && (
                      <p className="text-xs text-slate-500 mt-1">메모: {cert.admin_note}</p>
                    )}
                  </div>
                  {getStatusBadge(cert.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 안내 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">자격증 신청 안내</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>과정을 모두 완료하면 자격증을 신청할 수 있습니다</li>
                <li>신청 후 관리자 승인을 거쳐 발급됩니다</li>
                <li>자격증 발급에는 별도의 크레딧이 필요합니다</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 레벨별 자격증 비용 (임시 - 실제로는 설정에서 가져와야 함)
function getLevelCreditCost(level: string): number {
  const costs: Record<string, number> = {
    입문: 50,
    초급: 100,
    중급: 150,
    고급: 200,
  }
  return costs[level] || 100
}
