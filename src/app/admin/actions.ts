'use server'

import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { UserProfile } from '@/types'


export async function createUser(formData: FormData) {
    const supabaseAdmin = getSupabaseAdmin()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const birthdate = formData.get('birthdate') as string
    const phone = formData.get('phone') as string

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
    })

    if (authError || !authData.user) {
        console.error('Error creating auth user:', authError)
        throw new Error(authError?.message || 'Failed to create user')
    }

    // 2. Update Profile (Trigger might create it, but we update details)
    // We wait a bit or just upsert. The trigger usually runs fast. 
    // But to be safe and set extra fields like birthdate/phone immediately:
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            name,
            birth_date: birthdate || null,
            phone: phone || null,
            role: 'user' // Default role
        })
        .eq('id', authData.user.id)

    if (profileError) {
        // If trigger hasn't run yet, update might fail/miss. 
        // Retrying or Upserting is safer if we are not sure about trigger timing.
        // Let's try upsert with the ID.
        const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email,
                name,
                birth_date: birthdate || null,
                phone: phone || null,
                role: 'user'
            })

        if (upsertError) {
            console.error('Error updating profile:', upsertError)
            // We don't throw here to avoid rolling back the auth creation (which we can't easily undo without another call), 
            // but effectively the user exists.
        }
    }

    revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
        console.error('Error deleting user:', error)
        throw new Error('Failed to delete user')
    }

    revalidatePath('/admin/users')
}

export type ClassType = 'theory' | 'pool' | 'training'

export async function createClass(formData: FormData) {
    const supabase = await createClient()

    const date = formData.get('date') as string
    const time = formData.get('time') as string
    const title = formData.get('title') as string
    const type = formData.get('type') as ClassType
    const location = formData.get('location') as string
    const max_capacity = parseInt(formData.get('max_capacity') as string)
    const credit_cost = parseInt(formData.get('credit_cost') as string) || 1

    const { error } = await supabase.from('classes').insert({
        date,
        time,
        title,
        type,
        location,
        max_capacity,
        current_enrollment: 0
    })

    if (error) {
        console.error('Error creating class:', error)
        throw new Error('Failed to create class')
    }

    revalidatePath('/admin/classes')
}

export async function deleteClass(classId: string) {
    const supabase = await createClient()

    // 1. 권한 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        throw new Error('로그인이 필요합니다.')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        throw new Error('관리자 권한이 필요합니다.')
    }

    // Admin 클라이언트 사용 (RLS 및 FK 제약조건 우회 처리)
    const supabaseAdmin = getSupabaseAdmin()

    // 0. 삭제할 수업 정보 먼저 가져오기 (관련 요청 찾기 위해)
    const { data: classToDelete, error: fetchError } = await supabaseAdmin
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single()

    if (fetchError) {
        console.error('Error fetching class to delete:', fetchError)
        throw new Error(`수업 정보를 불러오는데 실패했습니다: ${fetchError.message}`)
    }

    // 1. 연관된 데이터 정리 (Helper Functions 이용)
    await unlinkReservationCredits(supabaseAdmin, classId)
    await deleteReservations(supabaseAdmin, classId)
    
    // 2. 이 수업으로 인해 승인되었던 요청을 취소 상태로 변경
    if (classToDelete) {
        await cancelDeletedClassRequests(supabaseAdmin, classToDelete)
    }

    // 3. Delete the class
    const { error } = await supabaseAdmin.from('classes').delete().eq('id', classId)

    if (error) {
        console.error('Error deleting class:', error)
        throw new Error(`수업을 삭제하는데 실패했습니다: ${error.message}`)
    }

    revalidatePath('/admin/classes')
    revalidatePath('/dashboard') // 대시보드도 갱신
}

/**
 * 수업 삭제 전, 해당 수업의 예약과 연결된 크레딧 트랜잭션의 링크를 해제합니다.
 * (FK 제약조건으로 인해 예약 삭제 시 트랜잭션까지 삭제되는 것을 방지하거나 에러를 막기 위함)
 */
