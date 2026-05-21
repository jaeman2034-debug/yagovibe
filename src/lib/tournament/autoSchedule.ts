/**
 * 🔥 경기장·시간 자동 배정 고급 알고리즘
 * 
 * 핵심 기능:
 * 1. 슬롯 그리드 생성 (날짜 × 경기장 × 시간)
 * 2. 경기 우선순위 큐 (조별리그 → 토너먼트)
 * 3. 점수 기반 배치 (제약 조건 최소화)
 * 4. 실패 처리 및 제안
 */

import type {
  AutoScheduleRequest,
  AutoScheduleResult,
  ScheduleRule,
  FacilitySlotConfig,
  TimeSlot,
  SlotScore,
  MatchOps,
} from "@/types/tournament";

const INF = 999999; // 무한대 (불가능한 배정)

/**
 * 날짜 범위 내 모든 날짜 생성
 */
function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  
  return dates;
}

/**
 * 슬롯 그리드 생성 (날짜 × 경기장 × 시간)
 */
function generateSlotGrid(
  dateRange: { start: string; end: string },
  facilities: FacilitySlotConfig[]
): Array<{
  date: string;
  facilityId: string;
  facilityName: string;
  timeSlot: TimeSlot;
}> {
  const dates = generateDateRange(dateRange.start, dateRange.end);
  const slots: Array<{
    date: string;
    facilityId: string;
    facilityName: string;
    timeSlot: TimeSlot;
  }> = [];
  
  for (const date of dates) {
    for (const facility of facilities) {
      for (const timeSlot of facility.slots) {
        slots.push({
          date,
          facilityId: facility.facilityId,
          facilityName: facility.facilityName,
          timeSlot,
        });
      }
    }
  }
  
  return slots;
}

/**
 * 시간 문자열을 분 단위로 변환
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * 분 단위를 시간 문자열로 변환
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * 두 시간 간격 계산 (분)
 */
function timeDifference(start: string, end: string): number {
  return timeToMinutes(end) - timeToMinutes(start);
}

/**
 * 슬롯 점수 계산
 */
function calculateSlotScore(
  slot: {
    date: string;
    facilityId: string;
    timeSlot: TimeSlot;
  },
  match: MatchOps,
  scheduledMatches: MatchOps[],
  rules: ScheduleRule
): SlotScore {
  const violations: string[] = [];
  let score = 0;
  
  // 같은 팀의 다른 경기 찾기
  const teamMatches = scheduledMatches.filter(
    (m) =>
      (m.homeTeamId === match.homeTeamId || m.homeTeamId === match.awayTeamId ||
        m.awayTeamId === match.homeTeamId || m.awayTeamId === match.awayTeamId) &&
      m.id !== match.id
  );
  
  // C1: 최소 휴식 시간 검증 (하드 제약)
  for (const teamMatch of teamMatches) {
    if (teamMatch.date === slot.date) {
      // 같은 날 경기
      const restMinutes = timeDifference(
        teamMatch.endTime || teamMatch.startTime,
        slot.timeSlot.start
      );
      
      if (restMinutes < rules.minRestMinutes) {
        violations.push(
          `최소 휴식 시간 부족 (${restMinutes}분 < ${rules.minRestMinutes}분)`
        );
        score = INF; // 하드 제약 위반
        break;
      } else {
        // 휴식 시간 페널티 (충분하지만 최적은 아닐 때)
        const penalty = Math.max(0, rules.minRestMinutes - restMinutes);
        score += penalty * 0.5;
      }
    }
  }
  
  // C2: 연속 경기 금지 (하드 제약)
  if (rules.noBackToBack) {
    for (const teamMatch of teamMatches) {
      if (teamMatch.date === slot.date) {
        const gap = timeDifference(teamMatch.endTime || teamMatch.startTime, slot.timeSlot.start);
        if (gap < rules.matchDuration + rules.bufferMinutes) {
          violations.push("연속 경기 금지 위반");
          score = INF;
          break;
        }
      }
    }
  }
  
  // C3: 같은 날 동일 팀 경기 수 제한 (하드 제약)
  const sameDayMatches = teamMatches.filter((m) => m.date === slot.date);
  if (sameDayMatches.length >= rules.sameDayLimitPerTeam) {
    violations.push(
      `같은 날 경기 수 제한 초과 (${sameDayMatches.length + 1} > ${rules.sameDayLimitPerTeam})`
    );
    score = INF;
  }
  
  // C4: 조별리그 우선 배치 (소프트 제약)
  // (이미 우선순위 큐에서 처리)
  
  // C5: 동일 경기장 선호 (소프트 제약)
  if (rules.preferSameFacility) {
    const sameFacilityMatches = teamMatches.filter(
      (m) => m.venueId === slot.facilityId
    );
    if (sameFacilityMatches.length > 0) {
      score -= 0.2; // 보너스 (점수 감소)
    } else {
      score += 0.2; // 페널티 (점수 증가)
    }
  }
  
  // 이동 부담 페널티 (다른 경기장으로 이동해야 할 때)
  const differentFacilityMatches = teamMatches.filter(
    (m) => m.venueId !== slot.facilityId && m.date === slot.date
  );
  if (differentFacilityMatches.length > 0) {
    score += 0.2 * differentFacilityMatches.length;
  }
  
  return {
    slot,
    score,
    violations,
    penalties: {
      restPenalty: score * 0.5,
      travelPenalty: score * 0.2,
      sameFacilityBonus: score * -0.2,
    },
  };
}

