'use client'

import { usePathname } from 'next/navigation'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { BottomNav } from './bottom-nav'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')

  return (
    <>
      {!isAdmin && <SiteHeader />}
      <main className={isAdmin ? 'flex-1' : 'flex-1 pb-16 md:pb-0'}>
        {children}
      </main>
      {!isAdmin && <SiteFooter />}
      {!isAdmin && <BottomNav />}
    </>
  )
}
