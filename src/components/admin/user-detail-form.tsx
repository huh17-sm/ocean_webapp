'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
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
import { Loader2, FileText } from 'lucide-react'

interface UserDetailFormProps {
    user: UserProfile
    onCancel: () => void
    onSuccess?: () => void
}

export function UserDetailForm({ user, onCancel, onSuccess }: UserDetailFormProps) {
    const [isPending, startTransition] = useTransition()

    // Form states
    const [formData, setFormData] = useState<Partial<UserProfile>>({
        current_progress: user.current_progress || '',
        credits: user.credits || 0,
        mileage: user.mileage || 0,
        equalization: user.equalization || '',
        equipment: user.equipment || '',
        cert_status: user.cert_status || '',
        // PB Records
        pb_cwt: user.pb_cwt || undefined,
        pb_sta: user.pb_sta || '',
        pb_dyn: user.pb_dyn || undefined,
        // Admin
        expiry_date: user.expiry_date ? new Date(user.expiry_date).toISOString().split('T')[0] : '',
        health_memo: user.health_memo || ''
    })

    const handleChange = (field: keyof UserProfile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            try {
                // Prepare update data with sanitization
                const updateData: Partial<UserProfile> = {
                    ...formData,
                    expiry_date: formData.expiry_date ? formData.expiry_date : null,
                    pb_cwt: formData.pb_cwt ?? null,
                    pb_dyn: formData.pb_dyn ?? null,
                    pb_sta: formData.pb_sta || null,
                    health_memo: formData.health_memo || null,
                    equipment: formData.equipment || null,
                    equalization: formData.equalization || null,
                    cert_status: formData.cert_status || null,
                    current_progress: formData.current_progress || null,
                }
                await updateUserProfile(user.id, updateData)
                alert('회원 정보가 수정되었습니다.')
                if (onSuccess) onSuccess()
            } catch (error) {
                console.error(error)
                alert('수정 실패')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 border-2 border-dashed border-yellow-400/50 rounded-lg bg-yellow-50/10">
            <h3 className="font-bold text-lg mb-4">📝 상세 정보 수정</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Activity Info */}
                <div className="space-y-4 border p-4 rounded bg-white/50">
                    <h4 className="font-semibold text-sm text-blue-600">📊 활동 정보</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="mileage">마일리지</Label>
                            <Input
                                id="mileage"
                                type="number"
                                value={formData.mileage}
                                onChange={(e) => handleChange('mileage', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="current_progress">진행 과정</Label>
                            <Input
                                id="current_progress"
                                value={formData.current_progress || ''}
                                onChange={(e) => handleChange('current_progress', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="credits">잔여 세션</Label>
                            <Input
                                id="credits"
                                type="number"
                                value={formData.credits}
                                onChange={(e) => handleChange('credits', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-1">
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
                <div className="space-y-4 border p-4 rounded bg-white/50">
                    <h4 className="font-semibold text-sm text-blue-600">🤿 테크니컬</h4>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">CWT (m)</Label>
                            <Input
                                type="number"
                                value={formData.pb_cwt || ''}
                                onChange={(e) => handleChange('pb_cwt', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">DYN (m)</Label>
                            <Input
                                type="number"
                                value={formData.pb_dyn || ''}
                                onChange={(e) => handleChange('pb_dyn', parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">STA</Label>
                            <Input
                                value={formData.pb_sta || ''}
                                onChange={(e) => handleChange('pb_sta', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label>이퀄라이징</Label>
                            <Select
                                value={formData.equalization || ''}
                                onValueChange={(val) => handleChange('equalization', val)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="발살바">발살바</SelectItem>
                                    <SelectItem value="프렌젤">프렌젤</SelectItem>
                                    <SelectItem value="마우스필">마우스필</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>장비/비고</Label>
                            <Input
                                value={formData.equipment || ''}
                                onChange={(e) => handleChange('equipment', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* 3. User Info */}
                <div className="space-y-4 border p-4 rounded bg-white/50">
                    <h4 className="font-semibold text-sm text-blue-600 flex items-center gap-1"><FileText className="w-4 h-4" /> 회원 정보</h4>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label>이름 (수정불가)</Label>
                            <Input value={user.name || ''} disabled className="bg-gray-100" />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="birthdate">생년월일</Label>
                            <Input
                                id="birthdate"
                                type="date"
                                value={formData.birthdate || ''}
                                onChange={(e) => handleChange('birthdate', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>자격증 상태</Label>
                            <Select
                                value={formData.cert_status || ''}
                                onValueChange={(val) => handleChange('cert_status', val)}
                            >
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="미발급">미발급</SelectItem>
                                    <SelectItem value="서류대기">서류대기</SelectItem>
                                    <SelectItem value="발급완료">발급완료</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* 4. Memo */}
                <div className="space-y-4 border p-4 rounded bg-white/50">
                    <h4 className="font-semibold text-sm text-blue-600">📝 비고 (건강/메모)</h4>
                    <textarea
                        className="w-full min-h-[120px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        value={formData.health_memo || ''}
                        onChange={(e) => handleChange('health_memo', e.target.value)}
                        placeholder="특이사항이나 건강 관련 메모를 입력하세요."
                    />
                </div>
            </div>

            <div className="flex justify-end pt-6 gap-2">
                <Button type="button" variant="outline" onClick={onCancel}>닫기</Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    저장하기
                </Button>
            </div>
        </form>
    )
}
