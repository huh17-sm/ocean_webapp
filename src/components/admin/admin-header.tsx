'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Bell } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

export function AdminHeader() {
  const isMobile = useIsMobile()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          {isMobile && <h1 className="text-lg font-bold text-slate-900">관리자</h1>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="w-4 h-4" />
              {!isMobile && <span>사용자 페이지</span>}
            </Button>
          </Link>

          {!isMobile && (
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