async function unlinkReservationCredits(supabaseAdmin: any, classId: string) {
    const { data: reservations } = await supabaseAdmin
        .from('reservations')
        .select('id')
        .eq('class_id', classId)
    
    if (reservations && reservations.length > 0) {
        const reservationIds = reservations.map((r: any) => r.id)
        
        const { error: txError } = await supabaseAdmin
            .from('credit_transactions')
            .update({ 
                related_entity_id: null, 
                related_entity_type: 'deleted_reservation' 
            })
            .in('related_entity_id', reservationIds)
        
        if (txError) {
            console.error('Error unlinking credit transactions:', txError)
        }
    }
}

/**
 * 수업에 포함된 예약들을 삭제합니다.
 */
async function deleteReservations(supabaseAdmin: any, classId: string) {
    const { error: reservationError } = await supabaseAdmin
        .from('reservations')
        .delete()
        .eq('class_id', classId)

    if (reservationError) {
        console.error('Error deleting related reservations:', reservationError)
        throw new Error(`관련된 예약을 삭제하는데 실패했습니다: ${reservationError.message}`)
    }
}

/**
 * 삭제되는 수업과 일치하는 승인된 요청들을 찾아 '취소됨' 상태로 변경합니다.
 */
async function cancelDeletedClassRequests(supabaseAdmin: any, classToDelete: any) {
    // 시간에서 초 제거 (HH:MM:SS -> HH:MM로 비교)
    const classTime = classToDelete.time?.split(':').slice(0, 2).join(':')
    


    const { data: relatedRequests, error: findError } = await supabaseAdmin
        .from('class_requests')
        .select('*')
        .eq('date', classToDelete.date)
        .eq('type', classToDelete.type)
        .eq('status', 'approved')

    if (!findError && relatedRequests && relatedRequests.length > 0) {
        // 시간과 장소도 확인해서 정확히 일치하는 요청만 업데이트
        const exactMatches = relatedRequests.filter((req: any) => {
            const reqTime = req.time_slot?.split(':').slice(0, 2).join(':')
            const timeMatch = reqTime === classTime
            const locationMatch = req.location === classToDelete.location
            
            return timeMatch && locationMatch
        })

        if (exactMatches.length > 0) {

            
            const updatePromises = exactMatches.map((req: any) =>
                supabaseAdmin
                    .from('class_requests')
                    .update({ 
                        status: 'cancelled',
                        admin_comment: '관리자가 수업을 취소했습니다.'
                    })
                    .eq('id', req.id)
            )

            await Promise.all(updatePromises)
        }
    }
}

export async function updateClass(classId: string, formData: FormData) {
    const supabase = await createClient()

    const date = formData.get('date') as string
    const time = formData.get('time') as string
    const title = formData.get('title') as string
    const type = formData.get('type') as ClassType
    const location = formData.get('location') as string
    const max_capacity = parseInt(formData.get('max_capacity') as string)
    const credit_cost = parseInt(formData.get('credit_cost') as string) || 1

    const { error } = await supabase
        .from('classes')
        .update({
            date,
            time,
            title,
            type,
            location,
            max_capacity
        })
        .eq('id', classId)

    if (error) {
        console.error('Error updating class:', error)
        throw new Error('Failed to update class')
    }

    revalidatePath('/admin/classes')
}


export async function updateUserProfile(userId: string, data: Partial<UserProfile>) {
    const supabaseAdmin = getSupabaseAdmin()

    // DB 컬럼명에 맞게 데이터 변환 (백워드 호환성 유지)
    const dbData: any = { ...data }
    
    if ('credits' in dbData) {
        dbData.general_credits = dbData.credits
        delete dbData.credits
    }
    if ('phone_number' in dbData) {
        dbData.phone = dbData.phone_number
        delete dbData.phone_number
    }
    if ('birthdate' in dbData) {
        dbData.birth_date = dbData.birthdate
        delete dbData.birthdate
    }
    if ('pb_cwt' in dbData) {
        dbData.cwt_record = dbData.pb_cwt
        delete dbData.pb_cwt
    }
    if ('pb_sta' in dbData) {
        dbData.sta_record = dbData.pb_sta
        delete dbData.pb_sta
    }
    if ('pb_dyn' in dbData) {
        dbData.dny_record = dbData.pb_dyn
        delete dbData.pb_dyn
    }
    if ('health_memo' in dbData) {
        dbData.diving_notes = dbData.health_memo
        delete dbData.health_memo
    }

    const { error } = await supabaseAdmin
        .from('profiles')
        .update(dbData)
        .eq('id', userId)

    if (error) {
        console.error('Error updating user profile:', error)
        throw new Error('Failed to update user profile')
    }

    revalidatePath('/admin/users')
}

