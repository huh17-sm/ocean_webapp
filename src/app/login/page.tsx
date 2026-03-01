'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const supabase = createClient()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    // 이미 로그인된 사용자는 자동으로 대시보드로 이동 (화면을 막지 않음)
    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    router.replace('/dashboard')
                }
            } catch {
                // 세션 없음 — 로그인 페이지 유지
            }
        }
        checkSession()
    }, [supabase, router])

    // OAuth 로그인 (카카오, 구글)
    const handleLogin = (provider: 'google' | 'kakao') => {
        supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
    }

    // 이메일/비밀번호 로그인
    const handleEmailSignIn = async () => {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) {
            alert(error.message)
        } else {
            router.refresh()
            router.push('/dashboard')
        }
        setLoading(false)
    }

    // 이메일/비밀번호 회원가입
    const handleEmailSignUp = async () => {
        setLoading(true)
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
                data: {
                    full_name: email.split('@')[0],
                }
            },
        })
        if (error) {
            alert(error.message)
        } else {
            alert('회원가입 확인 메일을 보냈습니다! (또는 자동 로그인 됩니다)')
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 text-center">
                <h1 className="text-2xl font-bold font-sans text-slate-800">Ocean Freediving</h1>
                <p className="text-slate-500">프리다이빙 교육 예약 시스템</p>
                <div className="flex flex-col gap-4">
                    <div className="space-y-2 border-b pb-4 mb-4">
                        <Input
                            type="email"
                            placeholder="이메일 (테스트용)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleEmailSignIn} disabled={loading} className="flex-1 bg-slate-700">
                                로그인
                            </Button>
                            <Button onClick={handleEmailSignUp} disabled={loading} variant="outline" className="flex-1">
                                회원가입
                            </Button>
                        </div>
                    </div>

                    <Button onClick={() => handleLogin('kakao')} className="bg-[#FEE500] text-black hover:bg-[#FEE500]/90 w-full">
                        카카오로 시작하기
                    </Button>
                    <Button onClick={() => handleLogin('google')} variant="outline" className="w-full">
                        구글로 시작하기
                    </Button>
                </div>
            </div>
        </div>
    )
}