/**
 * 경기 우선순위 큐 생성
 * 
 * 우선순위:
 * 1. 조별리그 → 토너먼트
 * 2. 같은 팀 경기 간 시간 간격 큰 순
 */
function createMatchPriorityQueue(
  matches: MatchOps[],
  scheduledMatches: MatchOps[]
): MatchOps[] {
  // 1. 조별리그 우선 (phase 또는 groupId로 판단)
  const groupMatches = matches.filter((m) => m.phase === "GROUP" || m.groupId);
  const knockoutMatches = matches.filter((m) => m.phase === "KNOCKOUT" || !m.groupId);
  
  // 2. 같은 팀 경기 간 시간 간격 계산
  const getTimeGap = (match: MatchOps): number => {
    const teamMatches = scheduledMatches.filter(
      (m) =>
        (m.homeTeamId === match.homeTeamId || m.homeTeamId === match.awayTeamId ||
          m.awayTeamId === match.homeTeamId || m.awayTeamId === match.awayTeamId) &&
        m.id !== match.id
    );
    
    if (teamMatches.length === 0) return 999; // 다른 경기 없음 = 최우선
    
    // 가장 가까운 경기와의 간격
    const gaps = teamMatches.map((m) => {
      if (m.date && match.date) {
        const dateDiff = Math.abs(
          new Date(m.date).getTime() - new Date(match.date).getTime()
        );
        return dateDiff / (1000 * 60 * 60 * 24); // 일 단위
      }
      return 0;
    });
    
    return Math.min(...gaps);
  };
  
  // 조별리그 먼저, 그 다음 토너먼트
  const sortedGroup = [...groupMatches].sort((a, b) => getTimeGap(b) - getTimeGap(a));
  const sortedKnockout = [...knockoutMatches].sort((a, b) => getTimeGap(b) - getTimeGap(a));
  
  return [...sortedGroup, ...sortedKnockout];
}

/**
 * 자동 배정 실행
 */
export async function autoScheduleMatches(
  request: AutoScheduleRequest,
  unscheduledMatches: MatchOps[]
): Promise<AutoScheduleResult> {
  const { dateRange, facilities, rules } = request;
  
  // 슬롯 그리드 생성
  const slotGrid = generateSlotGrid(dateRange, facilities);
  
  // 경기 우선순위 큐 생성
  const priorityQueue = createMatchPriorityQueue(unscheduledMatches, []);
  
  const assignedMatches: MatchOps[] = [];
  const failedMatches: Array<{ matchId: string; reason: string }> = [];
  const warnings: Array<{ matchId: string; message: string }> = [];
  
  // 각 경기를 순서대로 배정
  for (const match of priorityQueue) {
    let bestSlot: SlotScore | null = null;
    let bestScore = INF;
    
    // 모든 슬롯에 대해 점수 계산
    for (const slot of slotGrid) {
      const score = calculateSlotScore(slot, match, assignedMatches, rules);
      
      if (score.score < bestScore) {
        bestScore = score.score;
        bestSlot = score;
      }
    }
    
    // 배정 가능 여부 확인
    if (bestSlot && bestScore < INF) {
      // 경기 배정
      const assignedMatch: MatchOps = {
        ...match,
        date: bestSlot.slot.date,
        startTime: bestSlot.slot.timeSlot.start,
        endTime: bestSlot.slot.timeSlot.end,
        venueId: bestSlot.slot.facilityId,
        status: "scheduled",
      };
      
      assignedMatches.push(assignedMatch);
      
      // 경고 사항 확인
      if (bestSlot.violations.length > 0) {
        warnings.push({
          matchId: match.id,
          message: bestSlot.violations.join(", "),
        });
      }
    } else {
      // 배정 실패
      failedMatches.push({
        matchId: match.id,
        reason: "슬롯 부족 또는 제약 조건 충돌",
      });
    }
  }
  
  // 제안 사항 생성
  const suggestions: string[] = [];
  if (failedMatches.length > 0) {
    const neededSlots = failedMatches.length;
    suggestions.push(`슬롯 ${neededSlots}개 부족`);
    suggestions.push(`경기장 1곳 추가 또는 슬롯 ${Math.ceil(neededSlots / facilities.length)}개 추가 권장`);
    
    if (rules.minRestMinutes >= 90) {
      suggestions.push(`휴식 시간을 ${rules.minRestMinutes - 15}분으로 완화 고려`);
    }
  }
  
  return {
    success: failedMatches.length === 0,
    assignedCount: assignedMatches.length,
    failedCount: failedMatches.length,
    conflicts: failedMatches.length > 0 ? failedMatches : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    appliedRules: rules,
    executedAt: new Date(),
    executedBy: "", // 실제 호출 시 전달
  };
}

