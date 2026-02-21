'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createClass } from '@/app/admin/actions'
import { Loader2, Plus } from 'lucide-react'
import { CLASS_TYPES } from '@/lib/constants'
import { toast } from 'sonner'

interface QuickClassDialogProps {
    trigger?: React.ReactNode
    defaultDate?: string
    onSuccess?: () => void
}

export function QuickClassDialog({ trigger, defaultDate, onSuccess }: QuickClassDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Form states
    const [date, setDate] = useState(defaultDate || '')
    const [time, setTime] = useState('')
    const [type, setType] = useState('pool')
    const [location, setLocation] = useState('')
    const [maxCapacity, setMaxCapacity] = useState(4)

    function resetForm() {
        setDate(defaultDate || '')
        setTime('')
        setType('pool')
        setLocation('')
        setMaxCapacity(4)
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const formData = new FormData(event.currentTarget)

        startTransition(async () => {
            try {
                await createClass(formData)
                toast.success('수업이 성공적으로 생성되었습니다')
                setOpen(false)
                resetForm()
                if (onSuccess) onSuccess()
            } catch (error) {
                console.error('Error creating class:', error)
                toast.error('수업 생성 중 오류가 발생했습니다')
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen)
            if (!newOpen) resetForm()
        }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4" /> 새 수업 생성
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>빠른 수업 생성</DialogTitle>
                    <DialogDescription>
                        간단하게 새로운 수업을 추가합니다
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">

                    {/* Date */}
                    <div className="grid gap-2">
                        <Label htmlFor="date">날짜</Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {/* Type */}
                    <div className="grid gap-2">
                        <Label htmlFor="type">수업 종류</Label>
                        <Select name="type" required value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="수업 종류 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="theory">{CLASS_TYPES.theory}</SelectItem>
                                <SelectItem value="pool">{CLASS_TYPES.pool}</SelectItem>
                                <SelectItem value="training">{CLASS_TYPES.training}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Location */}
                    <div className="grid gap-2">
                        <Label htmlFor="location">장소</Label>
                        <Input
                            id="location"
                            name="location"
                            placeholder="예: 제주 수영장, 서울 센터"
                            required
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                        />
                    </div>

                    {/* Time */}
                    <div className="grid gap-2">
                        <Label htmlFor="time">시간</Label>
                        <Input
                            id="time"
                            name="time"
                            type="time"
                            required
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>

                    {/* Max Capacity */}
                    <div className="grid gap-2">
                        <Label htmlFor="max_capacity">정원</Label>
                        <Input
                            id="max_capacity"
                            name="max_capacity"
                            type="number"
                            min="1"
                            max="20"
                            required
                            value={maxCapacity}
                            onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isPending}
                        >
                            취소
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            생성하기
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
