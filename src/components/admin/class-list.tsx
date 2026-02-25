'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Link as LinkIcon } from 'lucide-react'
import { deleteClass } from '@/app/admin/actions'
import { useTransition } from 'react'
import { CLASS_TYPES } from '@/lib/constants'

interface ClassItem {
    id: string
    date: string
    time: string
    type: string
    location: string
    max_capacity: number
    current_enrollment: number
}

import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

function ClassRow({ classItem }: { classItem: ClassItem }) {
    const { confirm } = useConfirm()
    const [isPending, startTransition] = useTransition()

    return (
        <TableRow key={classItem.id}>
            <TableCell className="font-medium">{classItem.date}</TableCell>
            <TableCell>{classItem.time}</TableCell>
            <TableCell>
                <Badge variant={classItem.type === 'pool' ? 'default' : 'secondary'}>
                    {CLASS_TYPES[classItem.type as keyof typeof CLASS_TYPES] || classItem.type}
                </Badge>
            </TableCell>
            <TableCell>
                {(() => {
                    const urlMatch = classItem.location.match(/(https?:\/\/[^\s]+)/);
                    const locationUrl = urlMatch ? urlMatch[0] : null;
                    
                    if (locationUrl) {
                        return (
                            <a 
                                href={locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-blue-600 hover:underline transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <LinkIcon className="w-3 h-3 text-blue-400 shrink-0" />
                                <span className="truncate max-w-[150px] inline-block align-bottom">{classItem.location}</span>
                            </a>
                        );
                    }
                    return classItem.location;
                })()}
            </TableCell>
            <TableCell>
                {classItem.current_enrollment} / {classItem.max_capacity}
            </TableCell>
            <TableCell className="text-right">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    disabled={isPending}
                    onClick={async () => {
                        const confirmed = await confirm({
                            title: "수업 삭제",
                            description: "정말 삭제하시겠습니까?",
                            confirmText: "삭제하기",
                            variant: "destructive",
                        })

                        if (confirmed) {
                            startTransition(async () => { // Note: startTransition callback should be synchronous usually, but server actions are async.
                                // Actually, startTransition expects logic that triggers state update. Server action triggers router refresh usually.
                                // To stick to pattern:
                                try {
                                    await deleteClass(classItem.id)
                                    toast.success('수업이 삭제되었습니다.')
                                } catch (error) {
                                    console.error(error)
                                    toast.error('삭제 중 오류가 발생했습니다.')
                                }
                            })
                        }
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    )
}

export function ClassList({ classes }: { classes: ClassItem[] }) {
    if (classes.length === 0) {
        return <div className="p-8 text-center text-slate-500 border rounded-lg bg-slate-50">등록된 수업이 없습니다.</div>
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>날짜</TableHead>
                        <TableHead>시간</TableHead>
                        <TableHead>종류</TableHead>
                        <TableHead>장소</TableHead>
                        <TableHead>신청/정원</TableHead>
                        <TableHead className="text-right">관리</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {classes.map((c) => (
                        <ClassRow key={c.id} classItem={c} />
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
