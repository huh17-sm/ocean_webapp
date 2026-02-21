import { UserProfile } from '@/types'
import { Badge } from "@/components/ui/badge"
import { CreditAdjustmentDialog } from './credit-adjustment-dialog'

export function UserDetailView({ user }: { user: UserProfile }) {
    return (
        <div className="p-3 md:p-6 bg-slate-50/80 rounded-lg">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">

                {/* 1. 활동 정보 */}
                <div className="space-y-3">
                    <h4 className="text-xs md:text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        활동 정보
                    </h4>
                    <div className="bg-white p-3 rounded border text-sm space-y-2 shadow-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">진행 과정</span>
                            <span className="font-medium text-xs scale-90 origin-right">{user.current_progress || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">보유 크레딧</span>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{user.credits}C</span>
                                <CreditAdjustmentDialog userId={user.id} currentCredits={user.credits ?? 0} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">만료일</span>
                            <span className="font-medium text-xs">{user.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : '-'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. 테크니컬 */}
                <div className="space-y-3">
                    <h4 className="text-xs md:text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        테크니컬
                    </h4>
                    <div className="bg-white p-3 rounded border text-sm space-y-2 shadow-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">CWT (수심)</span>
                            <span className="font-medium">{user.pb_cwt ? `${user.pb_cwt}m` : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">DYN (잠영)</span>
                            <span className="font-medium">{user.pb_dyn ? `${user.pb_dyn}m` : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">STA (숨참기)</span>
                            <span className="font-medium">{user.pb_sta || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">이퀄라이징</span>
                            <span className="font-medium">{user.equalization || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t mt-1">
                            <span className="text-xs text-gray-500">장비/렌탈</span>
                            <span className="font-medium text-xs">{user.equipment || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* 3. 회원 정보 */}
                <div className="space-y-3">
                    <h4 className="text-xs md:text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        회원 정보
                    </h4>
                    <div className="bg-white p-3 rounded border text-sm space-y-2 shadow-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">이름</span>
                            <span className="font-medium">{user.name || '미설정'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">생년월일</span>
                            <span className="font-medium">{user.birthdate || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">보유 자격증</span>
                            <div className="scale-90 origin-right">
                                <Badge variant={user.cert_status === '발급완료' ? 'default' : 'outline'} className="text-[10px] h-5">
                                    {user.cert_status || '미발급'}
                                </Badge>
                            </div>
                        </div>
                        <div className="flex justify-between mt-1 pt-2 border-t text-[10px] text-gray-400">
                            <span>ID</span>
                            <span className="truncate max-w-[100px] text-right" title={user.email}>{user.email}</span>
                        </div>
                    </div>
                </div>

                {/* 4. 비고 */}
                <div className="space-y-3">
                    <h4 className="text-xs md:text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        비고 (건강/메모)
                    </h4>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-xs min-h-[100px] max-h-[140px] overflow-y-auto shadow-sm">
                        {user.health_memo ? (
                            <p className="leading-relaxed text-gray-700 whitespace-pre-wrap">{user.health_memo}</p>
                        ) : (
                            <span className="text-gray-400">등록된 내용 없음</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
