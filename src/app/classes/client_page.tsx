'use client'

import { ClassCard } from '@/components/classes/class-card'
import { reserveClass } from './actions'
import { useState } from 'react'
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { CREDIT_UNIT } from "@/lib/constants"

export default function ClientPage({ cls, userCredits }: { cls: any, userCredits: number }) {
    const { confirm } = useConfirm()
    const [isReserving, setIsReserving] = useState(false)

    const handleReserve = async (classId: string) => {
        const confirmed = await confirm({
            title: "수업 예약",
            description: `예약하시겠습니까? 크레딧 1${CREDIT_UNIT}가 차감됩니다.`,
            confirmText: "예약하기",
            variant: "default",
        })

        if (!confirmed) return

        setIsReserving(true)
        const result = await reserveClass(classId)
        setIsReserving(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("예약이 완료되었습니다!")
        }
    }

    return (
        <ClassCard
            id={cls.id}
            date={cls.date}
            time={cls.time}
            type={cls.type}
            location={cls.location}
            maxCapacity={cls.max_capacity}
            currentEnrollment={cls.current_enrollment}
            userCredits={userCredits}
            onReserve={handleReserve}
            isReserving={isReserving}
        />
    )
}
