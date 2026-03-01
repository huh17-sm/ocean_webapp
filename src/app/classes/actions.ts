"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  deductCreditsForReservation,
  refundCreditsForCancellation,
} from "@/app/admin/actions/credits";
import { getSupabaseAdmin } from "@/utils/supabase/admin";
import type { ReservationWithClass } from "@/types";
import { REFUND_POLICY } from "@/lib/constants";

export async function reserveClass(classId: string) {
  const supabase = await createClient();

  // 1. 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 2. 프로필(크레딧) 사전 확인 (UX용, 실제 차감은 RPC에서 원자적으로 처리)
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits:general_credits")
    .eq("id", user.id)
    .single();

  if (!profile || profile.credits < 1) {
    return { error: "크레딧이 부족합니다." };
  }

  // 3. 수업 확인 (정원 체크 및 타입 확인)
  const { data: classData } = await supabase
    .from("classes")
    .select("current_enrollment, max_capacity, type")
    .eq("id", classId)
    .single();

  if (!classData || classData.current_enrollment >= classData.max_capacity) {
    return { error: "정원이 마감되었습니다." };
  }

  // 3-1. 타입별 크레딧 비용 조회
  const { data: typeSetting } = await supabase
    .from("class_type_settings")
    .select("credit_cost")
    .eq("type", classData.type)
    .single();

  const creditCost = typeSetting?.credit_cost ?? 1;

  if (profile.credits < creditCost) {
    return {
      error: `크레딧이 부족합니다. (필요: ${creditCost}, 보유: ${profile.credits})`,
    };
  }

  // 3-2. 기존 예약 확인 (중복 방지 및 재사용)
  const { data: existing, error: existingError } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("class_id", classId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "confirmed" || existing.status === "attended") {
      return { error: "이미 예약된 수업입니다." };
    }

    // 'cancelled' 상태라면 기존 예약 행을 재사용
    const { data: updated, error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "confirmed",
        credit_cost: creditCost,
        credit_refunded: false,
        debriefing: null,
        debriefing_at: null,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (updateError || !updated) {
      return { error: "예약 재활성화 중 오류가 발생했습니다." };
    }
    var reservationId = updated.id;
  } else {
    // 4-1. 예약 생성 (아예 없는 경우만 insert)
    const { data: newReservation, error: reserveError } = await supabase
      .from("reservations")
      .insert({
        user_id: user.id,
        class_id: classId,
        status: "confirmed",
        credit_cost: creditCost,
      })
      .select("id")
      .single();

    if (reserveError || !newReservation) {
      return { error: "이미 예약한 수업이거나 오류가 발생했습니다." };
    }
    var reservationId = newReservation.id;
  }

  // 4-2. 크레딧 차감 (RPC - 원자적 트랜잭션, credit_transactions 자동 기록)
  const deductResult = await deductCreditsForReservation(
    user.id,
    creditCost,
    reservationId,
    classData.type,
  );

  if (!deductResult.success) {
    // 롤백: 예약 상태를 다시 취소로 돌리거나, 새로 만든 경우만 삭제
    if (existing) {
      await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId);
    } else {
      await supabase.from("reservations").delete().eq("id", reservationId);
    }

    return { error: deductResult.message || "크레딧이 부족합니다." };
  }

  // 4-3. 수업 인원 증가 (RPC - 원자적 트랜잭션, Race Condition 방지)
  const { data: enrollmentResult, error: enrollmentError } = await supabase.rpc(
    "increment_enrollment",
    { p_class_id: classId },
  );

  if (enrollmentError || !enrollmentResult?.[0]?.success) {
    // 롤백: 예약 상태 복구/삭제 및 크레딧 환불
    if (existing) {
      await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", reservationId);
    } else {
      await supabase.from("reservations").delete().eq("id", reservationId);
    }

    await refundCreditsForCancellation(
      user.id,
      creditCost,
      reservationId,
      classData.type,
    );

    return {
      error:
        enrollmentResult?.[0]?.message || "인원 증가 중 오류가 발생했습니다.",
    };
  }

  revalidatePath("/classes");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function cancelReservation(reservationId: string) {
  const supabase = await createClient();

  // 1. 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 2. 예약 확인 (본인 예약인지)
  const { data: reservation } = (await supabase
    .from("reservations")
    .select("*, classes(current_enrollment, type, date, time, is_completed)")
    .eq("id", reservationId)
    .eq("user_id", user.id)
    .single()) as { data: ReservationWithClass | null };

  if (!reservation) {
    return { error: "예약 정보를 찾을 수 없습니다." };
  }

  if (reservation.status === "cancelled") {
    return { error: "이미 취소된 예약입니다." };
  }

  // 2-1. 출석 완료된 예약은 취소 불가
  if (reservation.status === "attended") {
    return { error: "출석 완료된 예약은 취소할 수 없습니다." };
  }

  // 2-1-1. 관리자가 수업 완료 처리한 경우 취소 불가
  if (reservation.classes?.is_completed) {
    return { error: "완료 처리된 수업은 취소할 수 없습니다." };
  }

  // 2-2. 수업 시작일 기준 취소/환불 정책 적용
  let diffDays = -1;
  if (reservation.classes?.date) {
    const classTime = reservation.classes.time || "00:00:00";
    const classDateTime = new Date(`${reservation.classes.date}T${classTime}`);
    const now = new Date();

    if (classDateTime < now) {
      return { error: "이미 지난 수업은 취소할 수 없습니다." };
    }

    // 날짜 차이 계산 (시간 무시, 자정 기준)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const classDateOnly = new Date(
      classDateTime.getFullYear(),
      classDateTime.getMonth(),
      classDateTime.getDate(),
    );
    const diffTime = classDateOnly.getTime() - today.getTime();
    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= REFUND_POLICY.SAME_DAY.daysBefore) {
      return { error: REFUND_POLICY.SAME_DAY.message };
    }
  }

  // 2-3. 피드백(디브리핑)이 있으면 취소 불가
  if (reservation.debriefing) {
    return { error: "피드백이 작성된 예약은 취소할 수 없습니다." };
  }

  // 2-4. 이중 환불 방지
  if (reservation.credit_refunded) {
    return { error: "이미 환불 처리된 예약입니다." };
  }

  // 3-1. 예약 상태를 cancelled로 변경
  const { error: cancelError } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", reservationId);

  if (cancelError) {
    return { error: "취소 중 오류가 발생했습니다." };
  }

  // 3-2. 크레딧 환불 (RPC - 원자적 트랜잭션, credit_transactions 자동 기록)
  if (reservation.classes) {
    const classType = reservation.classes.type;

    // 원래 차감된 금액 기반 환불 (설정 변경에 영향받지 않음)
    let baseRefundAmount = reservation.credit_cost;
    if (!baseRefundAmount || baseRefundAmount <= 0) {
      // 레거시 예약 (credit_cost 미기록): 현재 설정값으로 폴백
      const { data: typeSetting } = await supabase
        .from("class_type_settings")
        .select("credit_cost")
        .eq("type", classType)
        .single();
      baseRefundAmount = typeSetting?.credit_cost ?? 1;
    }

    let finalRefundAmount = baseRefundAmount;
    let memoOverride = "";

    // D-Day 기준 환불 비율 적용
    if (
      diffDays >= REFUND_POLICY.ONE_TO_THREE_DAYS.daysBeforeStart &&
      diffDays <= REFUND_POLICY.ONE_TO_THREE_DAYS.daysBeforeEnd
    ) {
      finalRefundAmount =
        baseRefundAmount * REFUND_POLICY.ONE_TO_THREE_DAYS.refundRate;
      memoOverride = `${classType} 취소 환불 (${finalRefundAmount}C, 80% 차감 적용)`;
    } else if (diffDays >= REFUND_POLICY.FOUR_OR_MORE_DAYS.daysBefore) {
      finalRefundAmount =
        baseRefundAmount * REFUND_POLICY.FOUR_OR_MORE_DAYS.refundRate;
      memoOverride = `${classType} 취소 전액 환불 (${finalRefundAmount}C)`;
    } else {
      // 예외 폴백 (거의 발생 안 함)
      memoOverride = `${classType} 취소 환불 (${finalRefundAmount}C)`;
    }

    if (finalRefundAmount > 0) {
      const refundResult = await refundCreditsForCancellation(
        user.id,
        finalRefundAmount,
        reservationId,
        classType,
        memoOverride,
      );

      if (!refundResult.success) {
        console.error(
          "Credit refund failed for reservation:",
          reservationId,
          refundResult,
        );
        // 취소는 이미 처리됨, 환불 실패는 로그 기록
      }
    }
  }

  // 3-3. 수업 인원 감소 (RPC - 원자적 트랜잭션, Race Condition 방지)
  if (reservation.classes) {
    const { error: enrollmentError } = await supabase.rpc(
      "decrement_enrollment",
      { p_class_id: reservation.class_id },
    );

    if (enrollmentError) {
      console.error("Enrollment decrement failed:", enrollmentError);
      // 취소는 이미 처리됨, 인원 감소 실패는 로그 기록
    }
  }

  revalidatePath("/classes");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function requestClass(formData: {
  date: string;
  type: string;
  timeSlot: string;
  location: string;
  participants: number;
  user_instructions: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("class_requests").insert({
    user_id: user.id,
    date: formData.date,
    type: formData.type,
    time_slot: formData.timeSlot,
    location: formData.location,
    participants: formData.participants,
    user_instructions: formData.user_instructions,
    status: "pending",
  });

  if (error) {
    console.error("Request error:", error);
    return { error: `수업 요청 중 오류가 발생했습니다: ${error.message}` };
  }

  revalidatePath("/classes");
  return { success: true };
}

export async function getAvailabilityBlocks(startDate: Date, endDate: Date) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_blocks")
    .select("*")
    .gte("end_date", startDate.toISOString())
    .lte("start_date", endDate.toISOString());

  return data || [];
}

