/**
 * 협회 월간 운영 리포트 PDF 생성 API
 * 
 * 협회 홈 대시보드에서 월간 리포트 PDF를 생성 및 다운로드 제공
 * A4 1장 기준, 보고/결재용 문서
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { generateMonthlyReportInternal } from "../services/monthlyReportService";

/**
 * 협회 월간 운영 리포트 PDF 생성 (Callable)
 * 
 * @example
 * ```typescript
 * const generateMonthlyReportPdf = httpsCallable(functions, "generateMonthlyReportPdf");
 * const result = await generateMonthlyReportPdf({
 *   associationId: "assoc-nowon-football",
 *   year: 2026,
 *   month: 1
 * });
 * ```
 */
export const generateMonthlyReportPdf = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    memory: "1GiB",
    timeoutSeconds: 120, // PDF 생성 시간 확보
  },
  async (req) => {
    const { associationId, year, month } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!associationId || !year || !month) {
      throw new HttpsError(
        "invalid-argument",
        "associationId, year, month가 모두 필요합니다."
      );
    }

    try {
      // 내부 서비스 함수 호출
      const result = await generateMonthlyReportInternal({
        associationId,
        year,
        month,
      });

      logger.info(`Monthly report PDF generated via API: ${result.storageKey}`, {
        associationId,
        year,
        month,
        uid,
      });

      return result;
    } catch (error: any) {
      logger.error(`Error generating monthly report PDF: ${error}`, {
        associationId,
        year,
        month,
        uid,
      });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        `PDF 생성 중 오류가 발생했습니다: ${error.message}`
      );
    }
  }
);
