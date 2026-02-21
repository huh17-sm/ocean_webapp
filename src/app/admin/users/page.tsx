import { createClient } from '@/utils/supabase/server'
import { UserTable } from '@/components/admin/user-table'

export default async function AdminUsersPage() {
    const supabase = await createClient()
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

    const formattedUsers = (users || []).map(u => ({
        ...u,
        credits: u.general_credits || 0,
        phone_number: u.phone,
        birthdate: u.birth_date,
        pb_cwt: u.cwt_record,
        pb_sta: u.sta_record,
        pb_dyn: u.dny_record,
        health_memo: u.diving_notes || u.health_memo // 둘 중 있는 것 사용
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">회원 관리</h2>
            </div>

            <UserTable users={formattedUsers} />
        </div>
    )
}