export async function addAvailabilityBlock(
  startDate: string,
  endDate: string,
  reason?: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.from("availability_blocks").insert({
    start_date: startDate,
    end_date: endDate,
    reason,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/classes/availability");
  revalidatePath("/classes");
  return { success: true };
}

export async function removeAvailabilityBlock(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("availability_blocks")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/classes/availability");
  revalidatePath("/classes");
  revalidatePath("/classes");
  return { success: true };
}

export async function getClassRequests(date: string) {
  const supabase = await createClient();

  // Fetch requests for the specific date
  // Assuming 'date' column is stored as string 'YYYY-MM-DD'
  const { data, error } = await supabase
    .from("class_requests")
    .select(
      `
            id,
            date,
            type,
            time_slot,
            location,
            status,
            user_id,
            created_at,
            profiles:user_id ( name, email, phone_number:phone )
        `,
    )
    .eq("date", date)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching requests:", error);
    return [];
  }

  return data;
}

export async function getAllClassRequests() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_requests")
    .select(
      `
            id,
            date,
            type,
            time_slot,
            location,
            status,
            user_id,
            participants,
            user_instructions,
            admin_comment,
            created_at,
            profiles:user_id ( name, email, phone_number:phone )
        `,
    )
    .eq("status", "pending")
    .order("date", { ascending: true }) // 날짜순 정렬
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching all requests:", error);
    return [];
  }

  return data;
}

