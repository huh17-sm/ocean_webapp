'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Home, Calendar, Award, Users } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
    pendingRequests?: number
    pendingCertificates?: number
}

export function MobileBottomNav({ pendingRequests = 0, pendingCertificates = 0 }: MobileBottomNavProps) {
    const pathname = usePathname()
    const isMobile = useIsMobile()

    // Don't render on desktop
    if (!isMobile) {
        return null
    }

    const tabs = [
        {
            id: 'dashboard',
            title: '대시보드',
            icon: Home,
            href: '/admin',
            badge: 0,
            isActive: pathname === '/admin',
        },
        {
            id: 'classes',
            title: '수업/일정',
            icon: Calendar,
            href: '/admin/classes/availability',
            badge: pendingRequests,
            isActive: pathname?.startsWith('/admin/classes') || false,
        },
        {
            id: 'certificates',
            title: '자격증',
            icon: Award,
            href: '/admin/certificates-v2',
            badge: pendingCertificates,
            isActive: pathname?.startsWith('/admin/certificates') || false,
        },
        {
            id: 'users',
            title: '회원관리',
            icon: Users,
            href: '/admin/users',
            badge: 0,
            isActive: pathname?.startsWith('/admin/users') || false,
        },
    ]

    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-lg md:hidden">
            <div className="flex justify-around items-center h-16 pb-safe">
                {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className={cn(
                                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative',
                                tab.isActive
                                    ? 'text-blue-600'
                                    : 'text-slate-500 hover:text-slate-700'
                            )}
                        >
                            <div className="relative">
                                <Icon className={cn(
                                    'w-5 h-5',
                                    tab.isActive && 'stroke-[2.5]'
                                )} />
                                {tab.badge > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
                                    >
                                        {tab.badge > 99 ? '99+' : tab.badge}
                                    </Badge>
                                )}
                            </div>
                            <span className={cn(
                                'text-[10px] font-medium',
                                tab.isActive && 'font-semibold'
                            )}>
                                {tab.title}
                            </span>
                            {tab.isActive && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-full" />
                            )}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
