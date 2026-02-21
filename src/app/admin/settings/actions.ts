'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 수업 타입 설정 조회
export async function getClassTypeSettings() {
    const supabase = await createClient()
    
    const { data, error } = await supabase
        .from('class_type_settings')
        .select('*')
        .order('sort_order', { ascending: true })
    
    if (error) {
        console.error('Error fetching class type settings:', error)
        return []
    }
    
    return data || []
}

// 수업 타입 설정 업데이트
export async function updateClassTypeSetting(type: string, updates: {
    label?: string
    credit_cost?: number
    is_active?: boolean
    sort_order?: number
}) {
    const supabase = await createClient()
    
    const { error } = await supabase
        .from('class_type_settings')
        .update(updates)
        .eq('type', type)
    
    if (error) {
        console.error('Error updating class type setting:', error)
        throw new Error('설정 업데이트에 실패했습니다.')
    }
    
    revalidatePath('/admin/settings')
    revalidatePath('/classes')
    revalidatePath('/admin/classes/availability')
}

// 새 수업 타입 추가
export async function createClassTypeSetting(data: {
    type: string
    label: string
    credit_cost: number
    sort_order: number
}) {
    const supabase = await createClient()
    
    const { error } = await supabase
        .from('class_type_settings')
        .insert({
            ...data,
            is_active: true
        })
    
    if (error) {
        console.error('Error creating class type setting:', error)
        throw new Error('타입 추가에 실패했습니다.')
    }
    
    revalidatePath('/admin/settings')
    revalidatePath('/classes')
}

// 수업 타입 삭제 (비활성화)
export async function deleteClassTypeSetting(type: string) {
    const supabase = await createClient()
    
    // 실제 삭제 대신 비활성화
    const { error } = await supabase
        .from('class_type_settings')
        .update({ is_active: false })
        .eq('type', type)
    
    if (error) {
        console.error('Error deleting class type setting:', error)
        throw new Error('타입 삭제에 실패했습니다.')
    }
    
    revalidatePath('/admin/settings')
}
