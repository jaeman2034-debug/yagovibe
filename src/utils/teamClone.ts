// src/utils/teamClone.ts
// 🔥 팀 복제 기능 (확장 모드 준비)

import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateTeamDocument } from "@/lib/team/updateTeamDocument";
import { type TeamFeePolicy } from "./teamRules";

export interface CloneTeamOptions {
  sourceTeamId: string;
  newTeamName: string;
  newTeamRegion?: string;
  copyMembers?: boolean; // 기본값: false (멤버는 비워서 생성)
  copyPolicy?: boolean; // 기본값: true (정책 복사)
}

// 🔥 팀 복제 (운영자용)
export async function cloneTeam(
  options: CloneTeamOptions,
  userId: string
): Promise<string> {
  const { sourceTeamId, newTeamName, newTeamRegion, copyMembers = false, copyPolicy = true } = options;

  // 1. 원본 팀 정보 조회
  const sourceTeamRef = doc(db, "teams", sourceTeamId);
  const sourceTeamSnap = await getDoc(sourceTeamRef);
  
  if (!sourceTeamSnap.exists()) {
    throw new Error("원본 팀을 찾을 수 없습니다.");
  }

  const sourceTeamData = sourceTeamSnap.data();

  // 2. 새 팀 생성
  const newTeamRef = doc(collection(db, "teams"));
  const newTeamId = newTeamRef.id;

  // 3. 팀 기본 정보 복사
  const newTeamData: any = {
    name: newTeamName,
    region: newTeamRegion || sourceTeamData.region || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId,
    sportType: sourceTeamData.sportType || "football",
  };

  // 4. 정책 복사 (선택)
  if (copyPolicy && sourceTeamData.feePolicy) {
    newTeamData.feePolicy = {
      ...sourceTeamData.feePolicy,
    } as TeamFeePolicy;
  } else {
    // 기본 정책
    newTeamData.feePolicy = {
      monthly: 20000,
      annualAmount: 200000,
      annualPayBy: "02-28",
      annualBenefitMonths: 2,
      graceUnpaidMonths: 3,
      pauseAtMonths: 3,
      expelAtMonths: 6,
    } as TeamFeePolicy;
  }

  // 알림 정책 복사 (선택)
  if (copyPolicy && sourceTeamData.notifyPolicy) {
    newTeamData.notifyPolicy = {
      ...sourceTeamData.notifyPolicy,
      testMode: true, // 🔒 새 팀은 기본 테스트 모드
    };
  }

  await setDoc(newTeamRef, newTeamData);

  // 5. 멤버 복사 (선택)
  if (copyMembers) {
    const membersSnapshot = await getDocs(
      collection(db, "teams", sourceTeamId, "members")
    );
    
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      await setDoc(
        doc(db, "teams", newTeamId, "members", memberDoc.id),
        {
          ...memberData,
          joinedAt: serverTimestamp(), // 새 팀 가입일로 변경
          unpaidMonths: 0, // 초기화
          status: "active", // 초기화
        }
      );
    }
  }

  return newTeamId;
}

// 🔥 연합 관리 베이스 구조
export interface Federation {
  id?: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt?: Date;
  memberTeamIds: string[]; // 연합 소속 팀 ID 목록
}

// 🔥 연합 생성
export async function createFederation(
  name: string,
  description: string,
  ownerUid: string
): Promise<string> {
  const federationRef = doc(collection(db, "federations"));
  await setDoc(federationRef, {
    name,
    description,
    createdBy: ownerUid,
    memberTeamIds: [],
    createdAt: serverTimestamp(),
  });

  console.log(`[Federation] 연합 생성 완료: ${federationRef.id} (${name})`);
  return federationRef.id;
}

// 🔥 팀을 연합에 추가
export async function addTeamToFederation(
  federationId: string,
  teamId: string
): Promise<void> {
  const federationRef = doc(db, "federations", federationId);
  const federationSnap = await getDoc(federationRef);

  if (!federationSnap.exists()) {
    throw new Error("연합을 찾을 수 없습니다.");
  }

  const currentTeamIds = federationSnap.data()?.memberTeamIds || [];
  if (currentTeamIds.includes(teamId)) {
    throw new Error("이미 연합에 소속된 팀입니다.");
  }

  await updateDoc(federationRef, {
    memberTeamIds: [...currentTeamIds, teamId],
    updatedAt: serverTimestamp(),
  });

  // 팀 문서에도 연합 정보 추가
  await updateTeamDocument(teamId, {
    federationId,
    joinedFederationAt: serverTimestamp(),
  });

  console.log(`[Federation] 팀 추가 완료: ${teamId} -> ${federationId}`);
}

// 🔥 연합 소속 팀 목록 조회
export async function getFederationTeams(federationId: string): Promise<any[]> {
  const federationRef = doc(db, "federations", federationId);
  const federationSnap = await getDoc(federationRef);

  if (!federationSnap.exists()) {
    return [];
  }

  const teamIds = federationSnap.data()?.memberTeamIds || [];
  const teams: any[] = [];

  for (const teamId of teamIds) {
    try {
      const teamRef = doc(db, "teams", teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        teams.push({
          id: teamSnap.id,
          ...teamSnap.data(),
        });
      }
    } catch (error) {
      console.error(`[Federation] 팀 조회 실패: ${teamId}`, error);
    }
  }

  return teams;
}

// 🔥 팀이 속한 연합 조회
export async function getTeamFederation(teamId: string): Promise<Federation | null> {
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);

  if (!teamSnap.exists()) {
    return null;
  }

  const federationId = teamSnap.data()?.federationId;
  if (!federationId) {
    return null;
  }

  const federationRef = doc(db, "federations", federationId);
  const federationSnap = await getDoc(federationRef);

  if (!federationSnap.exists()) {
    return null;
  }

  return {
    id: federationSnap.id,
    ...federationSnap.data(),
  } as Federation;
}

