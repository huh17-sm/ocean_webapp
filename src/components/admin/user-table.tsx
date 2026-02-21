'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/types'
import { EditUserDialog } from './edit-user-dialog'
import { Button } from "@/components/ui/button"
import { UserDetailView } from './user-detail-view'
import { cn } from '@/lib/utils'
import { deleteUser } from '@/app/admin/actions'
import { AddUserDialog } from './add-user-dialog'
import { MoreHorizontal, Pencil, ChevronDown, ChevronUp, Trash, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

function UserCard({ user }: { user: UserProfile }) {
    const { confirm } = useConfirm()
    const [isExpanded, setIsExpanded] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: "회원 삭제",
            description: `'${user.name || user.email}' 회원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            confirmText: "삭제하기",
            variant: "destructive",
        })

        if (!confirmed) return

        setIsDeleting(true)
        try {
            await deleteUser(user.id)
            toast.success('회원이 삭제되었습니다.')
        } catch (error) {
            console.error(error)
            toast.error('삭제 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg">{user.name || '방문자'}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <Badge variant={user.cert_status === '발급완료' ? 'default' : 'secondary'}>
                    {user.cert_status || '미발급'}
                </Badge>
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">생년월일</span>
                    <span>{user.birthdate || '-'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">진행 과정</span>
                    <span>{user.current_progress || '-'}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-500 text-xs">보유 크레딧</span>
                    <span>{user.credits}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900 px-0"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {isExpanded ? '접기' : '상세 정보'}
                </Button>

                <div className="flex items-center space-x-1">
                    <EditUserDialog user={user}
                        trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        }
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="pt-2 border-t mt-2">
                    <UserDetailView user={user} />
                </div>
            )}
        </div>
    )
}

function UserRow({ user }: { user: UserProfile }) {
    const { confirm } = useConfirm()
    const [isExpanded, setIsExpanded] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: "회원 삭제",
            description: `'${user.name || user.email}' 회원을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
            confirmText: "삭제하기",
            variant: "destructive",
        })

        if (!confirmed) return

        setIsDeleting(true)
        try {
            await deleteUser(user.id)
            toast.success('회원이 삭제되었습니다.')
        } catch (error) {
            console.error(error)
            toast.error('삭제 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <TableRow key={user.id} className={cn(isExpanded && "bg-muted/50")}>
                <TableCell className="font-medium">{user.name || '방문자'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone_number || '-'}</TableCell>
                <TableCell>{user.birthdate || '-'}</TableCell>
                <TableCell>
                    <Badge variant={user.cert_status === '발급완료' ? 'default' : 'secondary'}>
                        {user.cert_status || '미발급'}
                    </Badge>
                </TableCell>
                <TableCell>
                    {user.current_progress || <span className="text-gray-400">-</span>}
                </TableCell>
                <TableCell>
                    {user.credits}
                </TableCell>
                <TableCell>
                    <div className="flex items-center space-x-1">
                        {/* Expandable Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="sr-only">Toggle details</span>
                        </Button>

                        {/* Edit Dialog */}
                        <EditUserDialog user={user}
                            trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            }
                        />

                        {/* Delete Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
                        </Button>
                    </div>
                </TableCell>
            </TableRow>
            {isExpanded && (
                <TableRow>
                    <TableCell colSpan={8} className="p-0 border-b-2 border-slate-100">
                        <UserDetailView user={user} />
                    </TableCell>
                </TableRow>
            )}
        </>
    )
}

export function UserTable({ users }: { users: UserProfile[] }) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredUsers = users.filter(user => {
        const query = searchTerm.toLowerCase()
        return (
            (user.name?.toLowerCase().includes(query) || false) ||
            (user.email?.toLowerCase().includes(query) || false) ||
            (user.phone_number?.includes(query) || false)
        )
    })

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <h2 className="text-lg font-semibold">회원 목록 ({filteredUsers.length} / {users.length})</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                         <Input
                            placeholder="이름, 전화번호, 이메일 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <AddUserDialog />
                </div>
            </div>

            {/* Desktop View (Table) */}
            <div className="hidden md:block border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>이름</TableHead>
                            <TableHead>이메일</TableHead>
                            <TableHead>전화번호</TableHead>
                            <TableHead>생년월일</TableHead>
                            <TableHead>자격증</TableHead>
                            <TableHead>진행 과정</TableHead>
                            <TableHead>보유 크레딧</TableHead>
                            <TableHead className="w-[120px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((u) => (
                                <UserRow key={u.id} user={u} />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                    검색 결과가 없습니다.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((u) => (
                        <UserCard key={u.id} user={u} />
                    ))
                ) : (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                        검색 결과가 없습니다.
                    </div>
                )}
            </div>
        </div>
    )
}
