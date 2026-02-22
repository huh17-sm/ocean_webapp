import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus } from 'lucide-react'
import { ClassType } from '@/app/admin/actions'
import { CREDIT_UNIT } from "@/lib/constants"

export interface CourseFormData {
    id?: string
    title: string
    level: string
    description: string
    status: string
    priceStandard: number | ''
    credits?: number | ''
    classTypeId?: string
    sessionCount?: number | ''
    features: string[]
    requiredSkills?: { type: string; requirement: string }[]
}

const AVAILABLE_SKILLS = [
    { type: 'theory', label: '이론 교육' },
    { type: 'static', label: '스태틱 (숨참기)' },
    { type: 'dynamic', label: '다이나믹 (잠영)' },
    { type: 'depth', label: '수심 (컨스탄트웨이트)' },
    { type: 'rescue', label: '레스큐 (구조)' }
]

interface CourseFormProps {
    initialData?: CourseFormData
    onSubmit: (formData: FormData) => void
    isPending?: boolean
    submitLabel?: string
    classTypes?: any[]
}

export function CourseForm({ initialData, onSubmit, isPending = false, submitLabel = "저장", classTypes = [] }: CourseFormProps) {
    const [features, setFeatures] = useState<string[]>(initialData?.features || [])
    const [newFeature, setNewFeature] = useState('')
    const [requiredSkills, setRequiredSkills] = useState<{ type: string; requirement: string }[]>(
        initialData?.requiredSkills || []
    )

    const handleSkillToggle = (type: string, checked: boolean) => {
        if (checked) {
            setRequiredSkills(prev => [...prev, { type, requirement: '' }])
        } else {
            setRequiredSkills(prev => prev.filter(s => s.type !== type))
        }
    }

    const handleSkillRequirementChange = (type: string, requirement: string) => {
        setRequiredSkills(prev => prev.map(s => s.type === type ? { ...s, requirement } : s))
    }

    const handleAddFeature = () => {
        if (!newFeature.trim()) return
        setFeatures([...features, newFeature.trim()])
        setNewFeature('')
    }

    const handleRemoveFeature = (index: number) => {
        setFeatures(features.filter((_, i) => i !== index))
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        formData.set('features', JSON.stringify(features))
        formData.set('required_skills', JSON.stringify(requiredSkills))
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="id">ID (고유 식별자)</Label>
                    <Input
                        id="id"
                        name="id"
                        defaultValue={initialData?.id}
                        placeholder="예: lv_01 (빈 값일 경우 자동 생성)"
                        disabled={!!initialData?.id}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select name="status" defaultValue={initialData?.status || 'ACTIVE'}>
                        <SelectTrigger>
                            <SelectValue placeholder="상태 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACTIVE">활성 (판매중)</SelectItem>
                            <SelectItem value="INQUIRY_ONLY">준비중 (문의만 가능)</SelectItem>
                            <SelectItem value="INACTIVE">비활성 (숨김)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                    <Label htmlFor="title">과정명</Label>
                    <Input id="title" name="title" required defaultValue={initialData?.title} placeholder="예: 입문 과정" />
                </div>
                <div className="col-span-1 space-y-2">
                    <Label htmlFor="session_count">세션 수</Label>
                    <Input
                        id="session_count"
                        name="session_count"
                        type="number"
                        defaultValue={initialData?.sessionCount}
                        placeholder="예: 1"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="level">레벨</Label>
                    <Input id="level" name="level" required defaultValue={initialData?.level} placeholder="예: Level 1" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="price_standard">가격 (원)</Label>
                    <Input
                        id="price_standard"
                        name="price_standard"
                        type="number"
                        defaultValue={initialData?.priceStandard}
                        placeholder="예: 150000"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="credits">제공 크레딧 (C)</Label>
                    <Input
                        id="credits"
                        name="credits"
                        type="number"
                        defaultValue={initialData?.credits}
                        placeholder="예: 5"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="class_type">연동 수업 타입</Label>
                    <Select name="class_type_id" defaultValue={initialData?.classTypeId || ""}>
                        <SelectTrigger>
                            <SelectValue placeholder="수업 타입 선택 (선택사항)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">연동 안함</SelectItem>
                            {classTypes?.map((type) => (
                                <SelectItem key={type.type} value={type.type}>
                                    {type.label} ({type.credit_cost} {CREDIT_UNIT})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                        * 이 과정이 포함하는 수업의 기본 타입을 설정합니다. (예: 수영장 교육)
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <textarea
                    id="description"
                    name="description"
                    required
                    defaultValue={initialData?.description}
                    placeholder="과정에 대한 간략한 설명"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>

            <div className="space-y-2">
                <Label>특징 (포함 내역)</Label>
                <div className="flex gap-2">
                    <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="특징 입력 후 추가 버튼 클릭"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                    />
                    <Button type="button" onClick={handleAddFeature} variant="secondary">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                            <span>{f}</span>
                            <button type="button" onClick={() => handleRemoveFeature(i)} className="text-slate-400 hover:text-red-500">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
                <Label>필수 스킬 설정 (상세 기준 포함)</Label>
                <div className="bg-slate-50 border rounded-md p-4 space-y-4">
                    <p className="text-xs text-slate-500 flex items-center justify-between pb-2 border-b">
                        이 과정에서 이수해야 할 대상 스킬을 체크하고, 세부 합격 기준을 적어주세요. 
                        <span>예: 1분 30초, 수심 12m</span>
                    </p>
                    {AVAILABLE_SKILLS.map(skill => {
                        const existingSkill = requiredSkills.find(s => s.type === skill.type)
                        const isChecked = !!existingSkill

                        return (
                            <div key={skill.type} className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-medium w-36 cursor-pointer hover:text-blue-600 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                                        checked={isChecked}
                                        onChange={(e) => handleSkillToggle(skill.type, e.target.checked)}
                                    />
                                    {skill.label}
                                </label>
                                {isChecked && (
                                    <Input 
                                        type="text"
                                        value={existingSkill.requirement}
                                        onChange={(e) => handleSkillRequirementChange(skill.type, e.target.value)}
                                        placeholder="목표 기준치 (예: 2분)"
                                        className="flex-1 h-9 bg-white"
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={isPending}>
                    {isPending ? '저장 중...' : submitLabel}
                </Button>
            </div>
        </form>
    )
}
