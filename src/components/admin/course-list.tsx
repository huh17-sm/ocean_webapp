'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { updateCourseStatus, updateCoursesOrder, deleteCourse } from '@/app/admin/actions'
import { useTransition, useState, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal, Pencil, Trash } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { EditCourseDialog } from './edit-course-dialog'

export interface Course {
    id: string
    title: string
    level: string
    price: any
    status: 'ACTIVE' | 'INACTIVE' | 'INQUIRY_ONLY'
    description: string
    sort_order: number
    features?: string[]
    session_count?: number
    required_skills?: any[]
}

import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

function SortableCourseRow({ course, classTypes }: { course: Course, classTypes: any[] }) {
    const { confirm } = useConfirm()
    const [isPending, startTransition] = useTransition()
    const [showEditDialog, setShowEditDialog] = useState(false)
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: course.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        opacity: isDragging ? 0.5 : 1,
    }

    const handleStatusChange = (value: string) => {
        startTransition(() => {
            updateCourseStatus(course.id, value)
        })
    }

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: "교육 과정 삭제",
            description: "정말로 이 교육 과정을 삭제하시겠습니까?",
            confirmText: "삭제하기",
            variant: "destructive",
        })

        if (confirmed) {
            startTransition(async () => {
                try {
                    await deleteCourse(course.id)
                    toast.success('교육 과정이 삭제되었습니다.')
                } catch (error) {
                    console.error(error)
                    toast.error('삭제 중 오류가 발생했습니다.')
                }
            })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <Badge className="bg-green-500">활성</Badge>
            case 'INACTIVE': return <Badge variant="secondary">비활성</Badge>
            case 'INQUIRY_ONLY': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">준비중</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <>
            <TableRow ref={setNodeRef} style={style}>
                <TableCell className="w-[50px]">
                    <div {...attributes} {...listeners} className="cursor-grab touch-none p-2 hover:bg-slate-100 rounded">
                        <GripVertical className="w-5 h-5 text-slate-400" />
                    </div>
                </TableCell>
                <TableCell className="font-medium w-[80px] text-center text-slate-500">
                    {course.sort_order}
                </TableCell>
                <TableCell className="font-medium">{course.title}</TableCell>
                <TableCell>{course.level}</TableCell>
                <TableCell className="max-w-[300px] truncate" title={course.description}>
                    {course.description}
                </TableCell>
                <TableCell>
                    <Select
                        defaultValue={course.status}
                        onValueChange={handleStatusChange}
                        disabled={isPending}
                    >
                        <SelectTrigger className="w-[140px]">
                            <SelectValue>
                                {getStatusBadge(course.status)}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ACTIVE">활성 (판매중)</SelectItem>
                            <SelectItem value="INQUIRY_ONLY">준비중 (상담문의)</SelectItem>
                            <SelectItem value="INACTIVE">비활성 (숨김)</SelectItem>
                        </SelectContent>
                    </Select>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setShowEditDialog(true)} title="수정">
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50" title="삭제">
                            <Trash className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {showEditDialog && (
                <EditCourseDialog
                    course={course}
                    open={showEditDialog}
                    onOpenChange={setShowEditDialog}
                    classTypes={classTypes}
                />
            )}
        </>
    )
}

function CourseCard({ course, classTypes }: { course: Course, classTypes: any[] }) {
    const { confirm } = useConfirm()
    const [isPending, startTransition] = useTransition()
    const [showEditDialog, setShowEditDialog] = useState(false)

    const handleStatusChange = (value: string) => {
        startTransition(() => {
            updateCourseStatus(course.id, value)
        })
    }

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: "교육 과정 삭제",
            description: "정말로 이 교육 과정을 삭제하시겠습니까?",
            confirmText: "삭제하기",
            variant: "destructive",
        })

        if (confirmed) {
            startTransition(async () => {
                try {
                    await deleteCourse(course.id)
                    toast.success('교육 과정이 삭제되었습니다.')
                } catch (error) {
                    console.error(error)
                    toast.error('삭제 중 오류가 발생했습니다.')
                }
            })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return <Badge className="bg-green-500">활성</Badge>
            case 'INACTIVE': return <Badge variant="secondary">비활성</Badge>
            case 'INQUIRY_ONLY': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">준비중</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs text-slate-500">#{course.sort_order}</Badge>
                        <Badge variant="secondary" className="text-xs">{course.level}</Badge>
                    </div>
                    <h3 className="font-bold text-lg">{course.title}</h3>
                </div>
                {getStatusBadge(course.status)}
            </div>

            <div>
                <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
            </div>

            <div className="pt-3 border-t flex justify-between items-center gap-2">
                <Select
                    defaultValue={course.status}
                    onValueChange={handleStatusChange}
                    disabled={isPending}
                >
                    <SelectTrigger className="h-9 w-[130px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACTIVE">활성 (판매중)</SelectItem>
                        <SelectItem value="INQUIRY_ONLY">준비중 (상담문의)</SelectItem>
                        <SelectItem value="INACTIVE">비활성 (숨김)</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(true)}>
                        <Pencil className="h-4 w-4 mr-1" /> 수정
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash className="h-4 w-4 mr-1" /> 삭제
                    </Button>
                </div>
            </div>

            {showEditDialog && (
                <EditCourseDialog
                    course={course}
                    open={showEditDialog}
                    onOpenChange={setShowEditDialog}
                    classTypes={classTypes}
                />
            )}
        </div>
    )
}

export function CourseList({ courses: initialCourses, classTypes }: { courses: Course[], classTypes: any[] }) {
    const [courses, setCourses] = useState(initialCourses)

    // Sync if prop updates (e.g. status change from another source revalidates)
    useEffect(() => {
        // Only update if IDs or basic metrics changed, to allow local reordering without flicker?
        // Actually, we want to stay in sync with Server.
        // But drag drop optimistic update might conflict if we reset too fast.
        setCourses(initialCourses.sort((a, b) => a.sort_order - b.sort_order))
    }, [initialCourses])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setCourses((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over.id)

                const newOrder = arrayMove(items, oldIndex, newIndex)

                // Calculate new sort_orders
                // Efficient way: just assign index as sort_order
                const updates = newOrder.map((item, index) => ({
                    id: item.id,
                    sort_order: index + 1 // 1-based index
                }))

                // Call server action without waiting in UI (Optimistic)
                updateCoursesOrder(updates) // This is async but we don't await blocking UI

                // Return with updated sort_order locally for immediate display
                return newOrder.map((item, index) => ({ ...item, sort_order: index + 1 }))
            })
        }
    }

    if (!courses || courses.length === 0) {
        return <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50">등록된 교육 과정이 없습니다.</div>
    }

    return (
        <div className="space-y-4">
            {/* Desktop View (Table) */}
            <div className="hidden md:block border rounded-md bg-white">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[80px] text-center">순서</TableHead>
                                <TableHead>과정명</TableHead>
                                <TableHead>레벨</TableHead>
                                <TableHead>설명</TableHead>
                                <TableHead>상태 관리</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <SortableContext
                                items={courses.map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {courses.map((course) => (
                                    <SortableCourseRow key={course.id} course={course} classTypes={classTypes} />
                                ))}
                            </SortableContext>
                        </TableBody>
                    </Table>
                </DndContext>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
                <p className="text-xs text-slate-500 mb-2 px-1">
                    * 모바일에서는 순서 변경이 불가능합니다. PC에서 관리해주세요.
                </p>
                {courses.map((course) => (
                    <CourseCard key={course.id} course={course} classTypes={classTypes} />
                ))}
            </div>
        </div>
    )
}
