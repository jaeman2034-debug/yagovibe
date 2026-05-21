// src/utils/yearTransition.ts
// 🔥 연도 전환 자동화: 2025 → 2026 무통 전환

import { collection, getDocs, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import { type TeamMember, resolveFeePlan } from "./teamRules";

export interface YearTransitionResult {
  teamId: string;
  processedMembers: number;
  resetAnnualPaid: number;
  resetUnpaidMonths: number;
  errors: string[];
}

// 🔥 1. 연도 전환 실행 (팀 단위)
export async function executeYearTransition(
  teamId: string,
  newYear: number,
  resetUnpaidMonths: boolean = false // 정관 기준: 미납 개월 리셋 여부
): Promise<YearTransitionResult> {
  const result: YearTransitionResult = {
    teamId,
    processedMembers: 0,
    resetAnnualPaid: 0,
    resetUnpaidMonths: 0,
    errors: [],
  };

  try {
    // 전체 회원 조회
    const membersRef = collection(db, "teams", teamId, "members");
    const membersSnapshot = await getDocs(membersRef);

    // 배치 업데이트 (성능 최적화)
    const batch = writeBatch(db);
    let batchCount = 0;
    const BATCH_LIMIT = 500; // Firestore 배치 제한

    membersSnapshot.forEach((memberDoc) => {
      if (batchCount >= BATCH_LIMIT) {
        // 배치 제한 도달 시 실행하고 새 배치 시작
        batch.commit();
        batchCount = 0;
      }

      const memberData = memberDoc.data() as TeamMember;
      const memberRef = doc(db, "teams", teamId, "members", memberDoc.id);

      const updates: any = {
        yearTransitionedAt: serverTimestamp(),
        yearTransitionedTo: newYear,
      };

      // 1. 연회비 연도 리셋 (매년 새로 납부해야 함)
      if (memberData.annualPaidYear && memberData.annualPaidYear < newYear) {
        updates.annualPaidYear = null;
        result.resetAnnualPaid++;
      }

      // 2. 미납 개월 리셋 (정관 기준)
      if (resetUnpaidMonths && memberData.unpaidMonths && memberData.unpaidMonths > 0) {
        updates.unpaidMonths = 0;
        result.resetUnpaidMonths++;
      }

      // 3. 수동 override가 없으면 회비 플랜 재계산
      if (!memberData.manualFeeOverride) {
        const resolved = resolveFeePlan(memberData);
        updates.feePlan = resolved.feePlan;
        updates.exemptReason = resolved.exemptReason;
      }

      batch.update(memberRef, updates);
      batchCount++;
      result.processedMembers++;
    });

    // 마지막 배치 실행
    if (batchCount > 0) {
      await batch.commit();
    }

    // 🔥 감사 로그 기록
    await updateTeamDocument(teamId, {
      lastYearTransition: {
        year: newYear,
        executedAt: serverTimestamp(),
        processedMembers: result.processedMembers,
        resetAnnualPaid: result.resetAnnualPaid,
        resetUnpaidMonths: result.resetUnpaidMonths,
      },
    });

    console.log(`[Year Transition] ${teamId}: ${result.processedMembers}명 처리 완료`);
  } catch (error: any) {
    result.errors.push(error.message || "연도 전환 실패");
    console.error(`[Year Transition] ${teamId} 실패:`, error);
  }

  return result;
}

// 🔥 2. 연도 전환 필요 여부 체크
export async function checkYearTransitionNeeded(teamId: string): Promise<{
  needed: boolean;
  currentYear: number;
  lastTransitionYear?: number;
}> {
  try {
    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await teamRef.get();
    const teamData = teamSnap.data();

    const currentYear = new Date().getFullYear();
    const lastTransitionYear = teamData?.lastYearTransition?.year;

    return {
      needed: !lastTransitionYear || lastTransitionYear < currentYear,
      currentYear,
      lastTransitionYear,
    };
  } catch (error) {
    console.error(`[Year Transition] 체크 실패:`, error);
    return {
      needed: false,
      currentYear: new Date().getFullYear(),
    };
  }
}

// 🔥 3. 모든 팀에 대한 연도 전환 실행 (관리자용)
export async function executeYearTransitionForAllTeams(
  newYear: number,
  resetUnpaidMonths: boolean = false
): Promise<YearTransitionResult[]> {
  const results: YearTransitionResult[] = [];

  try {
    const teamsRef = collection(db, "teams");
    const teamsSnapshot = await getDocs(teamsRef);

    for (const teamDoc of teamsSnapshot.docs) {
      const result = await executeYearTransition(teamDoc.id, newYear, resetUnpaidMonths);
      results.push(result);
    }

    console.log(`[Year Transition] 전체 ${results.length}개 팀 처리 완료`);
  } catch (error) {
    console.error(`[Year Transition] 전체 실행 실패:`, error);
  }

  return results;
}