export async function updateCourseStatus(courseId: string, status: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('courses')
        .update({ status })
        .eq('id', courseId)

    if (error) {
        console.error('Error updating course status:', error)
        throw new Error('Failed to update course status')
    }

    revalidatePath('/') // Revalidate homepage as well since it influences public view
}

export async function updateCourseSortOrder(courseId: string, sortOrder: number) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('courses')
        .update({ sort_order: sortOrder })
        .eq('id', courseId)

    if (error) {
        console.error('Error updating course sort order:', error)
        throw new Error('Failed to update course sort order')
    }

    revalidatePath('/admin/courses')
    revalidatePath('/')
}

export async function updateCoursesOrder(updates: { id: string; sort_order: number }[]) {
    const supabase = await createClient()

    // Transaction-like behavior not directly supported via single API call for multiple rows with different values,
    // so we iterate or use upsert if possible. Upsert is better for batch.
    // However, for small lists, iteration is fine, or `upsert` with all fields.
    // Since we only want to update sort_order, using `upsert` requires all not-null fields if we strictly follow SQL,
    // but standard SQL update case/when is complex in Supabase JS.
    // Simplest approach: Loop of rpc? Or just parallel promises.
    // Parallel promises for 10 items is negligible load.

    const promises = updates.map(update =>
        supabase.from('courses').update({ sort_order: update.sort_order }).eq('id', update.id)
    )

    await Promise.all(promises)

    revalidatePath('/admin/courses')
    revalidatePath('/')
}

export async function createCourse(formData: FormData) {
    const supabase = await createClient()

    const title = formData.get('title') as string
    const id = formData.get('id') as string
    const level = formData.get('level') as string
    const description = formData.get('description') as string
    const status = formData.get('status') as string
    const priceStandard = formData.get('price_standard') ? parseInt(formData.get('price_standard') as string) : null
    const credits = formData.get('credits') ? parseInt(formData.get('credits') as string) : null
    const sessionCount = formData.get('session_count') ? parseInt(formData.get('session_count') as string) : 1
    const featuresString = formData.get('features') as string
    const requiredSkillsString = formData.get('required_skills') as string

    const features = featuresString ? JSON.parse(featuresString) : []
    const requiredSkills = requiredSkillsString ? JSON.parse(requiredSkillsString) : []

    const { error } = await supabase.from('courses').insert({
        id: id || crypto.randomUUID(),
        title,
        level,
        description,
        status,
        price: { standard: priceStandard, credits },
        session_count: sessionCount,
        features,
        required_skills: requiredSkills,
        curriculum_details: [],
        requirements: {},
        icon: 'Waves'
    })

    if (error) {
        console.error('Error creating course:', error)
        throw new Error('Failed to create course')
    }

    revalidatePath('/admin/courses')
    revalidatePath('/')
}

export async function updateCourse(courseId: string, formData: FormData) {
    const supabase = await createClient()

    const title = formData.get('title') as string
    const level = formData.get('level') as string
    const description = formData.get('description') as string
    const status = formData.get('status') as string
    const priceStandard = formData.get('price_standard') ? parseInt(formData.get('price_standard') as string) : null
    const credits = formData.get('credits') ? parseInt(formData.get('credits') as string) : null
    const sessionCount = formData.get('session_count') ? parseInt(formData.get('session_count') as string) : 1
    const featuresString = formData.get('features') as string
    const requiredSkillsString = formData.get('required_skills') as string

    const features = featuresString ? JSON.parse(featuresString) : []
    const requiredSkills = requiredSkillsString ? JSON.parse(requiredSkillsString) : []

    const { error } = await supabase.from('courses').update({
        title,
        level,
        description,
        status,
        price: { standard: priceStandard, credits },
        session_count: sessionCount,
        features,
        required_skills: requiredSkills
    }).eq('id', courseId)

    if (error) {
        console.error('Error updating course:', error)
        throw new Error('Failed to update course')
    }

    revalidatePath('/admin/courses')
    revalidatePath('/')
}

