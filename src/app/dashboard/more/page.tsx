import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MoreView } from '@/components/dashboard/more-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MorePage() {
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

  return <MoreView profile={profile} user={user} />
}
