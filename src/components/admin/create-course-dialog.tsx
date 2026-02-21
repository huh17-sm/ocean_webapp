'use client'

import { useState, useTransition } from 'react'
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from 'lucide-react'
import { CourseForm } from './course-form'
import { createCourse } from '@/app/admin/actions'
// import { useToast } from "@/hooks/use-toast"

export function CreateCourseDialog({ classTypes }: { classTypes: any[] }) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    // const { toast } = useToast() 

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            try {
                await createCourse(formData)
                setOpen(false)
                // toast({ title: "성공", description: "교육 과정이 생성되었습니다." })
                alert("교육 과정이 생성되었습니다.")
            } catch (error) {
                console.error(error)
                alert(`교육 과정 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
                // toast({ title: "실패", description: "교육 과정 생성에 실패했습니다.", variant: "destructive" })
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 w-4 h-4" /> 교육 과정 추가
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>새 교육 과정 추가</DialogTitle>
                    <DialogDescription>
                        새로운 교육 과정 정보를 입력하세요.
                    </DialogDescription>
                </DialogHeader>
                <CourseForm onSubmit={handleSubmit} isPending={isPending} submitLabel="생성" classTypes={classTypes} />
            </DialogContent>
        </Dialog>
    )
}
