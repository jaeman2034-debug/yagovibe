/**
 * 🔥 KPI 대시보드 업데이트 스케줄러 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 1분마다 KPI 계산 및 업데이트
 * - 알람 체크 및 전송
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getAllKPIs } from "./kpiQueries";
import { checkKPIAlerts } from "./kpiAlerts";
import { db, FieldValue } from "../firebase";

/**
 * KPI 대시보드 업데이트 (1분마다)
 */
export const updateKPIDashboard = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Seoul" },
  async () => {
    try {
      const now = new Date();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const kpis = await getAllKPIs(weekStart, now, monthStart);

      // KPI 대시보드 문서 업데이트
      await db.collection("kpi_dashboard").doc("current").set({
        ...kpis,
        updatedAt: FieldValue.serverTimestamp(),
        version: "1.0.0",
      });

      // KPI 알람 체크
      await checkKPIAlerts(kpis);

      logger.info("[updateKPIDashboard] KPI 대시보드 업데이트 완료", {
        conversion: kpis.conversion,
        retention: kpis.retention,
        revenue: kpis.revenue,
      });
    } catch (error: any) {
      logger.error("[updateKPIDashboard] 오류:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
