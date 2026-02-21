import { Pool, TimeRange } from '@/types'
import { getDay } from 'date-fns'

/**
 * 특정 날짜가 수영장의 휴무일인지 확인합니다.
 * 정기 휴무(예: 매월 둘째, 넷째 일요일) 등을 체크하는 로직이 포함되어 있습니다.
 * 
 * @param pool 수영장 객체
 * @param date 확인할 날짜
 * @returns 휴무일 여부 (true: 휴무, false: 영업)
 */
export function isPoolHoliday(pool: Pool, date: Date): boolean {
    // 휴무 규칙이 없으면 영업일로 간주합니다.
    if (!pool.holidayRules || pool.holidayRules.length === 0) return false

    const dayOfWeek = getDay(date) // 0(일) ~ 6(토)
    const occurrence = getWeekdayOccurrence(date) // 해당 요일이 이번 달의 몇 번째인지 (예: 2번째 일요일)

    // 설정된 모든 휴무 규칙을 돌며 오늘이 해당하는지 확인합니다.
    return pool.holidayRules.some(rule => {
        if (rule.type === 'monthly') {
            // 이번 달의 'N번째' 'X요일' 인지 비교합니다.
            return rule.day === dayOfWeek && rule.week === occurrence
        }
        return false
    })
}

/**
 * 해당 날짜의 요일이 이번 달에서 몇 번째로 나타나는지 계산합니다. (O(1) 성능 최적화)
 * 예: 2024년 2월 11일(일)은 이번 달의 '2번째' 일요일이므로 2를 반환합니다.
 * 
 * @param date 계산할 날짜
 * @returns 요일의 출현 횟수 (1~5)
 */
function getWeekdayOccurrence(date: Date): number {
    // 날짜를 7로 나누어 몇 번째 주에 해당하는지 계산하는 원리를 이용합니다.
    return Math.floor((date.getDate() - 1) / 7) + 1
}

/**
 * 특정 수영장의 예약 가능한 타임슬롯(시작 시간) 목록을 가져옵니다.
 * 휴무일이거나 예약 가능한 시간이 없으면 빈 배열을 반환합니다.
 * 
 * @param pool 수영장 객체
 * @param date 예약하려는 날짜
 * @returns ["10:00", "13:00"] 형태의 시간 문자열 배열
 */
export function getPoolTimeSlots(pool: Pool, date: Date): string[] {
    // 1. 먼저 오늘이 수영장 문을 닫는 날인지 확인합니다.
    if (isPoolHoliday(pool, date)) {
        return []
    }

    const dayOfWeek = getDay(date)
    let ranges: TimeRange[] = []

    // 2. 요일에 맞는 예약 시간대(ranges)를 가져옵니다.
    // 0: 일요일, 6: 토요일, 1-5: 평일
    const { schedule } = pool
    
    if (dayOfWeek === 0) {
        ranges = schedule.sunday || []
    } else if (dayOfWeek === 6) {
        ranges = schedule.saturday || []
    } else {
        // 평일(월~금) 예약 시간대를 가져옵니다.
        ranges = schedule.weekday || []
    }

    // 3. 해당 요일에 정의된 시간대가 없으면 예약 불가
    if (!ranges || ranges.length === 0) {
        return []
    }

    // 4. 예약 가능한 시간의 '시작 시간'만 추출하여 오름차순으로 정렬해 반환합니다.
    // 현재 UI 구조상 시작 시간만 알면 세션 선택이 가능합니다.
    return ranges.map(r => r.start).sort()
}

/**
 * 수영장의 위치(이름) 명칭을 포맷팅합니다.
 * 
 * @param pool 수영장 객체
 * @returns 포맷팅된 이름 (예: "수지 잠수풀")
 */
export function formatPoolLocation(pool: Pool): string {
    return pool.name
}
