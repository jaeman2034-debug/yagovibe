// src/utils/memberHealthMonitor.ts
// 🔥 고령 사용자 이탈 방지 장치: 활동 감지 + 알림

import { collection, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type TeamMember } from "./teamRules";
import { enqueueNotification } from "./notificationService";

export interface MemberHealthStatus {
  memberId: string;
  memberName: string;
  inactiveScore: number; // 0-100 (높을수록 위험)
  flags: string[];
  lastAttendanceDate?: Date;
  lastAppAccessDate?: Date;
  unpaidMonths: number;
  needsAttention: boolean;
}

// 🔥 1. 회원 건강도 평가
export async function assessMemberHealth(
  teamId: string,
  member: TeamMember
): Promise<MemberHealthStatus> {
  const status: MemberHealthStatus = {
    memberId: member.id || "",
    memberName: member.name,
    inactiveScore: 0,
    flags: [],
    unpaidMonths: member.unpaidMonths || 0,
    needsAttention: false,
  };

  const now = new Date();
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // 1. 최근 2개월 출석 체크
  let attendanceCount = 0;
  try {
    for (let i = 0; i < 2; i++) {
      const checkDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyymmdd = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      
      const attendanceRef = collection(db, "teams", teamId, "attendance", yyyymmdd, "items");
      const attendanceQuery = query(attendanceRef, where("memberId", "==", member.id));
      const attendanceSnap = await getDocs(attendanceQuery);
      
      if (!attendanceSnap.empty) {
        const attendanceData = attendanceSnap.docs[0].data();
        if (attendanceData.status === "present") {
          attendanceCount++;
          if (!status.lastAttendanceDate) {
            status.lastAttendanceDate = attendanceData.recordedAt?.toDate();
          }
        }
      }
    }

    if (attendanceCount === 0) {
      status.inactiveScore += 40;
      status.flags.push("최근 2개월 출석 없음");
    }
  } catch (error) {
    console.error(`[Member Health] 출석 체크 실패:`, error);
  }

  // 2. 미납 개월 체크
  if (status.unpaidMonths >= 2) {
    status.inactiveScore += 30;
    status.flags.push(`미납 ${status.unpaidMonths}개월`);
  }

  // 3. 앱 접속 체크 (userActivity 컬렉션 또는 members.lastAccessAt)
  try {
    const memberRef = doc(db, "teams", teamId, "members", member.id || "");
    const memberSnap = await getDoc(memberRef);
    const memberData = memberSnap.data();
    
    if (memberData?.lastAccessAt) {
      const lastAccess = memberData.lastAccessAt.toDate();
      const daysSinceAccess = Math.floor((now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceAccess > 60) {
        status.inactiveScore += 30;
        status.flags.push(`${daysSinceAccess}일간 앱 미접속`);
        status.lastAppAccessDate = lastAccess;
      }
    } else {
      // lastAccessAt이 없으면 앱 미접속으로 간주
      status.inactiveScore += 20;
      status.flags.push("앱 접속 기록 없음");
    }
  } catch (error) {
    console.error(`[Member Health] 앱 접속 체크 실패:`, error);
  }

  // 4. 위험도 판정
  status.needsAttention = status.inactiveScore >= 50; // 50점 이상이면 주의 필요

  return status;
}

// 🔥 2. 팀 전체 회원 건강도 스캔
export async function scanTeamMemberHealth(teamId: string): Promise<MemberHealthStatus[]> {
  const statuses: MemberHealthStatus[] = [];

  try {
    const membersRef = collection(db, "teams", teamId, "members");
    const membersSnapshot = await getDocs(membersRef);

    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data() as TeamMember;
      const status = await assessMemberHealth(teamId, {
        ...memberData,
        id: memberDoc.id,
      });
      statuses.push(status);
    }

    // 위험도 순으로 정렬
    statuses.sort((a, b) => b.inactiveScore - a.inactiveScore);
  } catch (error) {
    console.error(`[Member Health] 스캔 실패:`, error);
  }

  return statuses;
}

// 🔥 3. 주의 필요 회원 알림 발송 (회장/총무에게만)
export async function notifyAttentionNeededMembers(
  teamId: string,
  statuses: MemberHealthStatus[]
): Promise<number> {
  let notifiedCount = 0;
  const attentionNeeded = statuses.filter((s) => s.needsAttention);

  if (attentionNeeded.length === 0) return 0;

  try {
    // 회장/총무 조회
    const membersRef = collection(db, "teams", teamId, "members");
    const adminQuery = query(
      membersRef,
      where("role", "in", ["회장", "총무", "admin"])
    );
    const adminSnapshot = await getDocs(adminQuery);

    if (adminSnapshot.empty) return 0;

    // 각 관리자에게 알림 발송
    for (const adminDoc of adminSnapshot.docs) {
      const adminData = adminDoc.data();
      const memberNames = attentionNeeded.map((s) => s.memberName).join(", ");

      // 알림 큐에 추가 (기존 notificationService 활용)
      await enqueueNotification(teamId, {
        teamId,
        type: "MEMBER_ATTENTION_NEEDED",
        toMemberId: adminDoc.id,
        toPhoneLast4: adminData.phoneLast4,
        payload: {
          attentionCount: attentionNeeded.length,
          memberNames,
          flags: attentionNeeded.map((s) => s.flags.join(", ")).join(" / "),
        },
        idempotencyKey: `MEMBER_ATTENTION:${new Date().getFullYear()}-${new Date().getMonth()}:${adminDoc.id}`,
      });

      notifiedCount++;
    }

    console.log(`[Member Health] ${teamId}: ${notifiedCount}명의 관리자에게 알림 발송`);
  } catch (error) {
    console.error(`[Member Health] 알림 발송 실패:`, error);
  }

  return notifiedCount;
}


