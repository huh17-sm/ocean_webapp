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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUser } from '@/app/admin/actions'
import { Loader2, Plus, UserPlus } from 'lucide-react'

export function AddUserDialog() {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            try {
                await createUser(formData)
                setOpen(false)
                alert('회원이 추가되었습니다.')
            } catch (error) {
                console.error(error)
                alert('회원 추가 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    회원 추가
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>새 회원 추가</DialogTitle>
                    <DialogDescription>
                        새로운 회원의 기본 정보를 입력하여 계정을 생성합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">이메일 (ID) <span className="text-red-500">*</span></Label>
                        <Input id="email" name="email" type="email" required placeholder="user@example.com" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">비밀번호 <span className="text-red-500">*</span></Label>
                        <Input id="password" name="password" type="password" required minLength={6} placeholder="6자 이상 입력" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">이름 (실명) <span className="text-red-500">*</span></Label>
                        <Input id="name" name="name" required placeholder="홍길동" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="birthdate">생년월일</Label>
                        <Input id="birthdate" name="birthdate" type="date" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">전화번호</Label>
                        <Input id="phone" name="phone" type="tel" placeholder="010-1234-5678" />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mr-2">취소</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            추가하기
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