export async function getPendingRequestDates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_requests")
    .select("date")
    .eq("status", "pending");

  if (error) {
    console.error("Error fetching pending request dates:", error);
    return [];
  }

  // Return distinct dates
  const dates = Array.from(new Set(data.map((d) => d.date)));
  return dates;
}

export async function updateClassRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
) {
  const supabase = await createClient();

  let result;
  if (status === "approved") {
    result = await approveClassRequest(supabase, requestId);
  } else {
    result = await rejectClassRequest(supabase, requestId, status);
  }

  if (result?.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/classes/availability");
  revalidatePath("/classes");
  revalidatePath("/dashboard");

  return { success: true };
}

async function approveClassRequest(supabase: any, requestId: string) {
  // 1. 요청 정보 가져오기
  const { data: request, error: fetchError } = await supabase
    .from("class_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    console.error("Error fetching request:", fetchError);
    return { error: "요청 정보를 찾을 수 없습니다." };
  }

  // 2. classes 테이블에 새 수업 생성
  // time_slot을 DB의 time 형식(HH:MM)으로 변환
  let classTime = request.time_slot;

  // 텍스트 형식을 시간으로 변환
  if (classTime.toLowerCase().includes("morning") || classTime === "오전") {
    classTime = "10:00";
  } else if (
    classTime.toLowerCase().includes("afternoon") ||
    classTime === "오후"
  ) {
    classTime = "14:00";
  } else if (
    classTime.toLowerCase().includes("evening") ||
    classTime === "저녁"
  ) {
    classTime = "18:00";
  }

  // 이미 HH:MM 형식인지 확인 (예: "14:00", "09:30")
  if (classTime.includes("-")) {
    classTime = classTime.split("-")[0].trim();
  }

  // HH:MM:SS 형식이면 HH:MM으로 변환
  const timeParts = classTime.split(":");
  if (timeParts.length === 3) {
    classTime = `${timeParts[0]}:${timeParts[1]}`;
  }

  // Service Role Key로 수업 생성 (RLS 우회)
  const supabaseAdmin = getSupabaseAdmin();

  const { data: createdClass, error: createError } = await supabaseAdmin
    .from("classes")
    .insert({
      date: request.date,
      time: classTime,
      type: request.type,
      location: request.location,
      max_capacity: 4,
      current_enrollment: request.participants || 1, // 요청한 인원수만큼 채우기
    })
    .select()
    .single();

  if (createError || !createdClass) {
    console.error("Error creating class:", createError);
    return {
      error: `수업 생성 중 오류가 발생했습니다: ${createError?.message || "알 수 없는 오류"}`,
    };
  }

  // 2-1. 타입별 크레딧 비용 조회
  const { data: typeSetting } = await supabaseAdmin
    .from("class_type_settings")
    .select("credit_cost")
    .eq("type", request.type)
    .single();

  const creditCost = typeSetting?.credit_cost ?? 1;

  // 2-2. 예약 자동 생성 (수업 승인 시 요청한 유저를 바로 예약자로 등록)
  const { data: autoReservation, error: reserveError } = await supabaseAdmin
    .from("reservations")
    .insert({
      user_id: request.user_id,
      class_id: createdClass.id,
      status: "confirmed",
      credit_cost: creditCost,
    })
    .select("id")
    .single();

  if (reserveError || !autoReservation) {
    console.error("[Approval] Error creating auto-reservation:", reserveError);
    return {
      error: `수업은 생성되었으나 자동 예약 중 오류가 발생했습니다: ${reserveError?.message}`,
    };
  }

  // 2-3. 크레딧 차감 (RPC - 원자적 트랜잭션)
  if (creditCost > 0) {
    const { data: deductResult, error: deductError } = await supabaseAdmin.rpc(
      "deduct_credits",
      {
        p_user_id: request.user_id,
        p_amount: creditCost,
        p_reason: `reservation_${request.type}`,
        p_related_entity_id: autoReservation.id,
        p_related_entity_type: "reservation",
        p_memo: `${request.type} 수업 예약 (요청 승인, ${creditCost}C 차감)`,
      },
    );

    if (deductError) {
      console.error("[Approval] Credit deduction failed:", deductError);
      // 크레딧 부족 시 예약은 유지하되 경고 로그
    } else if (deductResult && !deductResult.success) {
      console.error(
        "[Approval] Credit deduction returned failure:",
        deductResult,
      );
    } else {
    }
  }

  // 3. 요청 상태를 approved로 변경
  const { error: updateError } = await supabase
    .from("class_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  if (updateError) {
    console.error("Error updating request status:", updateError);
    return {
      error: `상태 업데이트 중 오류가 발생했습니다: ${updateError.message}`,
    };
  }
}

async function rejectClassRequest(
  supabase: any,
  requestId: string,
  status: string,
) {
  const { error } = await supabase
    .from("class_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) {
    console.error("Error updating request status:", error);
    return { error: `상태 업데이트 중 오류가 발생했습니다: ${error.message}` };
  }
}

export async function updateAvailabilityBlock(
  id: string,
  startDate: string,
  endDate: string,
  reason?: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_blocks")
    .update({
      start_date: startDate,
      end_date: endDate,
      reason,
    })
    .eq("id", id)
    .select();

  if (error) return { error: error.message };
  revalidatePath("/admin/classes/availability");
  revalidatePath("/classes");
  return { success: true };
}

// 사용자 본인의 클래스 요청 목록 조회
export async function getMyClassRequests() {
  const supabase = await createClient();

  // 현재 로그인한 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  // 본인의 요청만 조회
  const { data, error } = await supabase
    .from("class_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my class requests:", error);
    return [];
  }

  return data || [];
}

