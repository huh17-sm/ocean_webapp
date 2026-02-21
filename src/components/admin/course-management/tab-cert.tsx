'use client'

/**
 * 자격증 관리 탭 컴포넌트
 *
 * 학생의 자격증 관련 작업을 처리:
 * - 자격증 신청 현황 보기
 * - 신청 승인/거부
 * - 자격증 번호 부여 (발급)
 * - 자격증 직접 발급
 * - 발급된 자격증 수정/삭제
 */

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Award,
  Check,
  X,
  Loader2,
  FileText,
  Send,
  AlertTriangle,
  Inbox,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  approveCertificate,
  rejectCertificate,
  issueCertificate,
  issueCertificateDirectly,
  updateCertificate,
  deleteCertificate,
} from '@/app/admin/actions/certificates-v2'

interface TabCertProps {
  userId: string
  courseLevel: string
  certificates: any[]
  onUpdate: () => void
}

export function TabCert({
  userId,
  courseLevel,
  certificates,
  onUpdate,
}: TabCertProps) {
  const [isPending, startTransition] = useTransition()
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  // 직접 발급 다이얼로그
  const [directIssueOpen, setDirectIssueOpen] = useState(false)
  const [certNumber, setCertNumber] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  // 발급 다이얼로그 (승인된 것에 번호 부여)
  const [issueDialogOpen, setIssueDialogOpen] = useState(false)
  const [issueCertId, setIssueCertId] = useState<number | null>(null)
  const [issueCertNumber, setIssueCertNumber] = useState('')

  // 거부 다이얼로그
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectCertId, setRejectCertId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // 수정 다이얼로그
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editCert, setEditCert] = useState<any>(null)
  const [editCertNumber, setEditCertNumber] = useState('')
  const [editAdminNotes, setEditAdminNotes] = useState('')

  // 삭제 확인 다이얼로그
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteCertId, setDeleteCertId] = useState<number | null>(null)
  const [deleteCertInfo, setDeleteCertInfo] = useState('')

  /** 승인 처리 */
  const handleApprove = (certId: number) => {
    setProcessingAction(`approve_${certId}`)
    startTransition(async () => {
      try {
        const result = await approveCertificate({ certificate_id: certId })
        if (result.success) {
          toast.success('자격증 신청이 승인되었습니다.')
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('승인 처리 중 오류가 발생했습니다.')
      } finally {
        setProcessingAction(null)
      }
    })
  }

  /** 거부 처리 */
  const handleReject = () => {
    if (!rejectCertId || !rejectReason.trim()) {
      toast.error('거부 사유를 입력해주세요.')
      return
    }

    setProcessingAction(`reject_${rejectCertId}`)
    startTransition(async () => {
      try {
        const result = await rejectCertificate({
          certificate_id: rejectCertId!,
          rejection_reason: rejectReason,
        })
        if (result.success) {
          toast.success('자격증 신청이 거부되었습니다.')
          setRejectDialogOpen(false)
          setRejectReason('')
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('거부 처리 중 오류가 발생했습니다.')
      } finally {
        setProcessingAction(null)
      }
    })
  }

  /** 발급 (승인된 자격증에 번호 부여) */
  const handleIssue = () => {
    if (!issueCertId || !issueCertNumber.trim()) {
      toast.error('자격증 번호를 입력해주세요.')
      return
    }

    setProcessingAction(`issue_${issueCertId}`)
    startTransition(async () => {
      try {
        const result = await issueCertificate({
          certificate_id: issueCertId!,
          certificate_number: issueCertNumber,
        })
        if (result.success) {
          toast.success('자격증이 발급되었습니다.')
          setIssueDialogOpen(false)
          setIssueCertNumber('')
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('발급 처리 중 오류가 발생했습니다.')
      } finally {
        setProcessingAction(null)
      }
    })
  }

  /** 직접 발급 (신청 절차 없이) */
  const handleDirectIssue = () => {
    if (!certNumber.trim()) {
      toast.error('자격증 번호를 입력해주세요.')
      return
    }

    setProcessingAction('direct_issue')
    startTransition(async () => {
      try {
        const result = await issueCertificateDirectly({
          user_id: userId,
          certificate_level: courseLevel,
          certificate_number: certNumber,
          admin_notes: adminNotes || undefined,
        })
        if (result.success) {
          toast.success('자격증이 직접 발급되었습니다.')
          setDirectIssueOpen(false)
          setCertNumber('')
          setAdminNotes('')
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('직접 발급 중 오류가 발생했습니다.')
      } finally {
        setProcessingAction(null)
      }
    })
  }

  /** 수정 다이얼로그 열기 */
  const openEditDialog = (cert: any) => {
    setEditCert(cert)
    setEditCertNumber(cert.certificate_number || '')
    setEditAdminNotes(cert.admin_notes || '')
    setEditDialogOpen(true)
  }

  /** 수정 처리 */
  const handleEdit = () => {
    if (!editCert) return

    setProcessingAction(`edit_${editCert.id}`)
    startTransition(async () => {
      try {
        const updates: Record<string, any> = {}
        if (editCertNumber !== (editCert.certificate_number || '')) {
          updates.certificate_number = editCertNumber
        }
        if (editAdminNotes !== (editCert.admin_notes || '')) {
          updates.admin_notes = editAdminNotes
        }

        if (Object.keys(updates).length === 0) {
          toast.info('변경 사항이 없습니다.')
          setEditDialogOpen(false)
          return
        }

        const result = await updateCertificate(editCert.id, updates)
        if (result.success) {
          toast.success('자격증 정보가 수정되었습니다.')
          setEditDialogOpen(false)
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('수정 중 오류가 발생했습니다.')
      } finally {
        setProcessingAction(null)
      }
    })
  }

  /** 삭제 확인 다이얼로그 열기 */
  const openDeleteDialog = (cert: any) => {
    setDeleteCertId(cert.id)
    setDeleteCertInfo(`${cert.certificate_level} - ${cert.certificate_number || '번호 없음'}`)
    setDeleteDialogOpen(true)
  }

  /** 삭제 처리 */
  const handleDelete = () => {
    if (!deleteCertId) return

    setProcessingAction(`delete_${deleteCertId}`)
    startTransition(async () => {
      try {
        const result = await deleteCertificate(deleteCertId!)
        if (result.success) {
          toast.success('자격증이 삭제되었습니다.')
          setDeleteDialogOpen(false)
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('삭제 중 오류가 발생했습니다.')
      } finally {
        setProcessingAction(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* 자격증 목록 */}
      {certificates.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">자격증 이력이 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">
            아래 버튼으로 직접 발급할 수 있습니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {certificates.map((cert: any) => (
            <CertificateCard
              key={cert.id}
              cert={cert}
              processingAction={processingAction}
              isPending={isPending}
              onApprove={() => handleApprove(cert.id)}
              onReject={() => {
                setRejectCertId(cert.id)
                setRejectDialogOpen(true)
              }}
              onIssue={() => {
                setIssueCertId(cert.id)
                setIssueDialogOpen(true)
              }}
              onEdit={() => openEditDialog(cert)}
              onDelete={() => openDeleteDialog(cert)}
            />
          ))}
        </div>
      )}

      {/* 직접 발급 버튼 */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => setDirectIssueOpen(true)}
      >
        <Send className="h-4 w-4" />
        자격증 직접 발급
      </Button>

      {/* ==== 직접 발급 다이얼로그 ==== */}
      <Dialog open={directIssueOpen} onOpenChange={setDirectIssueOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자격증 직접 발급</DialogTitle>
            <DialogDescription>
              신청 절차 없이 관리자가 직접 발급합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  레벨: <strong>{courseLevel}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>자격증 번호</Label>
              <Input
                placeholder="예: AIDA-2024-001"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>관리자 메모 (선택)</Label>
              <Textarea
                placeholder="발급 관련 메모..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDirectIssueOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleDirectIssue}
              disabled={isPending || !certNumber.trim()}
              className="gap-2"
            >
              {isPending && processingAction === 'direct_issue' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
              발급하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==== 발급 다이얼로그 (번호 부여) ==== */}
      <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자격증 번호 부여</DialogTitle>
            <DialogDescription>
              승인된 자격증에 번호를 부여하여 발급합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>자격증 번호</Label>
              <Input
                placeholder="예: AIDA-2024-001"
                value={issueCertNumber}
                onChange={(e) => setIssueCertNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIssueDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleIssue}
              disabled={isPending || !issueCertNumber.trim()}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Award className="h-4 w-4" />
              )}
              발급
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==== 거부 다이얼로그 ==== */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자격증 신청 거부</DialogTitle>
            <DialogDescription>
              거부 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>거부 사유</Label>
              <Textarea
                placeholder="거부 사유를 입력하세요..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !rejectReason.trim()}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              거부
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==== 수정 다이얼로그 ==== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자격증 정보 수정</DialogTitle>
            <DialogDescription>
              자격증 번호와 메모를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>자격증 번호</Label>
              <Input
                placeholder="예: AIDA-2024-001"
                value={editCertNumber}
                onChange={(e) => setEditCertNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>관리자 메모</Label>
              <Textarea
                placeholder="메모를 입력하세요..."
                value={editAdminNotes}
                onChange={(e) => setEditAdminNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleEdit}
              disabled={isPending}
              className="gap-2"
            >
              {isPending && processingAction?.startsWith('edit_') ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==== 삭제 확인 다이얼로그 ==== */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자격증 삭제</DialogTitle>
            <DialogDescription>
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  정말 삭제하시겠습니까?
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {deleteCertInfo}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="gap-2"
            >
              {isPending && processingAction?.startsWith('delete_') ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// 개별 자격증 카드 컴포넌트
// ============================================

function CertificateCard({
  cert,
  processingAction,
  isPending,
  onApprove,
  onReject,
  onIssue,
  onEdit,
  onDelete,
}: {
  cert: any
  processingAction: string | null
  isPending: boolean
  onApprove: () => void
  onReject: () => void
  onIssue: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const statusInfo = getCertStatusInfo(cert.status)

  return (
    <Card className={`overflow-hidden ${statusInfo.borderClass}`}>
      <CardContent className="p-4 space-y-3">
        {/* 상단: 상태 + 레벨 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className={`h-5 w-5 ${statusInfo.iconClass}`} />
            <span className="text-sm font-semibold">{cert.certificate_level}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusInfo.badgeClass}>{statusInfo.label}</Badge>
            {/* 수정/삭제 버튼 - 모든 상태에서 표시 */}
            <button
              onClick={onEdit}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
              title="수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 자격증 번호 (발급된 경우) */}
        {cert.certificate_number && (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-mono">
              {cert.certificate_number}
            </span>
          </div>
        )}

        {/* 관리자 메모 */}
        {cert.admin_notes && (
          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
            {cert.admin_notes}
          </p>
        )}

        {/* 날짜 정보 */}
        <div className="text-xs text-slate-400 space-y-0.5">
          {cert.applied_at && (
            <p>
              신청일:{' '}
              {new Date(cert.applied_at).toLocaleDateString('ko-KR')}
            </p>
          )}
          {cert.issued_at && (
            <p>
              발급일:{' '}
              {new Date(cert.issued_at).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>

        {/* 액션 버튼 */}
        {cert.status === 'pending' && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isPending}
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-1"
            >
              <X className="h-3.5 w-3.5" />
              거부
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 gap-1"
            >
              {isPending && processingAction === `approve_${cert.id}` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              승인
            </Button>
          </div>
        )}

        {cert.status === 'approved' && (
          <Button
            size="sm"
            onClick={onIssue}
            disabled={isPending}
            className="w-full gap-1"
          >
            <Award className="h-3.5 w-3.5" />
            자격증 번호 부여
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 상태 정보 헬퍼
// ============================================

function getCertStatusInfo(status: string) {
  switch (status) {
    case 'pending':
      return {
        label: '심사 대기',
        badgeClass: 'bg-amber-100 text-amber-700',
        borderClass: 'border-amber-200',
        iconClass: 'text-amber-500',
      }
    case 'approved':
      return {
        label: '승인됨',
        badgeClass: 'bg-blue-100 text-blue-700',
        borderClass: 'border-blue-200',
        iconClass: 'text-blue-500',
      }
    case 'issued':
      return {
        label: '발급 완료',
        badgeClass: 'bg-green-100 text-green-700',
        borderClass: 'border-green-200',
        iconClass: 'text-green-500',
      }
    case 'rejected':
      return {
        label: '거부됨',
        badgeClass: 'bg-red-100 text-red-700',
        borderClass: 'border-red-200',
        iconClass: 'text-red-500',
      }
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-100 text-slate-700',
        borderClass: 'border-slate-200',
        iconClass: 'text-slate-500',
      }
  }
}
