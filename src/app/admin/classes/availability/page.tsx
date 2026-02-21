import { createClient } from '@/utils/supabase/server'
import AdminAvailabilityCalendar from '@/components/admin/availability-calendar'
import { getAvailabilityBlocks } from '@/app/classes/actions' // We might need to export this or just fetch directly
import { addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function AdminAvailabilityPage() {
    const supabase = await createClient()

    // Fetch classes (to show dots)
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
    
    // Fetch availabilities (fetch generous range, e.g. +- 1 year, or handle dynamic fetching in component)
    // For simplicity, let's fetch all active blocks or large range
    const { data: blocks } = await supabase
        .from('availability_blocks')
        .select('*')
    
    // Fetch pools
    const { data: pools } = await supabase
        .from('pools')
        .select('*')
        .eq('is_active', true)
        .order('name')

    // Fetch class type settings
    const { data: classTypeSettings } = await supabase
        .from('class_type_settings')
        .select('*')

    
    return (
        <div className="container max-w-7xl mx-auto space-y-6 p-4">
            <h2 className="text-2xl font-bold">예약/일정 관리</h2>
            <AdminAvailabilityCalendar 
                existingClasses={classes || []} 
                existingBlocks={blocks || []} 
                pools={pools || []}
                classTypeSettings={classTypeSettings || []}
            />
        </div>
    )
}