/**
 * 사용자가 자신의 클래스 요청을 삭제하는 함수
 * - 본인의 요청만 삭제 가능
 * - pending 상태는 삭제 불가 (관리자가 검토 중이므로)
 */
export async function deleteMyClassRequest(requestId: string) {
  const supabase = await createClient();

  // 현재 로그인한 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 요청 정보 확인 (본인 소유인지, 상태가 삭제 가능한지)
  const { data: request, error: fetchError } = await supabase
    .from("class_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", user.id) // 본인의 요청만
    .single();

  if (fetchError || !request) {
    return { error: "요청을 찾을 수 없습니다." };
  }

  // pending 상태는 삭제 불가
  if (request.status === "pending") {
    return {
      error: "대기중인 요청은 삭제할 수 없습니다. 관리자에게 문의하세요.",
    };
  }

  // 삭제 실행
  // Service Role Key로 삭제 (RLS 우회)
  const supabaseAdmin = getSupabaseAdmin();

  // 삭제 실행
  const { error: deleteError } = await supabaseAdmin
    .from("class_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    console.error(
      "Error deleting class request with admin client:",
      deleteError,
    );
    return { error: "삭제 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");

  return { success: true };
}

export async function cancelMyClassRequest(requestId: string) {
  const supabase = await createClient();

  // 현재 로그인한 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 요청 정보 확인 (본인 소유인지, 상태가 pending인지)
  const { data: request, error: fetchError } = await supabase
    .from("class_requests")
    .select("*")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !request) {
    return { error: "요청을 찾을 수 없습니다." };
  }

  if (request.status !== "pending") {
    return { error: "대기중인 요청만 취소할 수 있습니다." };
  }

  // 상태를 cancelled로 변경 (사유: 사용자가 직접 취소함)
  const { error: updateError } = await supabase
    .from("class_requests")
    .update({
      status: "cancelled",
      admin_comment: "사용자가 직접 취소함",
    })
    .eq("id", requestId);

  if (updateError) {
    console.error("Error cancelling class request:", updateError);
    return { error: "취소 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/classes"); // 캘린더 페이지에서도 목록이 사라지도록 갱신
  revalidatePath("/admin/classes/availability"); // 관리자 페이지에서도 사라지도록 갱신

  return { success: true };
}

