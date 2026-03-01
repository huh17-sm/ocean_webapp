"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Award,
  Coins,
  Calendar,
  TrendingUp,
  Bell,
  FileText,
  Shield,
  HelpCircle,
  ChevronRight,
  LogOut,
  Megaphone,
  MessageCircle,
  Info,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOutAction } from "@/app/auth/actions";

interface MoreViewProps {
  profile: any;
  user: any;
}

export function MoreView({ profile, user }: MoreViewProps) {
  const router = useRouter();

  // 서버 사이드에서 로그아웃 처리 (쿠키까지 확실히 정리)
  const handleLogout = async () => {
    toast.success("로그아웃되었습니다");
    await signOutAction();
  };

  const menuSections = [
    {
      title: "내 정보",
      items: [
        {
          icon: User,
          label: "프로필 및 설정",
          href: "/dashboard/profile",
          badge: null,
        },
        {
          icon: Award,
          label: "자격증 관리",
          href: "/dashboard/certificates",
          badge: null,
        },
        {
          icon: Coins,
          label: "크레딧",
          href: "/dashboard/credits",
          badge: null,
        },
      ],
    },
    {
      title: "수업",
      items: [
        {
          icon: Calendar,
          label: "내 예약 현황",
          href: "/dashboard/reservations",
          badge: null,
        },
        {
          icon: BookOpen,
          label: "교육 과정",
          href: "/dashboard/courses",
          badge: null,
        },
        {
          icon: TrendingUp,
          label: "내 진도",
          href: "/dashboard/progress",
          badge: null,
        },
        {
          icon: MessageCircle,
          label: "피드백 (디브리핑)",
          href: "/dashboard/debriefings",
          badge: null,
        },
      ],
    },
    {
      title: "서비스 정보",
      items: [
        {
          icon: Megaphone,
          label: "공지사항",
          href: "/announcements",
          badge: null,
        },
        {
          icon: HelpCircle,
          label: "자주 묻는 질문",
          href: "/faq",
          badge: null,
        },
      ],
    },
    {
      title: "약관 및 정책",
      items: [
        {
          icon: FileText,
          label: "이용약관",
          href: "/terms",
          badge: null,
        },
        {
          icon: Shield,
          label: "개인정보처리방침",
          href: "/privacy",
          badge: null,
        },
        {
          icon: AlertTriangle,
          label: "안전 고지사항",
          href: "/safety",
          badge: null,
        },
      ],
    },
    {
      title: "고객 지원",
      items: [
        {
          icon: MessageCircle,
          label: "문의하기",
          href: "/contact",
          badge: null,
        },
      ],
    },
    {
      title: "기타",
      items: [
        {
          icon: Info,
          label: "앱 정보",
          href: "/about",
          badge: null,
        },
      ],
    },
  ];

  // 관리자 계정일 경우 관리 메뉴 추가
  if (profile?.role === "admin") {
    menuSections.push({
      title: "시스템 관리",
      items: [
        {
          icon: Shield,
          label: "관리자 페이지",
          href: "/admin",
          badge: null,
        },
      ],
    });
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          더보기
        </h1>
        <p className="text-slate-500 mt-1">계정 설정 및 추가 메뉴</p>
      </div>

      {/* 프로필 카드 */}
      <Card className="bg-gradient-to-br from-slate-700 to-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full p-4">
              <User className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{profile?.name || "사용자"}</h2>
              <p className="text-sm opacity-90">{user.email}</p>
            </div>
            <Link href="/dashboard/profile">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 border-0"
              >
                편집
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 메뉴 섹션들 */}
      {menuSections.map((section, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 px-2">
            {section.title}
          </h3>
          <Card>
            <CardContent className="p-0">
              {section.items.map((item, itemIdx) => (
                <Link key={itemIdx} href={item.href}>
                  <div
                    className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                      itemIdx !== section.items.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-slate-900">
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <Badge variant="destructive">{item.badge}</Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* 로그아웃 버튼 */}
      <Card>
        <CardContent className="p-0">
          <button
            onClick={handleLogout}
            className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors w-full text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-600">로그아웃</span>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </button>
        </CardContent>
      </Card>

      {/* 버전 정보 */}
      <div className="text-center text-sm text-slate-400 py-4">
        <p>Ocean Freediving v1.0.0 (Beta)</p>
        <p className="mt-1">© 2026 Ocean Freediving. All rights reserved.</p>
      </div>
    </div>
  );
}
