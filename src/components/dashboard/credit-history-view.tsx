'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { formatCredits } from '@/lib/credit-constants'

interface CreditHistoryViewProps {
  transactions: any[]
}

export function CreditHistoryView({ transactions }: CreditHistoryViewProps) {
  const [filter, setFilter] = useState<'all' | 'add' | 'deduct'>('all')

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === 'all') return true
    if (filter === 'add') return tx.amount > 0
    if (filter === 'deduct') return tx.amount < 0
    return true
  })

  const getTransactionIcon = (reason: string) => {
    if (reason.includes('충전') || reason.includes('보너스') || reason.includes('환불')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    }
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionBadge = (amount: number) => {
    if (amount > 0) {
      return <Badge className="bg-green-600">충전</Badge>
    }
    return <Badge variant="secondary">사용</Badge>
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/credits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">💸 전체 사용 내역</h1>
          <p className="text-slate-500 mt-1">모든 크레딧 거래 내역을 확인하세요</p>
        </div>
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              전체
            </Button>
            <Button
              variant={filter === 'add' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('add')}
            >
              충전
            </Button>
            <Button
              variant={filter === 'deduct' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('deduct')}
            >
              사용
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 거래 내역 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            거래 내역 ({filteredTransactions.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>거래 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getTransactionIcon(tx.reason)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{tx.reason}</p>
                        {getTransactionBadge(tx.amount)}
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getTransactionColor(tx.amount)}`}>
                      {tx.amount > 0 ? '+' : ''}
                      {formatCredits(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-500">잔액 {formatCredits(tx.balance_after)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