export async function updateClassRequest(
  requestId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  // 1. 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 2. 데이터 추출
  const date = formData.get("date") as string;
  const time_slot = formData.get("time") as string;
  const type = formData.get("type") as string;
  const location = formData.get("location") as string;
  const admin_comment = formData.get("admin_comment") as string;
  const participants = Number(formData.get("participants")) || 1;

  if (!date || !time_slot || !type || !location) {
    return { error: "모든 필드를 입력해주세요." };
  }

  // 3. 업데이트 실행
  const { error } = await supabase
    .from("class_requests")
    .update({
      date,
      time_slot,
      type,
      location,
      admin_comment,
      participants,
    })
    .eq("id", requestId);

  if (error) {
    console.error("Error updating class request:", error);
    return { error: "요청 수정 중 오류가 발생했습니다." };
  }

  revalidatePath("/admin/classes/availability");
  revalidatePath("/dashboard");

  return { success: true };
}

/**
 * 사용자가 완료된 예약을 아카이브 처리
 * - is_archived를 true로 변경 (대시보드에서 숨김)
 */
export async function archiveReservation(reservationId: string) {
  const supabase = await createClient();

  // 1. 유저 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  // 2. 예약 확인 (본인 예약인지)
  const { data: reservation } = await supabase
    .from("reservations")
    .select("id, status, is_archived")
    .eq("id", reservationId)
    .eq("user_id", user.id)
    .single();

  if (!reservation) {
    return { error: "예약 정보를 찾을 수 없습니다." };
  }

  if (reservation.is_archived) {
    return { error: "이미 아카이브된 예약입니다." };
  }

  // 3. is_archived를 true로 변경
  const { error: updateError } = await supabase
    .from("reservations")
    .update({ is_archived: true })
    .eq("id", reservationId);

  if (updateError) {
    return { error: "아카이브 처리 중 오류가 발생했습니다." };
  }

  revalidatePath("/dashboard");

  return { success: true };
}
