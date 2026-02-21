'use client'

import { useState, useTransition, ReactNode, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { UserProfile } from '@/types'
import { updateUserProfile } from '@/app/admin/actions'
import { Pencil, Loader2 } from 'lucide-react'

interface EditUserDialogProps {
    user: UserProfile
    trigger?: ReactNode
}

export function EditUserDialog({ user, trigger }: EditUserDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Form states
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        name: user.name || '',
        current_progress: user.current_progress || '',
        credits: user.credits || 0,
        equalization: user.equalization || '',
        equipment: user.equipment || '',
        cert_status: user.cert_status || '',
        // PB Records
        pb_cwt: user.pb_cwt || undefined,
        pb_sta: user.pb_sta || '',
        pb_dyn: user.pb_dyn || undefined,
        // Admin
        expiry_date: user.expiry_date ? new Date(user.expiry_date).toISOString().split('T')[0] : '',
        health_memo: user.health_memo || '',
        birthdate: user.birthdate || ''
    })

    // Credit Adjustment State
    const [creditAdjustment, setCreditAdjustment] = useState<{ amount: number, reason: string, type: 'add' | 'deduct' } | null>(null)
    const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'deduct' | null>(null)
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustReason, setAdjustReason] = useState('')

    // Sync state when user prop changes or dialog opens
    useEffect(() => {
        if (open) {
            setFormData({
                name: user.name || '',
                current_progress: user.current_progress || '',
                credits: user.credits || 0,
                equalization: user.equalization || '',
                equipment: user.equipment || '',
                cert_status: user.cert_status || '',
                pb_cwt: user.pb_cwt || undefined,
                pb_sta: user.pb_sta || '',
                pb_dyn: user.pb_dyn || undefined,
                expiry_date: user.expiry_date ? new Date(user.expiry_date).toISOString().split('T')[0] : '',
                health_memo: user.health_memo || '',
                birthdate: user.birthdate || ''
            })
            setCreditAdjustment(null)
            setAdjustmentMode(null)
            setAdjustAmount('')
            setAdjustReason('')
        }
    }, [user, open])

    const handleChange = (field: keyof UserProfile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            try {
                // If there's a credit adjustment pending
                if (creditAdjustment) {
                     // Use the robust RPC-based action
                     const { adjustCreditsManually } = await import('@/app/admin/actions/credits');
                     const result = await adjustCreditsManually(
                        user.id, 
                        creditAdjustment.amount, 
                        'admin_manual_adjustment', // Internal reason code
                        creditAdjustment.reason // User visible memo
                     );
                     
                     if (!result.success) {
                         throw new Error(result.message || 'Credit adjustment failed');
                     }
                }

                // Prepare update data with sanitization
                const updateData: Partial<UserProfile> = {
                    ...formData,
                    // Convert empty strings to null for date/numeric fields to avoid DB errors
                    expiry_date: formData.expiry_date ? formData.expiry_date : null,
                    pb_cwt: formData.pb_cwt ?? null,
                    pb_dyn: formData.pb_dyn ?? null,
                    pb_sta: formData.pb_sta || null,
                    health_memo: formData.health_memo || null,
                    equipment: formData.equipment || null,
                    equalization: formData.equalization || null,
                    cert_status: formData.cert_status || null,
                    current_progress: formData.current_progress || null,
                    birthdate: formData.birthdate || null,
                    name: formData.name || null,
                    // If we adjusted credits via action, should we update it here too? 
                    // updateUserProfile also updates credits if present in data.
                    // But we already updated it in DB via adjustUserCredits.
                    // To be safe and avoid race conditions or overwrites with stale data:
                    // We should EXCLUDE credits from this update if we used the adjustment action.
                    // However, formData.credits was updated optimistically in the UI.
                    // If we pass it, it sets the value again.
                    // If we DON'T pass it, it remains what it was? No, adjustUserCredits changed it.
                    // Let's NOT include credits in updateData if we did adjustment, 
                    // OR just rely on standard update if no adjustment.
                    // Actually, adjustUserCredits does the log + update.
                    // updateUserProfile does just update.
                    // If creditAdjustment exists, we use adjustUserCredits for credit part.
                    // So we remove 'credits' from updateData if creditAdjustment exists.
                }

                // If we did a credit adjustment, don't overwrite with standard update
                if (creditAdjustment) {
                    delete updateData.credits
                }

                await updateUserProfile(user.id, updateData)
                setOpen(false)
                setCreditAdjustment(null) // Reset
                alert('회원 정보가 수정되었습니다.')
            } catch (error) {
                console.error(error)
                alert('수정 실패: 권한이 없거나 데이터베이스 오류입니다. 마이그레이션을 확인하세요.')
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>회원 정보 수정 - {user.name} ({user.email})</DialogTitle>
                    <DialogDescription>
                        회원의 상세 정보를 수정합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Activity Info */}
                        <div className="space-y-4 border p-4 rounded bg-slate-50">
                            <h3 className="font-semibold text-sm text-blue-600">활동 정보</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Mileage Removed */}
                                
                                <div className="space-y-2 col-span-2">
                                    <Label>크레딧 관리 (현재: {formData.credits})</Label>
                                    <div className="p-3 bg-white border rounded space-y-3">
                                        {!adjustmentMode && !creditAdjustment && (
                                            <div className="flex gap-2">
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="flex-1 border-blue-200 hover:bg-blue-50 text-blue-700"
                                                    onClick={() => setAdjustmentMode('add')}
                                                >
                                                    + 충전
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="flex-1 border-red-200 hover:bg-red-50 text-red-700"
                                                    onClick={() => setAdjustmentMode('deduct')}
                                                >
                                                    - 차감
                                                </Button>
                                            </div>
                                        )}

                                        {adjustmentMode && (
                                            <div className="space-y-3 bg-slate-50 p-3 rounded border animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-2">
                                                    <span className={`text-sm font-bold ${adjustmentMode === 'add' ? 'text-blue-600' : 'text-red-600'}`}>
                                                        {adjustmentMode === 'add' ? '크레딧 충전' : '크레딧 차감'}
                                                    </span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            setAdjustmentMode(null);
                                                            setAdjustAmount('');
                                                            setAdjustReason('');
                                                        }}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                                <div className="grid gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-gray-500">수량</Label>
                                                        <Input 
                                                            type="number" 
                                                            placeholder="0" 
                                                            className="bg-white h-8"
                                                            value={adjustAmount}
                                                            onChange={(e) => setAdjustAmount(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs text-gray-500">사유</Label>
                                                        <Input 
                                                            placeholder={adjustmentMode === 'add' ? '예: 입금 확인' : '예: 오지급 수정'} 
                                                            className="bg-white h-8"
                                                            value={adjustReason}
                                                            onChange={(e) => setAdjustReason(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    size="sm" 
                                                    className={`w-full ${adjustmentMode === 'add' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                                                    onClick={() => {
                                                        const val = parseInt(adjustAmount);
                                                        if (!isNaN(val) && val > 0 && adjustReason.trim()) {
                                                            setCreditAdjustment({ 
                                                                amount: adjustmentMode === 'add' ? val : -val, 
                                                                reason: adjustReason, 
                                                                type: adjustmentMode 
                                                            });
                                                            // Update visual total
                                                            handleChange('credits', (formData.credits || 0) + (adjustmentMode === 'add' ? val : -val));
                                                            setAdjustmentMode(null);
                                                            setAdjustAmount('');
                                                            setAdjustReason('');
                                                        } else {
                                                            alert('수량과 사유를 올바르게 입력해주세요.');
                                                        }
                                                    }}
                                                >
                                                    적용 (임시)
                                                </Button>
                                            </div>
                                        )}

                                        {creditAdjustment && (
                                            <div className="text-xs text-center p-2 bg-slate-100 rounded border border-slate-200">
                                                <div className="mb-1">
                                                    <span className={creditAdjustment.type === 'add' ? 'text-blue-600 font-bold' : 'text-red-600 font-bold'}>
                                                        {creditAdjustment.amount > 0 ? '+' : ''}{creditAdjustment.amount} 크레딧
                                                    </span>
                                                    <span className="text-gray-600"> ({creditAdjustment.reason})</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    className="text-xs underline text-gray-400 hover:text-gray-600"
                                                    onClick={() => {
                                                        // Revert
                                                        handleChange('credits', (formData.credits || 0) - creditAdjustment.amount);
                                                        setCreditAdjustment(null);
                                                    }}
                                                >
                                                    취소하기
                                                </button>
                                            </div>
                                        )}
                                        {!creditAdjustment && !adjustmentMode && (
                                            <div className="text-[10px] text-gray-300 text-center">
                                                * 버튼을 눌러 크레딧을 조정하세요.
                                            </div>
                                        )}
                                        {creditAdjustment && (
                                            <div className="text-[10px] text-blue-400 text-center font-medium animate-pulse">
                                                * 하단의 [수정사항 저장] 버튼을 눌러야 반영됩니다.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="expiry_date">만료일</Label>
                                    <Input
                                        id="expiry_date"
                                        type="date"
                                        value={formData.expiry_date || ''}
                                        onChange={(e) => handleChange('expiry_date', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. Technical Info */}
                        <div className="space-y-4 border p-4 rounded bg-slate-50">
                            <h3 className="font-semibold text-sm text-blue-600">테크니컬</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-2">
                                    <Label className="text-xs">CWT (m)</Label>
                                    <Input
                                        type="number"
                                        value={formData.pb_cwt || ''}
                                        onChange={(e) => handleChange('pb_cwt', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">DYN (m)</Label>
                                    <Input
                                        type="number"
                                        value={formData.pb_dyn || ''}
                                        onChange={(e) => handleChange('pb_dyn', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">STA</Label>
                                    <Input
                                        value={formData.pb_sta || ''}
                                        onChange={(e) => handleChange('pb_sta', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>이퀄라이징</Label>
                                    <Select
                                        value={formData.equalization || ''}
                                        onValueChange={(val) => handleChange('equalization', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="선택하세요" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="발살바">발살바</SelectItem>
                                            <SelectItem value="프렌젤">프렌젤</SelectItem>
                                            <SelectItem value="마우스필">마우스필</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>장비/렌탈</Label>
                                    <Input
                                        value={formData.equipment || ''}
                                        onChange={(e) => handleChange('equipment', e.target.value)}
                                        placeholder="렌탈장비 (발사이즈)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. User Info (Was Admin Info) */}
                        <div className="space-y-4 border p-4 rounded bg-slate-50">
                            <h3 className="font-semibold text-sm text-blue-600">회원 정보</h3>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>아이디 (수정불가)</Label>
                                    <Input value={user.email || ''} disabled className="bg-gray-100" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">이름</Label>
                                    <Input
                                        id="name"
                                        value={formData.name || ''}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="birthdate">생년월일</Label>
                                    <Input
                                        id="birthdate"
                                        type="date"
                                        value={formData.birthdate || ''}
                                        onChange={(e) => handleChange('birthdate', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>보유 자격증</Label>
                                    <div className="space-y-2">
                                        <Select
                                            value={
                                                ['AIDA1', 'AIDA2', 'AIDA2 pool', 'AIDA3', 'AIDA4', '강사'].includes(formData.cert_status || '')
                                                    ? formData.cert_status || ''
                                                    : 'custom'
                                            }
                                            onValueChange={(val) => {
                                                if (val === 'custom') {
                                                    handleChange('cert_status', '') // Clear for input
                                                } else {
                                                    handleChange('cert_status', val)
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="선택하세요" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="AIDA1">AIDA1</SelectItem>
                                                <SelectItem value="AIDA2">AIDA2</SelectItem>
                                                <SelectItem value="AIDA2 pool">AIDA2 pool</SelectItem>
                                                <SelectItem value="AIDA3">AIDA3</SelectItem>
                                                <SelectItem value="AIDA4">AIDA4</SelectItem>
                                                <SelectItem value="강사">강사</SelectItem>
                                                <SelectItem value="custom">직접입력</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Show input if custom (not in standard list) */}
                                        {(!['AIDA1', 'AIDA2', 'AIDA2 pool', 'AIDA3', 'AIDA4', '강사'].includes(formData.cert_status || '')) && (
                                            <Input
                                                placeholder="자격증 이름 직접 입력"
                                                value={formData.cert_status || ''}
                                                onChange={(e) => handleChange('cert_status', e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Memo */}
                        <div className="space-y-4 border p-4 rounded bg-slate-50">
                            <h3 className="font-semibold text-sm text-blue-600">비고 (건강/메모)</h3>
                            <textarea
                                className="w-full min-h-[150px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                value={formData.health_memo || ''}
                                onChange={(e) => handleChange('health_memo', e.target.value)}
                                placeholder="특이사항이나 건강 관련 메모를 입력하세요."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mr-2">취소</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            저장
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
