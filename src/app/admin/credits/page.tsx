import { Suspense } from 'react'
import { getPendingRechargeRequests, getAllCreditTransactions } from '@/app/admin/actions/credits'
import { AdminCreditManager } from '@/components/admin/credit-manager'
import { Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminCreditsPage() {
    const [requests, transactions] = await Promise.all([
        getPendingRechargeRequests(),
        getAllCreditTransactions()
    ])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">크레딧 관리</h2>
            </div>
            
            <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>}>
                <AdminCreditManager 
                    initialRequests={requests} 
                    initialTransactions={transactions} 
                />
            </Suspense>
        </div>
    )
}
