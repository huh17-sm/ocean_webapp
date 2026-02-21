'use client'

import { useState, useTransition } from "react"
import { formatCredits } from "@/lib/credit-constants"
import { CreditTransaction } from "@/types/credit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCreditTransactions } from "@/app/admin/actions/credits"
import { Loader2 } from "lucide-react"

const PAGE_SIZE = 50

interface CreditHistoryListProps {
  transactions: CreditTransaction[]
  userId: string
}

export function CreditHistoryList({ transactions: initialTransactions, userId }: CreditHistoryListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [hasMore, setHasMore] = useState(initialTransactions.length >= PAGE_SIZE)
  const [isPending, startTransition] = useTransition()

  const loadMore = () => {
    startTransition(async () => {
      const more = await getCreditTransactions(userId, PAGE_SIZE, transactions.length)
      setTransactions(prev => [...prev, ...more])
      setHasMore(more.length >= PAGE_SIZE)
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
        거래 내역이 없습니다.
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          <div className="divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      tx.transaction_type === 'purchase' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                      tx.transaction_type === 'deduct' ? 'text-red-600 border-red-200 bg-red-50' :
                      tx.transaction_type === 'refund' ? 'text-green-600 border-green-200 bg-green-50' :
                      'text-slate-600'
                    }>
                      {tx.transaction_type === 'purchase' ? '충전' :
                       tx.transaction_type === 'deduct' ? '사용' :
                       tx.transaction_type === 'refund' ? '환불' : '기타'}
                    </Badge>
                    <span className="text-sm font-medium text-slate-900">{tx.memo}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(tx.created_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${tx.amount > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatCredits(tx.amount)}
                  </div>
                  <div className="text-xs text-slate-400">
                     잔액: {formatCredits(tx.balance_after)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {hasMore && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={loadMore}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  불러오는 중...
                </>
              ) : (
                '더 보기'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
