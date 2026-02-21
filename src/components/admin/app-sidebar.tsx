'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Calendar, Settings, BookOpen, CalendarRange, MapPin, CheckSquare, MessageSquare, Award, CreditCard, FileText, GraduationCap } from 'lucide-react'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
    useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'

// Menu items.
const items = [
    {
        title: 'Dashboard',
        url: '/admin',
        icon: Home,
    },
    {
        title: '수업/일정 관리',
        url: '/admin/classes/availability',
        icon: CalendarRange,
    },
    {
        title: '교육 과정 관리',
        url: '/admin/courses',
        icon: BookOpen,
    },
    {
        title: '통합 교육 관리',
        url: '/admin/course-management',
        icon: GraduationCap,
    },
    {
        title: '디브리핑 관리',
        url: '/admin/debriefings',
        icon: MessageSquare,
    },
    {
        title: '수영장 관리',
        url: '/admin/pools',
        icon: MapPin,
    },
    {
        title: '회원 관리',
        url: '/admin/users',
        icon: Users,
    },
    {
        title: '크레딧 관리',
        url: '/admin/credits',
        icon: CreditCard,
    },
    {
        title: '시스템 설정',
        url: '/admin/settings',
        icon: Settings,
    },
]

export function AdminAppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { setOpenMobile } = useSidebar()

    const handleNavClick = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setOpenMobile(false)
        }
    }

    return (
        <Sidebar className={className} {...props}>
            <SidebarHeader className="p-4 border-b">
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">🌊 Ocean Admin</h2>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>관리 메뉴</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => {
                                const isActive = pathname === item.url || pathname.startsWith(item.url + '/')

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={isActive}>
                                            <Link href={item.url} onClick={handleNavClick}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t">
                <Link href="/dashboard">
                    <Button variant="outline" className="w-full gap-2" size="sm">
                        <Home className="w-4 h-4" />
                        <span>사용자 페이지로</span>
                    </Button>
                </Link>
            </SidebarFooter>
        </Sidebar>
    )
}
