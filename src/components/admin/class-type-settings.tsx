'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { updateClassTypeSetting, createClassTypeSetting } from '@/app/admin/settings/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Save, X, Lightbulb } from 'lucide-react'
import { ClassTypeSetting } from '@/lib/constants'

interface ClassTypeSettingsProps {
    initialSettings: ClassTypeSetting[]
}

export function ClassTypeSettings({ initialSettings }: ClassTypeSettingsProps) {
    const router = useRouter()
    const [settings, setSettings] = useState(initialSettings)
    const [editingType, setEditingType] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<{ label: string; credit_cost: number }>({ label: '', credit_cost: 1 })
    const [isAdding, setIsAdding] = useState(false)
    const [newType, setNewType] = useState({ type: '', label: '', credit_cost: 1 })

    const handleEdit = (setting: ClassTypeSetting) => {
        setEditingType(setting.type)
        setEditValues({ label: setting.label, credit_cost: setting.credit_cost })
    }

    const handleSave = async (type: string) => {
        try {
            await updateClassTypeSetting(type, editValues)
            toast.success('설정이 업데이트되었습니다.')
            setEditingType(null)
            router.refresh()
        } catch (error) {
            toast.error('업데이트에 실패했습니다.')
        }
    }

    const handleCancel = () => {
        setEditingType(null)
        setEditValues({ label: '', credit_cost: 1 })
    }

    const handleAdd = async () => {
        if (!newType.type || !newType.label) {
            toast.error('타입 코드와 이름을 입력해주세요.')
            return
        }

        try {
            await createClassTypeSetting({
                ...newType,
                sort_order: settings.length + 1
            })
            toast.success('새 타입이 추가되었습니다.')
            setIsAdding(false)
            setNewType({ type: '', label: '', credit_cost: 1 })
            router.refresh()
        } catch (error) {
            toast.error('타입 추가에 실패했습니다.')
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>수업 타입 관리</CardTitle>
                        <CardDescription>
                            수업 타입별 크레딧 소모량을 설정합니다. 변경 사항은 즉시 적용됩니다.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => setIsAdding(true)}
                        size="sm"
                        className="gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        새 타입 추가
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 기존 타입 목록 */}
                {settings.filter(s => s.is_active).map((setting) => (
                    <div
                        key={setting.type}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        {editingType === setting.type ? (
                            // 편집 모드
                            <>
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs text-slate-500">타입 코드</Label>
                                        <Input
                                            value={setting.type}
                                            disabled
                                            className="bg-slate-100 mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">표시 이름</Label>
                                        <Input
                                            value={editValues.label}
                                            onChange={(e) => setEditValues({ ...editValues, label: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500">크레딧 소모량</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={editValues.credit_cost}
                                            onChange={(e) => setEditValues({ ...editValues, credit_cost: parseInt(e.target.value) || 0 })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleSave(setting.type)}
                                        className="gap-1"
                                    >
                                        <Save className="w-3 h-3" />
                                        저장
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancel}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            </>
                        ) : (
                            // 보기 모드
                            <>
                                <div className="flex-1 grid grid-cols-3 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">타입 코드</p>
                                        <Badge variant="outline" className="font-mono">
                                            {setting.type}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">표시 이름</p>
                                        <p className="font-semibold">{setting.label}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">크레딧 소모량</p>
                                        <Badge className="bg-blue-600">
                                            {setting.credit_cost} 크레딧
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(setting)}
                                    className="gap-1"
                                >
                                    <Pencil className="w-3 h-3" />
                                    수정
                                </Button>
                            </>
                        )}
                    </div>
                ))}

                {/* 새 타입 추가 폼 */}
                {isAdding && (
                    <div className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/50">
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs text-slate-500">타입 코드 *</Label>
                                <Input
                                    placeholder="예: advanced"
                                    value={newType.type}
                                    onChange={(e) => setNewType({ ...newType, type: e.target.value.toLowerCase() })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">표시 이름 *</Label>
                                <Input
                                    placeholder="예: 심화 교육"
                                    value={newType.label}
                                    onChange={(e) => setNewType({ ...newType, label: e.target.value })}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">크레딧 소모량</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={newType.credit_cost}
                                    onChange={(e) => setNewType({ ...newType, credit_cost: parseInt(e.target.value) || 0 })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleAdd}
                                className="gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                추가
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setIsAdding(false)
                                    setNewType({ type: '', label: '', credit_cost: 1 })
                                }}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                )}

                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                        <strong className="flex items-center gap-1"><Lightbulb className="w-4 h-4 text-blue-500" /> 참고:</strong> 타입 코드는 영문 소문자로 입력하며, 한 번 생성하면 수정할 수 없습니다. 
                        표시 이름과 크레딧 소모량은 언제든 변경 가능합니다.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
