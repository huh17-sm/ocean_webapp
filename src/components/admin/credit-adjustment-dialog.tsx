'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { adjustCreditsManually } from '@/app/admin/actions/credits'
import { Coins, Loader2, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CreditAdjustmentDialogProps {
    userId: string
    currentCredits: number
}

const ADJUSTMENT_REASONS = [
    { value: 'manual_charge', label: '수동 충전' },
    { value: 'manual_deduct', label: '수동 차감' },
    { value: 'error_correction', label: '오류 정정' },
    { value: 'compensation', label: '보상 지급' },
    { value: 'other', label: '기타' },
] as const

export function CreditAdjustmentDialog({ userId, currentCredits = 0 }: CreditAdjustmentDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [amount, setAmount] = useState<number>(0)
    const [isAdding, setIsAdding] = useState(true)
    const [reason, setReason] = useState<string>('manual_charge')
    const [memo, setMemo] = useState('')

    const resetForm = () => {
        setAmount(0)
        setIsAdding(true)
        setReason('manual_charge')
        setMemo('')
    }

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        
        if (amount <= 0) {
            toast.error('금액을 입력해주세요.')
            return
        }

        const finalAmount = isAdding ? amount : -amount

        if (!isAdding && amount > currentCredits) {
            toast.error(`현재 보유 크레딧(${currentCredits})보다 많은 금액을 차감할 수 없습니다.`)
            return
        }

        startTransition(async () => {
            const result = await adjustCreditsManually(userId, finalAmount, reason, memo || undefined)

            if (result.success) {
                toast.success(`크레딧이 ${isAdding ? '추가' : '차감'}되었습니다. (${isAdding ? '+' : '-'}${amount}C)`)
                setOpen(false)
                resetForm()
                router.refresh()
            } else {
                toast.error(result.message || '크레딧 조정에 실패했습니다.')
            }
        })
    }

    // currentCredits가 undefined나 NaN일 경우를 대비해 0으로 처리
    const safeCurrentCredits = Number(currentCredits) || 0;

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 h-6 px-2 text-xs">
                    <Coins className="w-3 h-3" />
                    조정
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>크레딧 조정</DialogTitle>
                        <DialogDescription>
                            현재 보유: {safeCurrentCredits.toLocaleString()}C
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        {/* 추가/차감 선택 */}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={isAdding ? 'default' : 'outline'}
                                size="sm"
                                className="flex-1 gap-1"
                                onClick={() => setIsAdding(true)}
                            >
                                <Plus className="w-3 h-3" />
                                추가
                            </Button>
                            <Button
                                type="button"
                                variant={!isAdding ? 'destructive' : 'outline'}
                                size="sm"
                                className="flex-1 gap-1"
                                onClick={() => setIsAdding(false)}
                            >
                                <Minus className="w-3 h-3" />
                                차감
                            </Button>
                        </div>

                        {/* 금액 */}
                        <div>
                            <Label className="text-xs font-semibold">금액 (C)</Label>
                            <Input
                                type="number"
                                min={1}
                                value={amount || ''}
                                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                                placeholder="크레딧 금액 입력"
                                className="mt-1"
                            />
                            <div className="mt-1 flex justify-between items-center bg-slate-50 p-2 rounded text-xs">
                                <span className="text-slate-500">조정 후 예상 잔액:</span>
                                <span className={`font-bold ${isAdding ? 'text-blue-600' : 'text-red-600'}`}>
                                    {(safeCurrentCredits + (isAdding ? amount : -amount)).toLocaleString()}C
                                </span>
                            </div>
                        </div>

                        {/* 사유 */}
                        <div>
                            <Label className="text-xs font-semibold">사유</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ADJUSTMENT_REASONS.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 메모 */}
                        <div>
                            <Label className="text-xs font-semibold">메모 (선택)</Label>
                            <Input
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="관리자 메모"
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-6 flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isPending}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isPending || amount <= 0 || (!isAdding && safeCurrentCredits < amount)}
                            className="flex-1"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    처리 중...
                                </>
                            ) : (
                                '확인'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
