'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, User, Waves, Settings, LogOut, Trash2, Edit2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface ProfileViewProps {
  profile: any
  user: any
}

export function ProfileView({ profile, user }: ProfileViewProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isEditingBasic, setIsEditingBasic] = useState(false)
  const [isEditingDiving, setIsEditingDiving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [basicInfo, setBasicInfo] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    birth_date: profile?.birth_date || '',
  })

  const [divingRecords, setDivingRecords] = useState({
    sta_record: profile?.sta_record || '',
    cwt_record: profile?.cwt_record || '',
    dny_record: profile?.dny_record || '',
    diving_notes: profile?.diving_notes || '',
  })

  const [notifications, setNotifications] = useState({
    class_reminder: true,
    marketing: false,
  })

  const handleSaveBasicInfo = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: basicInfo.name,
          phone: basicInfo.phone,
          birth_date: basicInfo.birth_date || null,
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('기본 정보가 수정되었습니다')
      setIsEditingBasic(false)
      router.refresh()
    } catch (error) {
      toast.error('정보 수정에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveDivingRecords = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          sta_record: divingRecords.sta_record || null,
          cwt_record: divingRecords.cwt_record || null,
          dny_record: divingRecords.dny_record || null,
          diving_notes: divingRecords.diving_notes || null,
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('다이빙 기록이 수정되었습니다')
      setIsEditingDiving(false)
      router.refresh()
    } catch (error) {
      toast.error('기록 수정에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        '정말로 회원탈퇴 하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 데이터가 삭제됩니다.'
      )
    ) {
      return
    }

    if (
      prompt('회원탈퇴를 진행하려면 "회원탈퇴"를 입력해주세요.') !== '회원탈퇴'
    ) {
      return
    }

    toast.error('회원탈퇴 기능은 관리자에게 문의해주세요')
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <User className="h-6 w-6 text-blue-500" />
            프로필 및 설정
          </h1>
          <p className="text-slate-500 mt-1">내 정보를 관리하세요</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              기본 정보
            </CardTitle>
            {!isEditingBasic ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditingBasic(true)}>
                <Edit2 className="h-4 w-4 mr-1" />
                수정하기
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingBasic(false)
                    setBasicInfo({
                      name: profile?.name || '',
                      phone: profile?.phone || '',
                      birth_date: profile?.birth_date || '',
                    })
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveBasicInfo}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={basicInfo.name}
              onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
              disabled={!isEditingBasic}
            />
          </div>
          <div>
            <Label htmlFor="email">이메일</Label>
            <Input id="email" value={user.email} disabled />
          </div>
          <div>
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={basicInfo.phone}
              onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
              disabled={!isEditingBasic}
              placeholder="010-0000-0000"
            />
          </div>
          <div>
            <Label htmlFor="birth_date">생년월일 (선택)</Label>
            <Input
              id="birth_date"
              type="date"
              value={basicInfo.birth_date}
              onChange={(e) => setBasicInfo({ ...basicInfo, birth_date: e.target.value })}
              disabled={!isEditingBasic}
            />
          </div>
        </CardContent>
      </Card>

      {/* 다이빙 기록 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              <Waves className="h-5 w-5 text-cyan-600" />
              다이빙 기록
            </CardTitle>
            {!isEditingDiving ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditingDiving(true)}>
                <Edit2 className="h-4 w-4 mr-1" />
                수정하기
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingDiving(false)
                    setDivingRecords({
                      sta_record: profile?.sta_record || '',
                      cwt_record: profile?.cwt_record || '',
                      dny_record: profile?.dny_record || '',
                      diving_notes: profile?.diving_notes || '',
                    })
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveDivingRecords}
                  disabled={isLoading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sta_record">STA (Static Apnea)</Label>
            <Input
              id="sta_record"
              value={divingRecords.sta_record}
              onChange={(e) => setDivingRecords({ ...divingRecords, sta_record: e.target.value })}
              disabled={!isEditingDiving}
              placeholder="예: 4:30"
            />
          </div>
          <div>
            <Label htmlFor="cwt_record">CWT (Constant Weight)</Label>
            <Input
              id="cwt_record"
              value={divingRecords.cwt_record}
              onChange={(e) => setDivingRecords({ ...divingRecords, cwt_record: e.target.value })}
              disabled={!isEditingDiving}
              placeholder="예: 30m"
            />
          </div>
          <div>
            <Label htmlFor="dny_record">DNY (Dynamic No Fins)</Label>
            <Input
              id="dny_record"
              value={divingRecords.dny_record}
              onChange={(e) => setDivingRecords({ ...divingRecords, dny_record: e.target.value })}
              disabled={!isEditingDiving}
              placeholder="예: 50m"
            />
          </div>
          <div>
            <Label htmlFor="diving_notes">비고</Label>
            <Input
              id="diving_notes"
              value={divingRecords.diving_notes}
              onChange={(e) =>
                setDivingRecords({ ...divingRecords, diving_notes: e.target.value })
              }
              disabled={!isEditingDiving}
              placeholder="기타 기록사항"
            />
          </div>
        </CardContent>
      </Card>

      {/* 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-600" />
            설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="class_reminder">수업 알림</Label>
              <p className="text-sm text-slate-500">수업 예약 및 일정 알림을 받습니다</p>
            </div>
            <Switch
              id="class_reminder"
              checked={notifications.class_reminder}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, class_reminder: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketing">마케팅 알림</Label>
              <p className="text-sm text-slate-500">이벤트 및 프로모션 알림을 받습니다</p>
            </div>
            <Switch
              id="marketing"
              checked={notifications.marketing}
              onCheckedChange={(checked) =>
                setNotifications({ ...notifications, marketing: checked })
              }
            />
          </div>

          <div className="border-t pt-4 mt-4 space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/profile/change-password">비밀번호 변경</Link>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={handleDeleteAccount}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              회원탈퇴
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
