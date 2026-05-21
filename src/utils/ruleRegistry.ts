// src/utils/ruleRegistry.ts
// 🔒 규칙을 코드에서 완전히 분리: Rule Registry (미래 보험)

import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";

// 🔒 규칙 세트 인터페이스
export interface RuleSet {
  id?: string;
  version: string; // "2025.1"
  effectiveFrom: string; // "2025-01-01"
  effectiveTo?: string; // 종료일 (없으면 현재 유효)
  
  fee: {
    monthly: number;
    annual: number;
    graceMonths: number; // 유예 기간
  };
  
  attendance: {
    absentPenaltyPoints: number; // 결석당 벌점
    pauseAtAbsences: number; // N회 결석 시 휴원
  };
  
  discipline: {
    pauseAtPenaltyPoints: number; // N점 이상 시 휴원
    expelAtPenaltyPoints: number; // N점 이상 시 제명
  };
  
  createdAt?: Date;
  createdBy?: string;
  description?: string; // 변경 사유
}

// 🔒 1. 규칙 세트 생성
export async function createRuleSet(
  teamId: string,
  ruleSet: Omit<RuleSet, "id" | "createdAt">
): Promise<string> {
  const ruleSetRef = await addDoc(collection(db, "teams", teamId, "ruleSets"), {
    ...ruleSet,
    createdAt: serverTimestamp(),
  });

  // 🔒 현재 활성 규칙으로 설정
  await updateActiveRuleSet(teamId, ruleSetRef.id);

  console.log(`[Rule Registry] 규칙 세트 생성: ${ruleSetRef.id} (${ruleSet.version})`);
  return ruleSetRef.id;
}

// 🔒 2. 활성 규칙 세트 업데이트
async function updateActiveRuleSet(teamId: string, ruleSetId: string): Promise<void> {
  await updateTeamDocument(teamId, {
    activeRuleSetId: ruleSetId,
    activeRuleSetUpdatedAt: serverTimestamp(),
  });
}

// 🔒 3. 현재 활성 규칙 세트 조회
export async function getActiveRuleSet(teamId: string): Promise<RuleSet | null> {
  try {
    const teamRef = doc(db, "teams", teamId);
    const teamSnap = await getDoc(teamRef);
    
    if (!teamSnap.exists()) {
      return null;
    }

    const activeRuleSetId = teamSnap.data()?.activeRuleSetId;
    if (!activeRuleSetId) {
      // 기본 규칙 반환
      return getDefaultRuleSet();
    }

    const ruleSetRef = doc(db, "teams", teamId, "ruleSets", activeRuleSetId);
    const ruleSetSnap = await getDoc(ruleSetRef);

    if (!ruleSetSnap.exists()) {
      return getDefaultRuleSet();
    }

    return {
      id: ruleSetSnap.id,
      ...ruleSetSnap.data(),
    } as RuleSet;
  } catch (error) {
    console.error("[Rule Registry] 활성 규칙 조회 실패:", error);
    return getDefaultRuleSet();
  }
}

// 🔒 4. 특정 날짜에 유효했던 규칙 세트 조회 (과거 데이터 복원용)
export async function getRuleSetForDate(
  teamId: string,
  date: Date
): Promise<RuleSet | null> {
  try {
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

    const ruleSetsQuery = query(
      collection(db, "teams", teamId, "ruleSets"),
      where("effectiveFrom", "<=", dateStr)
    );
    
    const ruleSetsSnapshot = await getDocs(ruleSetsQuery);
    
    let matchingRuleSet: RuleSet | null = null;
    let latestEffectiveFrom = "";

    ruleSetsSnapshot.forEach((doc) => {
      const ruleSet = { id: doc.id, ...doc.data() } as RuleSet;
      
      // 종료일 체크
      if (ruleSet.effectiveTo && ruleSet.effectiveTo < dateStr) {
        return; // 이미 종료된 규칙
      }

      // 가장 최근의 effectiveFrom 찾기
      if (ruleSet.effectiveFrom > latestEffectiveFrom) {
        latestEffectiveFrom = ruleSet.effectiveFrom;
        matchingRuleSet = ruleSet;
      }
    });

    return matchingRuleSet || getDefaultRuleSet();
  } catch (error) {
    console.error("[Rule Registry] 날짜별 규칙 조회 실패:", error);
    return getDefaultRuleSet();
  }
}

// 🔒 5. 기본 규칙 세트 (폴백)
function getDefaultRuleSet(): RuleSet {
  return {
    version: "2025.1",
    effectiveFrom: "2025-01-01",
    fee: {
      monthly: 20000,
      annual: 200000,
      graceMonths: 3,
    },
    attendance: {
      absentPenaltyPoints: 1,
      pauseAtAbsences: 4,
    },
    discipline: {
      pauseAtPenaltyPoints: 3,
      expelAtPenaltyPoints: 6,
    },
  };
}

// 🔒 6. 규칙 세트 목록 조회
export async function getRuleSetHistory(teamId: string): Promise<RuleSet[]> {
  try {
    const ruleSetsQuery = query(
      collection(db, "teams", teamId, "ruleSets")
    );
    const ruleSetsSnapshot = await getDocs(ruleSetsQuery);

    const ruleSets: RuleSet[] = [];
    ruleSetsSnapshot.forEach((doc) => {
      ruleSets.push({
        id: doc.id,
        ...doc.data(),
      } as RuleSet);
    });

    // effectiveFrom 기준 내림차순 정렬
    ruleSets.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

    return ruleSets;
  } catch (error) {
    console.error("[Rule Registry] 규칙 이력 조회 실패:", error);
    return [];
  }
}

