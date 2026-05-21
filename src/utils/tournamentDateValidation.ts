/**
 * 🔥 대회 날짜 검증 UX 유틸리티
 * 
 * 신청기간 < 검수기간 < 추첨일 논리 검증
 */

import { kstDateString, compareDateStr } from "./dateKST";

export interface TournamentDateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 대회 기간 검증
 */
export function validateTournamentDates(
  dateStart: Date | null,
  dateEnd: Date | null
): TournamentDateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!dateStart) {
    errors.push("대회 시작일을 선택해주세요.");
  }
  if (!dateEnd) {
    errors.push("대회 종료일을 선택해주세요.");
  }

  if (dateStart && dateEnd) {
    if (dateEnd < dateStart) {
      errors.push("종료일은 시작일 이후여야 합니다.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 신청·선수 수정·검수·추첨일 전체 검증
 * 
 * 논리 순서: 신청 시작 < 신청 종료 ≤ 선수 수정 시작 < 선수 수정 종료 < 검수 시작 < 검수 종료 < 추첨일 < 대회 시작
 * 
 * @param testMode 테스트 모드일 때 날짜 검증 완화 (조 추첨 테스트용)
 */
export function validateAllPeriods(
  tournamentStart: Date | null,
  tournamentEnd: Date | null,
  registrationStart: string,
  registrationEnd: string,
  rosterEditStart: string,
  rosterEditEnd: string,
  reviewStart: string,
  reviewEnd: string,
  drawDate: string,
  testMode: boolean = false
): TournamentDateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 대회 기간 검증
  const tournamentValidation = validateTournamentDates(tournamentStart, tournamentEnd);
  errors.push(...tournamentValidation.errors);
  warnings.push(...tournamentValidation.warnings);

  // 🔥 KST 기준 날짜 문자열로 비교 (시간 정보 제거, 오늘 포함 정책)
  const today = kstDateString();

  // 신청 기간 검증
  if (registrationStart && registrationEnd) {
    const regStart = kstDateString(registrationStart);
    const regEnd = kstDateString(registrationEnd);
    
    if (compareDateStr(regEnd, regStart) < 0) {
      errors.push("신청 종료일은 신청 시작일 이후여야 합니다.");
    }

    // 🔥 신청 시작일 ≥ 오늘 검증 (오늘 포함, 테스트 모드에서는 완화)
    if (!testMode) {
      if (compareDateStr(regStart, today) < 0) {
        errors.push("신청 시작일은 오늘 또는 이후여야 합니다. (KST 기준)");
      }
    }

    if (registrationEnd && tournamentStart) {
      const regEndDate = new Date(registrationEnd);
      regEndDate.setHours(23, 59, 59, 999);
      
      if (regEndDate >= tournamentStart) {
        errors.push("신청 종료일은 대회 시작일보다 이전이어야 합니다.");
      }
    }
  } else if (registrationStart || registrationEnd) {
    errors.push("신청 시작일과 종료일을 모두 입력해주세요.");
  }

  // 선수 명단 수정 기간 검증 (3️⃣)
  if (rosterEditStart && rosterEditEnd) {
    const rosterStart = new Date(rosterEditStart);
    const rosterEnd = new Date(rosterEditEnd);
    
    if (rosterEnd < rosterStart) {
      errors.push("선수 명단 수정 종료일은 수정 시작일 이후여야 합니다.");
    }

    // 선수 수정 기간은 신청 종료일 이후여야 함
    if (registrationEnd && rosterEditStart) {
      const regEndDate = new Date(registrationEnd);
      regEndDate.setHours(23, 59, 59, 999);
      const rosterStartDate = new Date(rosterEditStart);
      
      if (rosterStartDate < regEndDate) {
        errors.push("선수 명단 수정 시작일은 신청 종료일 이후여야 합니다.");
      }
    }

    // 선수 수정 종료일 < 검수 시작일
    if (rosterEditEnd && reviewStart) {
      const rosterEndDate = new Date(rosterEditEnd);
      rosterEndDate.setHours(23, 59, 59, 999);
      const revStartDate = new Date(reviewStart);
      
      if (revStartDate <= rosterEndDate) {
        errors.push("검수 시작일은 선수 명단 수정 종료일 이후여야 합니다.");
      }
    }
  } else if (rosterEditStart || rosterEditEnd) {
    errors.push("선수 명단 수정 시작일과 종료일을 모두 입력해주세요.");
  }

  // 검수 기간 검증
  if (reviewStart && reviewEnd) {
    const revStart = new Date(reviewStart);
    const revEnd = new Date(reviewEnd);
    
    if (revEnd < revStart) {
      errors.push("검수 종료일은 검수 시작일 이후여야 합니다.");
    }

    // 검수 기간은 선수 수정 기간 이후여야 함
    if (rosterEditEnd && reviewStart) {
      const rosterEndDate = new Date(rosterEditEnd);
      rosterEndDate.setHours(23, 59, 59, 999);
      const revStartDate = new Date(reviewStart);
      
      if (revStartDate <= rosterEndDate) {
        errors.push("검수 시작일은 선수 명단 수정 종료일 이후여야 합니다.");
      }
    }

    if (reviewEnd && drawDate) {
      const revEndDate = new Date(reviewEnd);
      revEndDate.setHours(23, 59, 59, 999);
      const drawDateObj = new Date(drawDate);
      
      if (drawDateObj <= revEndDate) {
        if (testMode) {
          // 테스트 모드: 경고만 표시 (같은 날 허용)
          warnings.push("⚠️ 테스트 모드: 추첨일이 검수 종료일과 같거나 이전입니다. (테스트용으로 허용됨)");
        } else {
          errors.push("추첨일은 검수 종료일 이후여야 합니다.");
        }
      }
    }
  } else if (reviewStart || reviewEnd) {
    warnings.push("검수 시작일과 종료일을 모두 입력하는 것을 권장합니다.");
  }

  // 추첨일 검증 (테스트 모드에서는 완화)
  if (drawDate) {
    const drawDateObj = new Date(drawDate);
    
    if (!testMode) {
      if (drawDateObj < today) {
        warnings.push("추첨일이 과거 날짜입니다.");
      }

      if (reviewEnd && drawDate) {
        const revEndDate = new Date(reviewEnd);
        revEndDate.setHours(23, 59, 59, 999);
        
        if (drawDateObj <= revEndDate) {
          warnings.push("추첨일은 검수 종료일 이후여야 합니다.");
        }
      }

      if (tournamentStart && drawDate) {
        const drawDateObj = new Date(drawDate);
        
        if (drawDateObj >= tournamentStart) {
          errors.push("추첨일은 대회 시작일보다 이전이어야 합니다.");
        }
      }
    } else {
      // 테스트 모드: 조 추첨일이 오늘로 설정 가능하도록 완화
      // 경고만 표시하고 에러는 발생시키지 않음
      if (drawDateObj < today) {
        warnings.push("⚠️ 테스트 모드: 추첨일이 과거 날짜입니다. (테스트용으로 허용됨)");
      }
    }
  }

  // 전체 논리 순서 검증: 신청 종료 ≤ 선수 수정 시작 < 선수 수정 종료 < 검수 시작 < 검수 종료 < 추첨일 < 대회 시작
  // 테스트 모드에서는 완화 (조 추첨 테스트용)
  if (registrationEnd && rosterEditStart && rosterEditEnd && reviewStart && reviewEnd && drawDate && tournamentStart) {
    const regEnd = new Date(registrationEnd);
    regEnd.setHours(23, 59, 59, 999);
    const rosterStart = new Date(rosterEditStart);
    const rosterEnd = new Date(rosterEditEnd);
    rosterEnd.setHours(23, 59, 59, 999);
    const revStart = new Date(reviewStart);
    const revEnd = new Date(reviewEnd);
    revEnd.setHours(23, 59, 59, 999);
    const draw = new Date(drawDate);
    const tourStart = new Date(tournamentStart);

    const isValidOrder = regEnd <= rosterStart && rosterStart < rosterEnd && rosterEnd < revStart && revStart < revEnd && revEnd < draw && draw < tourStart;
    
    if (!isValidOrder) {
      if (testMode) {
        // 테스트 모드: 경고만 표시
        warnings.push("⚠️ 테스트 모드: 날짜 순서가 완전히 맞지 않습니다. (테스트용으로 허용됨)");
      } else {
        errors.push("날짜 순서를 확인하세요: 신청 종료 → 선수 수정 시작 → 선수 수정 종료 → 검수 시작 → 검수 종료 → 추첨일 → 대회 시작");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 날짜 입력 순서 제안 (5단계)
 * 
 * 대회 기간 → 신청 기간 → 선수 수정 기간 → 검수 기간 → 추첨일 순서로 유도
 */
export function suggestNextDateField(
  tournamentStart: Date | null,
  tournamentEnd: Date | null,
  registrationStart: string,
  registrationEnd: string,
  rosterEditStart: string,
  rosterEditEnd: string,
  reviewStart: string,
  reviewEnd: string,
  drawDate: string
): "tournament" | "registration" | "rosterEdit" | "review" | "draw" | null {
  if (!tournamentStart || !tournamentEnd) {
    return "tournament";
  }
  
  if (!registrationStart || !registrationEnd) {
    return "registration";
  }
  
  if (!rosterEditStart || !rosterEditEnd) {
    return "rosterEdit";
  }
  
  if (!reviewStart || !reviewEnd) {
    return "review";
  }
  
  if (!drawDate) {
    return "draw";
  }
  
  return null; // 모두 입력됨
}

