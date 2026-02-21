'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Coins, Plus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { formatCredits } from '@/lib/credit-constants'

interface CreditsViewProps {
  profile: any
  transactions: any[]
}

export function CreditsView({ profile, transactions }: CreditsViewProps) {
  // TODO: 만료 예정 크레딧 기능은 향후 구현 예정
  const expiringCredits = 0

  // 최근 거래 내역 (5개)
  const recentTransactions = transactions.slice(0, 5)

  const getTransactionIcon = (reason: string) => {
    if (reason.includes('충전') || reason.includes('보너스') || reason.includes('환불')) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    }
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">💳 크레딧</h1>
          <p className="text-slate-500 mt-1">내 크레딧 잔액과 이용 내역</p>
        </div>
      </div>

      {/* 내 크레딧 */}
      <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-6 w-6" />
            내 크레딧
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm opacity-90 mb-1">총 잔액</p>
              <p className="text-5xl font-bold">{formatCredits(profile?.general_credits ?? profile?.credits ?? 0)}</p>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <Plus className="mr-2 h-5 w-5" />
              크레딧 충전하기
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 만료 예정 크레딧 */}
      {expiringCredits > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-5 w-5" />
              만료 예정 크레딧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-amber-800 mb-1">2개월 내 만료 예정</p>
                <p className="text-3xl font-bold text-amber-900">
                  {formatCredits(expiringCredits)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-700">
                  만료 전에 사용하세요!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 사용 내역 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">최근 사용 내역</CardTitle>
            <Link href="/dashboard/credits/history">
              <Button variant="ghost" size="sm">
                전체 내역 보기
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>아직 거래 내역이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.reason)}
                    <div>
                      <p className="text-sm font-medium">{tx.reason}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(tx.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getTransactionColor(tx.amount)}`}>
                      {tx.amount > 0 ? '+' : ''}
                      {formatCredits(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      잔액 {formatCredits(tx.balance_after)}
                    </p>
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
