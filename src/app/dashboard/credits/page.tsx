import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CreditsView } from '@/components/dashboard/credits-view'
import { getCreditTransactions } from '@/app/admin/actions/credits'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CreditsPage() {
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

  const creditTransactions = await getCreditTransactions(user.id)

  const formattedProfile = {
    ...profile,
    credits: profile?.general_credits || 0
  }

  return <CreditsView profile={formattedProfile} transactions={creditTransactions} />
}
