'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  approveCertificate,
  rejectCertificate,
  issueCertificate,
  issueCertificateDirectly,
} from '@/app/admin/actions/certificates-v2'
import { Loader2, CheckCircle, XCircle, Award } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Certificate {
  id: number
  user_id: string
  certificate_level: string
  status: string
  certificate_number: string | null
  applied_at: string
  approved_at: string | null
  issued_at: string | null
  credit_paid: number
  rejection_reason: string | null
  admin_notes: string | null
  user?: {
    id: string
    name: string
    email: string
  }
}

interface CertificatesManagementProps {
  pendingCertificates: Certificate[]
  allCertificates: Certificate[]
}

const statusLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: '대기중', variant: 'outline' },
  approved: { label: '승인됨', variant: 'default' },
  issued: { label: '발급완료', variant: 'secondary' },
  rejected: { label: '거부됨', variant: 'destructive' },
}

const courseLevels = ['입문', '초급', '중급', '고급']

export function CertificatesManagement({
  pendingCertificates: initialPending,
  allCertificates: initialAll,
}: CertificatesManagementProps) {

  const [isPending, startTransition] = useTransition()
  const [pendingCertificates, setPendingCertificates] = useState(initialPending)
  const [allCertificates, setAllCertificates] = useState(initialAll)

  // 승인 다이얼로그
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  // 거부 다이얼로그
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // 발급 다이얼로그
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [certificateNumber, setCertificateNumber] = useState('')

  // 직접 발급 다이얼로그
  const [directIssueOpen, setDirectIssueOpen] = useState(false)
  const [directUserId, setDirectUserId] = useState('')
  const [directLevel, setDirectLevel] = useState('')
  const [directNumber, setDirectNumber] = useState('')
  const [directNotes, setDirectNotes] = useState('')

  const refreshData = () => {
    window.location.reload()
  }

  const handleApprove = () => {
    if (!selectedCert) return

    startTransition(async () => {
      const result = await approveCertificate({
        certificate_id: selectedCert.id,
        admin_notes: adminNotes || undefined,
      })

      if (result.success) {
        toast.success('승인 완료', {
          description: result.message,
        })
        setApproveDialogOpen(false)
        setAdminNotes('')
        refreshData()
      } else {
        toast.error('승인 실패', {
          description: result.message,
        })
      }
    })
  }

  const handleReject = () => {
    if (!selectedCert || !rejectionReason) {
      toast.error('입력 오류', {
        description: '거부 사유를 입력해주세요.',
      })
      return
    }

    startTransition(async () => {
      const result = await rejectCertificate({
        certificate_id: selectedCert.id,
        rejection_reason: rejectionReason,
        admin_notes: adminNotes || undefined,
      })

      if (result.success) {
        toast.success('거부 완료', {
          description: result.message,
        })
        setRejectDialogOpen(false)
        setRejectionReason('')
        setAdminNotes('')
        refreshData()
      } else {
        toast.error('거부 실패', {
          description: result.message,
        })
      }
    })
  }

  const handleIssue = () => {
    if (!selectedCert || !certificateNumber) {
      toast.error('입력 오류', {
        description: '자격증 레벨을 입력해주세요.',
      })
      return
    }

    startTransition(async () => {
      const result = await issueCertificate({
        certificate_id: selectedCert.id,
        certificate_number: certificateNumber,
        admin_notes: adminNotes || undefined,
      })

      if (result.success) {
        toast.success('발급 완료', {
          description: result.message,
        })
        setIssueDialogOpen(false)
        setCertificateNumber('')
        setAdminNotes('')
        refreshData()
      } else {
        toast.error('발급 실패', {
          description: result.message,
        })
      }
    })
  }

  const handleDirectIssue = () => {
    if (!directUserId || !directLevel || !directNumber) {
      toast.error('입력 오류', {
        description: '모든 필드를 입력해주세요.',
      })
      return
    }

    startTransition(async () => {
      const result = await issueCertificateDirectly({
        user_id: directUserId,
        certificate_level: directLevel,
        certificate_number: directNumber,
        admin_notes: directNotes || undefined,
      })

      if (result.success) {
        toast.success('발급 완료', {
          description: result.message,
        })
        setDirectIssueOpen(false)
        setDirectUserId('')
        setDirectLevel('')
        setDirectNumber('')
        setDirectNotes('')
        refreshData()
      } else {
        toast.error('발급 실패', {
          description: result.message,
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 직접 발급 버튼 */}
      <div className="flex justify-end">
        <Dialog open={directIssueOpen} onOpenChange={setDirectIssueOpen}>
          <DialogTrigger asChild>
            <Button>
              <Award className="mr-2 h-4 w-4" />
              직접 발급
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>자격증 직접 발급</DialogTitle>
              <DialogDescription>
                신청 절차 없이 자격증을 바로 발급합니다
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>학생 ID</Label>
                <Input
                  value={directUserId}
                  onChange={(e) => setDirectUserId(e.target.value)}
                  placeholder="UUID 형식의 사용자 ID"
                />
              </div>
              <div>
                <Label>자격증 레벨</Label>
                <Select value={directLevel} onValueChange={setDirectLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>자격증 번호</Label>
                <Input
                  value={directNumber}
                  onChange={(e) => setDirectNumber(e.target.value)}
                  placeholder="예: FD-2026-001"
                />
              </div>
              <div>
                <Label>메모 (선택)</Label>
                <Textarea
                  value={directNotes}
                  onChange={(e) => setDirectNotes(e.target.value)}
                  placeholder="관리자 메모..."
                  rows={2}
                />
              </div>
              <Button onClick={handleDirectIssue} disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    발급 중...
                  </>
                ) : (
                  '발급하기'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            대기중 ({pendingCertificates.length})
          </TabsTrigger>
          <TabsTrigger value="all">전체 ({allCertificates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingCertificates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-slate-500 py-8">
                  대기 중인 자격증 신청이 없습니다
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingCertificates.map((cert) => (
              <CertificateCard
                key={cert.id}
                certificate={cert}
                onApprove={() => {
                  setSelectedCert(cert)
                  setApproveDialogOpen(true)
                }}
                onReject={() => {
                  setSelectedCert(cert)
                  setRejectDialogOpen(true)
                }}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {allCertificates.map((cert) => (
            <CertificateCard
              key={cert.id}
              certificate={cert}
              onIssue={
                cert.status === 'approved'
                  ? () => {
                      setSelectedCert(cert)
                      setIssueDialogOpen(true)
                    }
                  : undefined
              }
            />
          ))}
        </TabsContent>
      </Tabs>

      {/* 승인 다이얼로그 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자격증 승인</DialogTitle>
            <DialogDescription>
              {selectedCert?.user?.name}님의 {selectedCert?.certificate_level} 자격증 신청을
              승인하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>관리자 메모 (선택)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="승인 메모..."
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setApproveDialogOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button onClick={handleApprove} disabled={isPending} className="flex-1">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    승인 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    승인하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 거부 다이얼로그 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자격증 거부</DialogTitle>
            <DialogDescription>
              {selectedCert?.user?.name}님의 {selectedCert?.certificate_level} 자격증 신청을
              거부하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>거부 사유 *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="거부 사유를 입력하세요..."
                rows={3}
              />
            </div>
            <div>
              <Label>관리자 메모 (선택)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="관리자 메모..."
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setRejectDialogOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                onClick={handleReject}
                disabled={isPending}
                variant="destructive"
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    거부 중...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    거부하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 발급 다이얼로그 */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자격증 발급</DialogTitle>
            <DialogDescription>
              {selectedCert?.user?.name}님에게 {selectedCert?.certificate_level} 자격증을
              발급합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>자격증 레벨 *</Label>
              <Input
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="예: 아이다2"
              />
            </div>
            <div>
              <Label>관리자 메모 (선택)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="발급 메모..."
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIssueDialogOpen(false)}
                className="flex-1"
              >
                취소
              </Button>
              <Button onClick={handleIssue} disabled={isPending} className="flex-1">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    발급 중...
                  </>
                ) : (
                  <>
                    <Award className="mr-2 h-4 w-4" />
                    발급하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CertificateCard({
  certificate,
  onApprove,
  onReject,
  onIssue,
}: {
  certificate: Certificate
  onApprove?: () => void
  onReject?: () => void
  onIssue?: () => void
}) {
  const statusInfo = statusLabels[certificate.status] || statusLabels.pending

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">
              {certificate.user?.name || '알 수 없음'}
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              {certificate.user?.email}
            </p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">자격증 레벨:</span>
              <p className="font-medium">{certificate.certificate_level}</p>
            </div>
            <div>
              <span className="text-slate-600">신청일:</span>
              <p className="font-medium">
                {new Date(certificate.applied_at).toLocaleDateString('ko-KR')}
              </p>
            </div>
            {certificate.certificate_number && (
              <div>
                <span className="text-slate-600">자격증 레벨:</span>
                <p className="font-medium">{certificate.certificate_number}</p>
              </div>
            )}
            {certificate.approved_at && (
              <div>
                <span className="text-slate-600">승인일:</span>
                <p className="font-medium">
                  {new Date(certificate.approved_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
            {certificate.issued_at && (
              <div>
                <span className="text-slate-600">발급일:</span>
                <p className="font-medium">
                  {new Date(certificate.issued_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
          </div>

          {certificate.rejection_reason && (
            <div className="p-3 bg-red-50 rounded-lg text-sm">
              <p className="font-semibold text-red-900 mb-1">거부 사유:</p>
              <p className="text-red-700">{certificate.rejection_reason}</p>
            </div>
          )}

          {certificate.admin_notes && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="font-semibold text-slate-900 mb-1">관리자 메모:</p>
              <p className="text-slate-700">{certificate.admin_notes}</p>
            </div>
          )}

          {(onApprove || onReject || onIssue) && (
            <div className="flex gap-2 pt-2">
              {onApprove && (
                <Button onClick={onApprove} size="sm" className="flex-1">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  승인
                </Button>
              )}
              {onReject && (
                <Button onClick={onReject} size="sm" variant="outline" className="flex-1">
                  <XCircle className="mr-2 h-4 w-4" />
                  거부
                </Button>
              )}
              {onIssue && (
                <Button onClick={onIssue} size="sm" className="flex-1">
                  <Award className="mr-2 h-4 w-4" />
                  발급
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