export async function deleteCourse(courseId: string) {
    const supabase = await createClient()

    const { error } = await supabase.from('courses').delete().eq('id', courseId)

    if (error) {
        console.error('Error deleting course:', error)
        throw new Error('Failed to delete course')
    }

    revalidatePath('/admin/courses')
    revalidatePath('/')
}

/**
 * 관리자가 수강생을 수업에 수동으로 추가
 * - 예약 생성 (credit_cost 저장)
 * - 크레딧 차감 (RPC 원자적 트랜잭션)
 * - 수업 인원 증가 (RPC 원자적 트랜잭션)
 */
export async function addStudentToClass(
    classId: string,
    userId: string,
    creditCost: number
): Promise<{ success?: boolean; error?: string }> {
    const supabaseAdmin = getSupabaseAdmin()

    // 1. 수업 존재 및 정원 확인
    const { data: classData, error: classError } = await supabaseAdmin
        .from('classes')
        .select('type, current_enrollment, max_capacity')
        .eq('id', classId)
        .single()

    if (classError || !classData) {
        return { error: '수업 정보를 찾을 수 없습니다.' }
    }

    if (classData.current_enrollment >= classData.max_capacity) {
        return { error: '정원이 마감되었습니다.' }
    }

    // 2. 기존 예약 확인 (중복 방지 및 재사용)
    const { data: existing, error: existingError } = await supabaseAdmin
        .from('reservations')
        .select('id, status')
        .eq('user_id', userId)
        .eq('class_id', classId)
        .maybeSingle()

    if (existing) {
        if (existing.status === 'confirmed' || existing.status === 'attended') {
            return { error: '이미 등록된 수강생입니다.' }
        }
        
        // 'cancelled' 상태라면 기존 예약 행을 재사용
        const { data: updated, error: updateError } = await supabaseAdmin
            .from('reservations')
            .update({
                status: 'confirmed',
                credit_cost: creditCost,
                credit_refunded: false,
                debriefing: null,
                debriefing_at: null
            })
            .eq('id', existing.id)
            .select('id')
            .single()

        if (updateError || !updated) {
            return { error: `기존 예약 재활성화 실패: ${updateError?.message}` }
        }
        
        // 3. 재사용된 예약으로 진행 (이후 로직을 위해 reservation 변수 설정)
        var reservation = updated
    } else {
        // 3. 예약 생성 (아예 없는 경우만 insert)
        const { data: newReservation, error: reserveError } = await supabaseAdmin
            .from('reservations')
            .insert({
                user_id: userId,
                class_id: classId,
                status: 'confirmed',
                credit_cost: creditCost,
            })
            .select('id')
            .single()

        if (reserveError || !newReservation) {
            return { error: `예약 생성 실패: ${reserveError?.message}` }
        }
        var reservation = newReservation
    }

    // 4. 크레딧 차감 (0보다 클 때만)
    if (creditCost > 0) {
        const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
            'deduct_credits',
            {
                p_user_id: userId,
                p_amount: creditCost,
                p_reason: `reservation_${classData.type}`,
                p_related_entity_id: reservation.id,
                p_related_entity_type: 'reservation',
                p_memo: `${classData.type} 수업 수동 등록 (${creditCost}C 차감)`,
            }
        )

        if (deductError || (deductResult && !deductResult.success)) {
            // 롤백: 예약 삭제
            await supabaseAdmin.from('reservations').delete().eq('id', reservation.id)
            return { error: deductResult?.message || '크레딧이 부족합니다.' }
        }
    }

    // 5. 수업 인원 증가
    const { data: enrollResult, error: enrollError } = await supabaseAdmin.rpc(
        'increment_enrollment',
        { p_class_id: classId }
    )

    if (enrollError || !enrollResult?.[0]?.success) {
        // 롤백: 예약 삭제 + 크레딧 환불
        await supabaseAdmin.from('reservations').delete().eq('id', reservation.id)
        if (creditCost > 0) {
            await supabaseAdmin.rpc('add_credits', {
                p_user_id: userId,
                p_amount: creditCost,
                p_reason: `refund_rollback_${classData.type}`,
                p_related_entity_id: reservation.id,
                p_related_entity_type: 'reservation',
                p_memo: `수동 등록 롤백 환불 (${creditCost}C 반환)`,
            })
        }
        return { error: enrollResult?.[0]?.message || '인원 증가 중 오류가 발생했습니다.' }
    }

    revalidatePath('/admin/classes')
    revalidatePath('/classes')
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * 관리자가 수강생을 수업에서 삭제
 * - refund=true일 때만 크레딧 환불
 * - 예약 상태를 cancelled로 변경
 * - 수업 인원 감소 (RPC 원자적 트랜잭션)
 */
