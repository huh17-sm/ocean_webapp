import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CreditHistoryView } from '@/components/dashboard/credit-history-view'
import { getCreditTransactions } from '@/app/admin/actions/credits'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CreditHistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const creditTransactions = await getCreditTransactions(user.id)

  return <CreditHistoryView transactions={creditTransactions} />
}
