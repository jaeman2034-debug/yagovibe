import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

/**
 * 월간 PDF 스케줄 본문 — index.ts에서만 동적 import (배포 시 코드 로드 10초 제한 완화)
 */
export async function runScheduledMonthlyFederationAccountingReports(): Promise<void> {
  const { runMonthlyAccountingReport } = await import("./monthlyAccountingReport.impl");

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year = prev.getFullYear();
  const month = prev.getMonth() + 1;

  const db = getFirestore();
  const refs = await db.collection("federations").listDocuments();

  let successCount = 0;
  let duplicateSkipped = 0;
  let fail = 0;
  let skippedDisabled = 0;

  for (const ref of refs) {
    const slug = ref.id;
    try {
      const snap = await ref.get();
      const data = snap.data() as Record<string, unknown> | undefined;
      if (data?.monthlyAccountingReportEnabled === false) {
        skippedDisabled++;
        continue;
      }

      const reportResult = await runMonthlyAccountingReport({
        federationSlug: slug,
        year,
        month,
        trigger: "schedule",
        skipIfReportExists: true,
      });

      if (reportResult.ok === false) {
        fail++;
        logger.warn("[scheduledMonthlyFederationAccountingReports] failed", {
          slug,
          year,
          month,
          error: reportResult.error,
        });
      } else if (reportResult.skipped) {
        duplicateSkipped++;
      } else {
        successCount++;
      }
    } catch (e: unknown) {
      fail++;
      logger.warn("[scheduledMonthlyFederationAccountingReports] exception", {
        slug,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }

  logger.info("[scheduledMonthlyFederationAccountingReports] done", {
    year,
    month,
    generated: successCount,
    duplicateSkipped,
    skippedDisabled,
    fail,
    total: refs.length,
  });
}