export async function removeStudentFromClass(
    reservationId: string,
    refund: boolean
): Promise<{ success?: boolean; error?: string }> {
    const supabaseAdmin = getSupabaseAdmin()

    // 1. 예약 정보 조회
    const { data: reservation, error: fetchError } = await supabaseAdmin
        .from('reservations')
        .select('id, user_id, class_id, status, credit_cost, credit_refunded, classes(type)')
        .eq('id', reservationId)
        .single()

    if (fetchError || !reservation) {
        return { error: '예약 정보를 찾을 수 없습니다.' }
    }

    if (reservation.status === 'cancelled') {
        return { error: '이미 취소된 예약입니다.' }
    }

    const classType = (reservation.classes as any)?.type || 'unknown'

    // 2. 예약 상태를 cancelled로 변경
    const { error: cancelError } = await supabaseAdmin
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId)

    if (cancelError) {
        return { error: '예약 취소 중 오류가 발생했습니다.' }
    }

    // 3. 환불 처리 (refund=true이고, 아직 환불되지 않았을 때만)
    if (refund && !reservation.credit_refunded) {
        const refundAmount = reservation.credit_cost || 0

        if (refundAmount > 0) {
            const { data: refundResult, error: refundError } = await supabaseAdmin.rpc(
                'add_credits',
                {
                    p_user_id: reservation.user_id,
                    p_amount: refundAmount,
                    p_reason: `refund_admin_removal_${classType}`,
                    p_related_entity_id: reservationId,
                    p_related_entity_type: 'reservation',
                    p_memo: `관리자 수강생 삭제 환불 (${refundAmount}C 반환)`,
                }
            )

            if (refundError) {
                console.error('Credit refund failed:', refundError)
            } else {
                // 환불 완료 표시
                await supabaseAdmin
                    .from('reservations')
                    .update({ credit_refunded: true })
                    .eq('id', reservationId)
            }
        }
    }

    // 4. 수업 인원 감소
    const { error: decrementError } = await supabaseAdmin.rpc(
        'decrement_enrollment',
        { p_class_id: reservation.class_id }
    )

    if (decrementError) {
        console.error('Enrollment decrement failed:', decrementError)
    }

    revalidatePath('/admin/classes')
    revalidatePath('/classes')
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * 수업의 수강생 목록 조회 (예약 + 프로필 정보)
 */
export async function getClassStudents(classId: string) {
    const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select(
      'id, user_id, status, credit_cost, credit_refunded, debriefing, debriefing_at, profiles:user_id(name, email)'
    )
    .eq('class_id', classId)
    .in('status', ['confirmed', 'attended'])
    .order('created_at', { ascending: true })

    if (error) {
        console.error('Error fetching class students:', error)
        return []
    }

    return data || []
}

/**
 * 수업의 media_link 업데이트
 */
export async function updateClassMediaLink(
    classId: string,
    mediaLink: string
): Promise<{ success?: boolean; error?: string }> {
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
        .from('classes')
        .update({ media_link: mediaLink || null })
        .eq('id', classId)

    if (error) {
        console.error('Error updating media link:', error)
        return { error: '미디어 링크 저장에 실패했습니다.' }
    }

    revalidatePath('/admin/classes/availability')
    revalidatePath('/admin/classes')
    return { success: true }
}

/**
 * 수업 완료 상태 토글
 */
export async function updateClassCompletion(
    classId: string,
    isCompleted: boolean
): Promise<{ success?: boolean; error?: string }> {
    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
        .from('classes')
        .update({ is_completed: isCompleted })
        .eq('id', classId)

    if (error) {
        console.error('Error updating class completion:', error)
        return { error: '수업 완료 상태 변경에 실패했습니다.' }
    }

    revalidatePath('/admin/classes/availability')
    revalidatePath('/admin/classes')
    return { success: true }
}

