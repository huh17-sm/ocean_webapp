'use client'

import { useState, useTransition } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CourseForm, CourseFormData } from './course-form'
import { updateCourse } from '@/app/admin/actions'
import { Course } from './course-list'

interface EditCourseDialogProps {
    course: Course
    open: boolean
    onOpenChange: (open: boolean) => void
    classTypes: any[]
}

export function EditCourseDialog({ course, open, onOpenChange, classTypes }: EditCourseDialogProps) {
    const [isPending, startTransition] = useTransition()

    const initialData: CourseFormData = {
        id: course.id,
        title: course.title,
        level: course.level,
        description: course.description,
        status: course.status,
        priceStandard: course.price?.standard || '',
        credits: course.price?.credits || '',
        classTypeId: course.price?.class_type_id || '',
        sessionCount: course.session_count || '',
        features: course.features || [],
        requiredSkills: course.required_skills || []
    }

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            try {
                await updateCourse(course.id, formData)
                onOpenChange(false)
                alert("교육 과정이 수정되었습니다.")
            } catch (error) {
                console.error(error)
                alert(`수정에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>교육 과정 수정</DialogTitle>
                    <DialogDescription>
                        교육 과정 정보를 수정합니다.
                    </DialogDescription>
                </DialogHeader>
                <CourseForm
                    initialData={initialData}
                    onSubmit={handleSubmit}
                    isPending={isPending}
                    submitLabel="수정 저장"
                    classTypes={classTypes}
                />
            </DialogContent>
        </Dialog>
    )
}
