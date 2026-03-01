'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { useRouter, usePathname } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Menu, Coins } from "lucide-react"
import { getUserCredits } from "@/app/admin/actions/credits"
import { signOutAction } from "@/app/auth/actions"
import { formatCredits } from "@/lib/credit-constants"
import { NAV_ITEMS, isNavItemActive } from "@/types/navigation"

export function SiteHeader() {
    const [user, setUser] = useState<User | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [credits, setCredits] = useState<number>(0)
    const supabase = createClient()
    const router = useRouter()
    const pathname = usePathname()

    // Initial check on mount
    useEffect(() => {
        let profileSubscription: any = null

        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                const currentUser = session?.user ?? null
                setUser(currentUser)

                if (currentUser) {
                    await checkAndSetAdmin(currentUser.id)
                    await fetchUserCredits(currentUser.id)
                    setupRealtimeSubscription(currentUser.id)
                }
            } catch (e) {
                console.error("Init session error:", e)
            }
        }

        const setupRealtimeSubscription = (userId: string) => {
            if (profileSubscription) {
                supabase.removeChannel(profileSubscription)
            }

            // profiles 테이블의 변경을 감지
            profileSubscription = supabase
                .channel(`profile-changes-${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${userId}`,
                    },
                    (payload) => {
                        console.log('Realtime profile update received:', payload)
                        // general_credits 컬럼 명칭 반영
                        if (payload.new && typeof payload.new.general_credits === 'number') {
                            setCredits(payload.new.general_credits)
                        } else if (payload.new && typeof payload.new.credits === 'number') {
                            // 하위 호환성을 위해 기존 credits도 체크
                            setCredits(payload.new.credits)
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Realtime subscription status for ${userId}:`, status)
                })
        }

        // 탭 포커스 시 최신 크레딧 가져오기 (안전장치)
        const handleFocus = () => {
            if (user) {
                fetchUserCredits(user.id)
            }
        }

        initSession()

        window.addEventListener('focus', handleFocus)

        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                await checkAndSetAdmin(currentUser.id)
                await fetchUserCredits(currentUser.id)
                setupRealtimeSubscription(currentUser.id)
            } else {
                setIsAdmin(false)
                setCredits(0)
                if (profileSubscription) {
                    supabase.removeChannel(profileSubscription)
                    profileSubscription = null
                }
            }

            if (event === 'SIGNED_OUT') {
                setIsAdmin(false)
                setUser(null)
                setCredits(0)
                router.refresh()
                router.push('/')
            }
        })

        return () => {
            authSubscription.unsubscribe()
            window.removeEventListener('focus', handleFocus)
            if (profileSubscription) {
                supabase.removeChannel(profileSubscription)
            }
        }
    }, [supabase, router, user?.id]) // user.id를 의존성에 추가하여 user 상태가 바뀔 때 focus 핸들러가 최신 user를 참조하게 함

    const checkAndSetAdmin = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Profile fetch error:', error)
                setIsAdmin(false)
                return
            }
            setIsAdmin(data?.role === 'admin')
        } catch (e) {
            console.error('Admin check exception:', e)
            setIsAdmin(false)
        }
    }

    const fetchUserCredits = async (userId: string) => {
        try {
            const userCredits = await getUserCredits(userId)
            setCredits(userCredits)
        } catch (e) {
            console.error('Failed to fetch credits:', e)
        }
    }

    // 서버 사이드에서 로그아웃 처리 (쿠키까지 확실히 정리)
    const handleLogout = async () => {
        try {
            // 클라이언트 상태 먼저 초기화
            setUser(null)
            setIsAdmin(false)
            setCredits(0)
            // 서버 액션으로 로그아웃 (쿠키 정리 + 리다이렉트)
            await signOutAction()
        } catch (error) {
            console.error('Logout error:', error)
            // 서버 액션 실패 시 클라이언트에서도 시도
            await supabase.auth.signOut()
            router.refresh()
            router.push('/')
        }
    }

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            {/* ====== 모바일 헤더 (md 미만) ====== */}
            <div className="md:hidden flex h-14 items-center justify-between px-4">
                {/* 좌측: 햄버거 메뉴 */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px]">
                        <SheetTitle className="sr-only">메뉴</SheetTitle>
                        <div className="flex flex-col gap-6 mt-12">
                            {/* 모바일 네비게이션 메뉴 (로그인 시에만 노출) */}
                            {user && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">메뉴</h3>
                                    <div className="flex flex-col gap-2">
                                        {NAV_ITEMS.map((item) => {
                                            const isActive = isNavItemActive(pathname, item.href)
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className={`px-4 py-2 rounded-md transition-colors ${
                                                        isActive
                                                            ? 'bg-blue-50 text-blue-600 font-semibold'
                                                            : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {item.label}
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 계정 섹션 */}
                            <div className="flex flex-col gap-4">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">내 계정</h3>
                                <div className="border-t pt-4">
                                    {user ? (
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-blue-600 font-semibold text-sm">
                                                    {user.email?.[0].toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-sm text-slate-700 font-medium">{user.email}</span>
                                        </div>
                                    ) : (
                                        <Link href="/login">
                                            <Button className="w-full">로그인</Button>
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* 관리 섹션 */}
                            {(user && isAdmin) && (
                                <div className="flex flex-col gap-4">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">관리</h3>
                                    <div className="border-t pt-4">
                                        <Link href="/admin">
                                            <Button variant="outline" className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                                                🛡️ 관리자 페이지
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* 로그아웃 (로그인 시에만) */}
                            {user && (
                                <div className="border-t pt-4 mt-auto">
                                    <Button
                                        onClick={handleLogout}
                                        variant="ghost"
                                        className="w-full justify-start gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                                    >
                                        🚪 로그아웃
                                    </Button>
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* 중앙: 로고 — 항상 랜딩페이지(/)로 이동 (교육과정/가격 안내 페이지) */}
                <Link href="/" className="absolute left-1/2 -translate-x-1/2">
                    <span className="text-lg font-bold text-slate-800 tracking-tight">Ocean Freediving</span>
                </Link>

                {/* 우측: 크레딧 표시 */}
                <div className="flex items-center gap-2">
                    {user ? (
                        <Link href="/dashboard/credits">
                            <div className="flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                                <Coins className="w-3 h-3 mr-1" />
                                {formatCredits(credits)}
                            </div>
                        </Link>
                    ) : (
                        <Link href="/login">
                            <Button size="sm" variant="ghost" className="text-sm font-medium">로그인</Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* ====== 데스크톱 헤더 (md 이상) ====== */}
            <div className="hidden md:flex h-16 items-center justify-between px-6 lg:px-8 container">
                {/* 좌측: 로고 — 항상 랜딩페이지(/)로 이동 (교육과정/가격 안내 페이지) */}
                <div className="flex items-center gap-2">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="text-xl font-bold text-slate-800">Ocean Freediving</span>
                    </Link>
                </div>

                {/* 중앙-우측: 네비게이션 + 유저 정보 */}
                <div className="flex items-center gap-8 lg:gap-12">
                    {/* 데스크톱 네비게이션 - 로그인한 유저만 보임 */}
                    {user && (
                        <nav className="flex gap-6 lg:gap-8 text-sm font-medium">
                            {NAV_ITEMS.map((item) => {
                                const isActive = isNavItemActive(pathname, item.href)
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`transition-colors ${
                                            isActive
                                                ? 'text-blue-600 font-semibold'
                                                : 'text-foreground/60 hover:text-foreground/80'
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                )
                            })}
                            
                            {/* 관리자 권한이 있는 경우 노출되는 메뉴 */}
                            {isAdmin && (
                                <Link
                                    href="/admin"
                                    className={`transition-colors flex items-center gap-1 ${
                                        pathname.startsWith('/admin')
                                            ? 'text-blue-600 font-semibold'
                                            : 'text-foreground/60 hover:text-foreground/80'
                                    }`}
                                >
                                    🛡️ 관리자
                                </Link>
                            )}
                        </nav>
                    )}

                    <div className="flex items-center gap-4">
                        {/* 크레딧 표시 */}
                        {user && (
                            <Link href="/dashboard/credits">
                                <div className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                                    <Coins className="w-3.5 h-3.5 mr-1" />
                                    {formatCredits(credits)}
                                </div>
                            </Link>
                        )}

                        {user ? (
                            <>
                                <span className="text-xs text-slate-500">{user.email}</span>
                                <Button onClick={handleLogout} variant="ghost" size="sm">로그아웃</Button>
                            </>
                        ) : (
                            <Link href="/login">
                                <Button size="sm">로그인</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
