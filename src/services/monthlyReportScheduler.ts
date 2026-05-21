// src/services/monthlyReportScheduler.ts
// 🔥 월간 리포트 스케줄러: 리포트 생성 + 발송 Outbox 등록
//
// 🎯 핵심 원칙:
// - 리포트 생성과 발송 완전 분리
// - 멱등성 보장
// - 생성 완료 후 Outbox에 등록

import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateMonthlyReport } from "./reportService";
import { enqueueNotification } from "./notificationOutboxService";
import type { NotificationPayload } from "@/domain/notification/types";
import { generateDedupeKey } from "@/domain/notification/outbox";

/**
 * 월간 리포트 생성 및 발송 스케줄러
 * 
 * 🔥 실행 시점:
 * - 매월 1일 00:05 KST (Cloud Functions 스케줄러)
 * - 또는 수동 호출
 * 
 * 🔥 동작:
 * 1. 대상 팀 선정 (enableNewFeeSystem=true)
 * 2. 리포트 생성 (PDF/CSV, 멱등성 보장)
 * 3. 발송 Outbox 등록 (관리자에게 알림)
 * 
 * @param yyyyMM 대상 월 (생략 시 전월)
 * @param teamIds 특정 팀만 처리 (생략 시 전체)
 */
export async function generateAndEnqueueMonthlyReports(
  yyyyMM?: string,
  teamIds?: string[]
): Promise<{
  processed: number;
  generated: number;
  enqueued: number;
  errors: Array<{ teamId: string; error: string }>;
}> {
  // 월 계산
  if (!yyyyMM) {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    yyyyMM = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  }

  // 대상 팀 조회
  let teams: Array<{ id: string; data: any }>;
  
  if (teamIds && teamIds.length > 0) {
    // 특정 팀만 처리
    teams = [];
    for (const teamId of teamIds) {
      const teamRef = doc(db, "teams", teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        teams.push({ id: teamId, data: teamSnap.data() });
      }
    }
  } else {
    // 전체 팀 조회 (enableNewFeeSystem=true만)
    const teamsRef = collection(db, "teams");
    const teamsQuery = query(teamsRef, where("enableNewFeeSystem", "==", true));
    const teamsSnap = await getDocs(teamsQuery);
    teams = teamsSnap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  }

  let processed = 0;
  let generated = 0;
  let enqueued = 0;
  const errors: Array<{ teamId: string; error: string }> = [];

  // 각 팀 처리
  for (const team of teams) {
    try {
      processed++;

      // 1. 리포트 생성 (PDF)
      const pdfResult = await generateMonthlyReport({
        teamId: team.id,
        yyyyMM,
        format: "PDF",
      });

      if (pdfResult.isNew) {
        generated++;
      }

      // 2. CSV도 생성 (선택)
      const csvResult = await generateMonthlyReport({
        teamId: team.id,
        yyyyMM,
        format: "CSV",
      });

      if (csvResult.isNew) {
        generated++;
      }

      // 3. 관리자에게 알림 Outbox 등록
      const admins = await getTeamAdmins(team.id);
      
      for (const admin of admins) {
        if (!admin.phoneE164 && !admin.email) {
          continue; // 연락처 없으면 스킵
        }

        // 카카오 알림 (우선)
        const payload: NotificationPayload = {
          event: "MONTHLY_REPORT",
          channel: "kakao",
          target: {
            userId: admin.userId,
            phoneE164: admin.phoneE164,
            name: admin.name,
          },
          title: `📊 ${yyyyMM} 월간 리포트`,
          message: `${yyyyMM} 월간 리포트가 준비되었습니다. 아래 링크에서 확인하세요.`,
          templateId: "monthly_report_v1",
          variables: {
            month: yyyyMM,
            pdfUrl: pdfResult.artifact.url || "",
            csvUrl: csvResult.artifact.url || "",
          },
          data: {
            yyyyMM,
            pdfUrl: pdfResult.artifact.url,
            csvUrl: csvResult.artifact.url,
            pdfStorageKey: pdfResult.artifact.storageKey,
            csvStorageKey: csvResult.artifact.storageKey,
          },
          teamId: team.id,
        };

        const dedupeKey = generateDedupeKey(payload, yyyyMM);
        await enqueueNotification(payload, dedupeKey);
        enqueued++;
      }

      console.log(`[Scheduler] 팀 처리 완료: ${team.id}`, {
        yyyyMM,
        pdfGenerated: pdfResult.isNew,
        csvGenerated: csvResult.isNew,
        adminsNotified: admins.length,
      });
    } catch (error: any) {
      console.error(`[Scheduler] 팀 처리 실패: ${team.id}`, error);
      errors.push({
        teamId: team.id,
        error: error.message || String(error),
      });
    }
  }

  return {
    processed,
    generated,
    enqueued,
    errors,
  };
}

/**
 * 팀 관리자 목록 조회
 */
async function getTeamAdmins(teamId: string): Promise<Array<{
  userId: string;
  name?: string;
  phoneE164?: string;
  email?: string;
}>> {
  const membersRef = collection(db, "teams", teamId, "members");
  const adminsQuery = query(
    membersRef,
    where("role", "in", ["OWNER", "ADMIN", "STAFF"])
  );
  const adminsSnap = await getDocs(adminsQuery);

  const admins: Array<{
    userId: string;
    name?: string;
    phoneE164?: string;
    email?: string;
  }> = [];

  for (const adminDoc of adminsSnap.docs) {
    const adminData = adminDoc.data();
    admins.push({
      userId: adminDoc.id,
      name: adminData.name,
      phoneE164: adminData.phoneE164,
      email: adminData.email,
    });
  }

  return admins;
}

