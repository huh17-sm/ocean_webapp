'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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

export function CreateClassDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)

        try {
            await createClass(formData)
            setOpen(false)
        } catch (error) {
            console.error(error)
            alert('수업 생성 실패')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" /> 수업 등록
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>새 수업 등록</DialogTitle>
                    <DialogDescription>
                        새로운 다이빙 수업 일정을 추가합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            날짜
                        </Label>
                        <Input
                            id="date"
                            name="date"
                            type="date"
                            required
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">
                            시간
                        </Label>
                        <Input
                            id="time"
                            name="time"
                            type="time"
                            required
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            종류
                        </Label>
                        <div className="col-span-3">
                            <Select name="type" required defaultValue="pool">
                                <SelectTrigger>
                                    <SelectValue placeholder="수업 종류 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="theory">이론</SelectItem>
                                    <SelectItem value="pool">풀장</SelectItem>
                                    <SelectItem value="training">트레이닝</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="location" className="text-right">
                            장소
                        </Label>
                        {/* Simple input for now, could be select later */}
                        <Input
                            id="location"
                            name="location"
                            required
                            placeholder="예: 잠실 다이빙풀"
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="max_capacity" className="text-right">
                            정원
                        </Label>
                        <Input
                            id="max_capacity"
                            name="max_capacity"
                            type="number"
                            required
                            defaultValue={4}
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            등록하기
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
