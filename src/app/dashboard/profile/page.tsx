import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileView } from '@/components/dashboard/profile-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <ProfileView profile={profile} user={user} />
}
