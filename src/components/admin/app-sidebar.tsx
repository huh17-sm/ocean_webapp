'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Settings, BookOpen, CalendarRange, MapPin, MessageSquare, GraduationCap, CreditCard } from 'lucide-react'
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

// 메뉴 항목을 3개 그룹으로 분류
const menuGroups = [
    {
        label: '메인',
        items: [
            {
                title: 'Dashboard',
                url: '/admin',
                icon: Home,
            },
        ],
    },
    {
        label: '수업 & 교육',
        items: [
            {
                title: '수업/일정 관리',
                url: '/admin/classes/availability',
                icon: CalendarRange,
            },
            {
                title: '과정 설정',
                url: '/admin/courses',
                icon: BookOpen,
            },
            {
                title: '교육생 관리',
                url: '/admin/course-management',
                icon: GraduationCap,
            },
            {
                title: '디브리핑 관리',
                url: '/admin/debriefings',
                icon: MessageSquare,
            },
        ],
    },
    {
        label: '회원 & 운영',
        items: [
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
                title: '수영장 관리',
                url: '/admin/pools',
                icon: MapPin,
            },
            {
                title: '시스템 설정',
                url: '/admin/settings',
                icon: Settings,
            },
        ],
    },
]

export function AdminAppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { setOpenMobile } = useSidebar()

    // 모바일에서 메뉴 클릭 시 사이드바 닫기
    const handleNavClick = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setOpenMobile(false)
        }
    }

    return (
        <Sidebar className={className} {...props}>
            <SidebarHeader className="p-4 border-b">
                <h2 className="text-xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">Ocean Admin</h2>
            </SidebarHeader>
            <SidebarContent>
                {menuGroups.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
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
                ))}
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
