import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, MessageCircle, Instagram, BookOpen, Waves, Dumbbell } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { CREDIT_UNIT } from "@/lib/constants";

// 캐싱 전략: 60초마다 재검증 (ISR - Incremental Static Regeneration)
// 매 방문마다 DB 호출하지 않고, 60초간 캐시된 데이터 사용
export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch class type settings for dynamic credit costs
  const { data: classTypeSettings } = await supabase
    .from('class_type_settings')
    .select('*')
    .eq('is_active', true)

  // Fetch courses from DB
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .in('status', ['ACTIVE', 'INQUIRY_ONLY'])
    .order('sort_order', { ascending: true })

  // Icon mapping
  const iconMap: Record<string, any> = {
    'BookOpen': BookOpen,
    'Waves': Waves,
    'Dumbbell': Dumbbell,
    'Award': Check 
  }

  const getCourseIcon = (iconName: string | null) => {
    if (!iconName) return Waves
    return iconMap[iconName] || Waves
  }

  const colorMap: Record<string, string> = {
    'theory': 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
    'pool': 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    'training': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    'lv_04': 'bg-slate-50 text-slate-700 hover:bg-slate-100',
  }

  // Dynamic Credit Cost Logic
  const getCreditCost = (type: string) => {
    const setting = classTypeSettings?.find(s => s.type === type)
    return setting ? setting.credit_cost : 1 
  }

  return (
    <div className="flex min-h-screen flex-col ocean-gradient-subtle">
      {/* 1. Hero Section */}
      <section className="relative ocean-gradient py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white animate-float" />
          <div className="absolute bottom-20 right-20 w-16 h-16 rounded-full bg-white animate-wave" style={{animationDelay: '1s'}} />
          <div className="absolute top-1/2 left-1/4 w-12 h-12 rounded-full bg-white animate-float" style={{animationDelay: '0.5s'}} />
        </div>
        
        <div className="container mx-auto px-4 flex flex-col items-center text-center gap-6 relative z-10">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm animate-fade-up">🌊 Ocean Freediving</Badge>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl max-w-2xl animate-fade-up" style={{animationDelay: '0.1s'}}>
            가장 안전하고 즐거운 <br className="hidden sm:inline" />
            <span className="text-accent drop-shadow-lg">프리다이빙</span>의 시작
          </h1>
          <p className="text-lg text-white/90 max-w-lg animate-fade-up" style={{animationDelay: '0.2s'}}>
            체계적인 교육 과정과 함께 바다 속의 자유를 경험하세요.
            <br />
            초보자부터 전문가 과정까지, 오션과 함께하세요.
          </p>

          <div className="flex gap-4 mt-4 animate-fade-up" style={{animationDelay: '0.3s'}}>
            {user ? (
              <Link href="/dashboard">
                <Button variant="secondary" size="lg" className="rounded-full px-8">내 대시보드 (교육현황)</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="secondary" size="lg" className="rounded-full px-8">교육 시작하기 (로그인)</Button>
              </Link>
            )}
            <Link href="#courses">
              <Button variant="outline" size="lg" className="rounded-full px-8 border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white">교육 과정 보기</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Course & Pricing Section */}
      <section id="courses" className="py-20 container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-up">
          <h2 className="text-3xl font-bold text-foreground">교육 과정 안내</h2>
          <p className="text-muted-foreground mt-2">정규 교육 과정 및 트레이닝 비용 안내입니다.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {courses?.map((course) => {
            const Icon = getCourseIcon(course.icon)
            const colorClass = colorMap[course.id] || 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            const isInquiryOnly = course.status === 'INQUIRY_ONLY'

            // Price display logic
            let priceDisplay = '문의'
            let creditDisplay = null

            if (isInquiryOnly) {
              priceDisplay = '별도 문의'
            } else if (course.price?.standard) {
              priceDisplay = `${course.price.standard.toLocaleString()}원`
              
              // Use provided credits (Phase 3 Update)
              if (course.price.credits) {
                creditDisplay = `${course.price.credits} ${CREDIT_UNIT}`
              }
            }

            return (
              <Card key={course.id} className="relative flex flex-col hover:shadow-lg transition-shadow border-slate-200">
                <CardHeader>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {isInquiryOnly && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                        준비 중
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <CardDescription className="h-10 line-clamp-2 flex items-center">{course.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-6">
                    <div className="text-2xl font-bold text-slate-900 whitespace-nowrap tracking-tight">
                      {priceDisplay}
                      {!isInquiryOnly && (
                        <span className="text-base font-normal text-slate-500">
                          {' / '}
                          {course.session_count ?? 1}세션
                        </span>
                      )}
                    </div>
                    {creditDisplay && (
                      <div className="text-sm font-medium text-emerald-600 mt-1">
                        {creditDisplay} 제공
                      </div>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {course.features?.map((feature: string) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-blue-500" /> {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isInquiryOnly ? (
                    <a href="https://kakao.com" target="_blank" rel="noreferrer" className="w-full">
                      <Button className="w-full" variant="outline">
                        문의하기
                      </Button>
                    </a>
                  ) : (
                    <Link href={`/classes?type=${course.id}`} className="w-full">
                      <Button className="w-full" variant={course.id === 'pool' ? 'default' : 'outline'}>
                        {course.title} 예약하기
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        <div className="mt-12 text-center p-6 bg-slate-100 rounded-2xl">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">💳 결제 및 크레딧 충전 안내</h3>
          <p className="text-slate-600 mb-4">
            현재 시스템에서는 <strong>무통장 입금</strong> 후 관리자가 크레딧을 충전해드리고 있습니다. <br />
            입금 후 아래 문의 채널로 연락 주시면 빠르게 처리해드립니다.
          </p>
          <div className="inline-block bg-white px-4 py-2 rounded border border-slate-200 font-mono text-slate-700">
            농협 000-0000-0000-00 (예금주: 오션프리다이빙)
          </div>
        </div>
      </section>

      {/* 3. Feedback & Records Info (Req 5, 6, 7) */}
      <section className="py-20 bg-white/50 backdrop-blur-sm border-y">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-up">
            <Badge className="bg-accent/20 text-accent-foreground hover:bg-accent/30">Feedback System</Badge>
            <h2 className="text-3xl font-bold text-foreground">꼼꼼한 피드백과<br />나만의 다이빙 기록</h2>
            <p className="text-lg text-muted-foreground">
              수업이 끝난 후, 강사님이 직접 작성한 <strong>디브리핑(피드백)</strong>과
              고화질 <strong>수중 촬영 영상/사진</strong>을 마이페이지에서 확인하세요.
            </p>
            <ul className="space-y-4 pt-4">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">1</div>
                <span className="text-slate-700">개인별 맞춤 개선점 및 연습 방법 제공</span>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">2</div>
                <span className="text-slate-700">구글 드라이브 링크를 통한 원본 영상 제공 (무제한 보관)</span>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">3</div>
                <span className="text-slate-700">교육 과정 진행 현황 한눈에 보기</span>
              </li>
            </ul>
            <Link href={user ? "/dashboard" : "/login"}>
              <Button variant="link" className="px-0 text-blue-600 h-auto font-semibold">
                내 기록 확인하러 가기 &rarr;
              </Button>
            </Link>
          </div>
          <div className="bg-slate-100 rounded-2xl aspect-4/3 flex items-center justify-center text-slate-400">
            {/* 추후 실제 이미지로 교체 */}
            <div className="text-center">
              <p>이미지 영역</p>
              <p className="text-sm">(수중 촬영 사진 등)</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Inquiry (Req 8) */}
      <section className="py-20 bg-linear-to-b from-primary to-primary/80 text-white relative overflow-hidden">
        {/* Decorative bubbles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-24 h-24 rounded-full border-2 border-white animate-float" />
          <div className="absolute bottom-10 left-10 w-20 h-20 rounded-full border-2 border-white animate-wave" />
          <div className="absolute top-1/3 left-1/3 w-16 h-16 rounded-full border-2 border-white animate-float" style={{animationDelay: '0.7s'}} />
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl font-bold mb-8">궁금한 점이 있으신가요?</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="https://kakao.com" target="_blank" rel="noreferrer">
              <Button size="lg" className="w-full sm:w-auto bg-[#FEE500] text-black hover:bg-[#FEE500]/90 gap-2">
                <MessageCircle className="w-5 h-5" /> 카카오톡 상담하기
              </Button>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <Button size="lg" className="w-full sm:w-auto bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2 border-0">
                <Instagram className="w-5 h-5" /> 인스타그램 DM 보내기
              </Button>
            </a>
          </div>
          <p className="mt-8 text-slate-400 text-sm">
            상담 가능 시간: 평일 10:00 - 19:00 (주말/공휴일 휴무)
          </p>
        </div>
      </section>

    </div>
  );
}
