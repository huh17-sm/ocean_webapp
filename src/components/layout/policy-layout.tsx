import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PolicyLayoutProps {
  title: string
  lastUpdated?: string
  children: ReactNode
}

export function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <Link href="/dashboard/more">
            <Button variant="ghost" size="sm" className="gap-2 mb-2">
              <ArrowLeft className="w-4 h-4" />
              뒤로 가기
            </Button>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
          {lastUpdated && (
            <p className="text-sm text-slate-500 mt-1">최종 업데이트: {lastUpdated}</p>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="container max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-12">
        <div className="bg-white rounded-lg border shadow-sm p-6 md:p-8">
          <div className="prose prose-slate max-w-none">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