/**
 * 수강생 디브리핑 저장
 */
export async function saveDebriefing(
    reservationId: string,
    debriefing: string
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: '로그인이 필요합니다.' }
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. 기존 방식대로 reservations 테이블에 저장 (관리자 모달 UI 유지)
    const { error } = await supabaseAdmin
        .from('reservations')
        .update({
            debriefing: debriefing || null,
            debriefing_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

    if (error) {
        console.error('Error saving debriefing to reservations:', error)
        return { error: '디브리핑 저장에 실패했습니다.' }
    }

    // 2. 신규 사용자 화면용 debriefings 테이블에 동기화 저장
    const { data: existing } = await supabaseAdmin
        .from('debriefings')
        .select('id')
        .eq('reservation_id', reservationId)
        .maybeSingle()

    if (existing) {
        // 이미 데이터가 있으면 수행 평가(performance) 영역만 업데이트
        await supabaseAdmin
            .from('debriefings')
            .update({
                performance: debriefing || null,
                instructor_id: user.id
            })
            .eq('id', existing.id)
    } else if (debriefing) {
        // 데이터가 없고 내용이 있을 때만 새로 생성
        await supabaseAdmin
            .from('debriefings')
            .insert({
                reservation_id: reservationId,
                instructor_id: user.id,
                performance: debriefing || null
            })
    }

    revalidatePath('/admin/classes/availability')
    revalidatePath('/dashboard/debriefings') // 사용자 대시보드 강제 반영
    return { success: true }
}

/**
 * 관리자가 예약을 출석 완료 처리
 * - 예약 상태를 'attended'로 변경
 */
export async function completeReservation(
    reservationId: string
): Promise<{ success?: boolean; error?: string }> {
    const supabaseAdmin = getSupabaseAdmin()

    // 1. 예약 정보 조회
    const { data: reservation, error: fetchError } = await supabaseAdmin
        .from('reservations')
        .select('id, status')
        .eq('id', reservationId)
        .single()

    if (fetchError || !reservation) {
        return { error: '예약 정보를 찾을 수 없습니다.' }
    }

    if (reservation.status === 'attended') {
        return { error: '이미 출석 처리된 예약입니다.' }
    }

    if (reservation.status === 'cancelled') {
        return { error: '취소된 예약은 출석 처리할 수 없습니다.' }
    }

    // 2. 상태를 attended로 변경
    const { error: updateError } = await supabaseAdmin
        .from('reservations')
        .update({ status: 'attended' })
        .eq('id', reservationId)

    if (updateError) {
        return { error: '출석 처리 중 오류가 발생했습니다.' }
    }

    revalidatePath('/admin/classes')
    revalidatePath('/admin/classes/availability')
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * 관리자가 예약을 출석 취소 처리 (상태를 'confirmed'로 변경)
 */
export async function cancelReservationCompletion(
    reservationId: string
): Promise<{ success?: boolean; error?: string }> {
    const supabaseAdmin = getSupabaseAdmin()

    // 1. 예약 정보 조회
    const { data: reservation, error: fetchError } = await supabaseAdmin
        .from('reservations')
        .select('id, status')
        .eq('id', reservationId)
        .single()

    if (fetchError || !reservation) {
        return { error: '예약 정보를 찾을 수 없습니다.' }
    }

    if (reservation.status !== 'attended') {
        return { error: '출석 완료 처리된 예약만 취소할 수 있습니다.' }
    }

    // 2. 상태를 confirmed로 변경
    const { error: updateError } = await supabaseAdmin
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', reservationId)

    if (updateError) {
        return { error: '출석 취소 중 오류가 발생했습니다.' }
    }

    revalidatePath('/admin/classes')
    revalidatePath('/admin/classes/availability')
    revalidatePath('/dashboard')

    return { success: true }
}

/**
 * 수강생 검색 (이름 또는 이메일로)
 */
export async function searchUsers(query: string) {
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email, general_credits')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5)

    if (error) {
        console.error('Error searching users:', error)
        return []
    }

    return data || []
}
