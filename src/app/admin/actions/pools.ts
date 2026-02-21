'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { Pool, PoolSchedule, HolidayRule } from '@/types'

export async function getPools(): Promise<Pool[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('pools')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching pools:', error)
        throw new Error('Failed to fetch pools')
    }

    return data.map((pool: any) => ({
        id: pool.id,
        name: pool.name,
        description: pool.description,
        is_active: pool.is_active,
        schedule: pool.schedule,
        holidayRules: pool.holiday_rules || [], // Map DB snake_case to TS camelCase
        created_at: pool.created_at
    }))
}

export async function createPool(name: string) {
    const supabase = await createClient()
    
    if (!name.trim()) throw new Error('Name is required')

    const { error } = await supabase.from('pools').insert({
        name,
        is_active: true,
        schedule: { weekday: [], saturday: [], sunday: [], holiday: [] },
        holiday_rules: []
    })

    if (error) {
        console.error('Error creating pool:', error)
        throw new Error('Failed to create pool')
    }

    revalidatePath('/admin/pools')
}

export async function updatePool(pool: Pool) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('pools')
        .update({
            name: pool.name,
            is_active: pool.is_active,
            schedule: pool.schedule,
            holiday_rules: pool.holidayRules // Map TS camelCase to DB snake_case
        })
        .eq('id', pool.id)

    if (error) {
        console.error('Error updating pool:', error)
        throw new Error('Failed to update pool')
    }

    revalidatePath('/admin/pools')
}

export async function deletePool(poolId: string) {
    const supabase = await createClient()

    const { error } = await supabase.from('pools').delete().eq('id', poolId)

    if (error) {
        console.error('Error deleting pool:', error)
        throw new Error('Failed to delete pool')
    }

    revalidatePath('/admin/pools')
}

export async function togglePoolActive(poolId: string, isActive: boolean) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('pools')
        .update({ is_active: isActive })
        .eq('id', poolId)

    if (error) {
        console.error('Error updating pool status:', error)
        throw new Error('Failed to update pool status')
    }

    revalidatePath('/admin/pools')
}
