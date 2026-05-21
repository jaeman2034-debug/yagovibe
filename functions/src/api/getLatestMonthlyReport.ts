/**
 * 최근 월간 리포트 조회 API
 * 
 * 협회 홈에서 최근 생성된 리포트를 조회
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

const storage = admin.storage();

/**
 * 최근 월간 리포트 조회
 * 
 * @example
 * ```typescript
 * const getLatestMonthlyReport = httpsCallable(functions, "getLatestMonthlyReport");
 * const result = await getLatestMonthlyReport({
 *   associationId: "assoc-nowon-football"
 * });
 * ```
 */
export const getLatestMonthlyReport = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { associationId } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!associationId) {
      throw new HttpsError(
        "invalid-argument",
        "associationId가 필요합니다."
      );
    }

    try {
      const bucket = storage.bucket();
      const prefix = `reports/${associationId}/`;

      // Storage에서 리포트 파일 목록 조회 (최신순)
      const [files] = await bucket.getFiles({
        prefix,
        maxResults: 1,
      });

      if (files.length === 0) {
        return {
          exists: false,
          report: null,
        };
      }

      // 가장 최신 파일 (파일명이 날짜 순서이므로 마지막 파일)
      const latestFile = files[files.length - 1];
      
      // 파일명에서 년/월 추출 (예: "2026-01.pdf")
      const filename = latestFile.name.split("/").pop() || "";
      const match = filename.match(/^(\d{4})-(\d{2})\.pdf$/);
      
      if (!match) {
        throw new HttpsError(
          "internal",
          "리포트 파일명 형식이 올바르지 않습니다."
        );
      }

      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);

      // Signed URL 생성 (30일 유효)
      const [downloadUrl] = await latestFile.getSignedUrl({
        action: "read",
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
      });

      logger.info(`Latest monthly report found: ${latestFile.name}`, {
        associationId,
        year,
        month,
      });

      return {
        exists: true,
        report: {
          year,
          month,
          downloadUrl,
          filename: `${year}년 ${month}월 운영리포트.pdf`,
          storageKey: latestFile.name,
        },
      };
    } catch (error: any) {
      logger.error(`Error getting latest monthly report: ${error}`, {
        associationId,
        uid,
      });
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        `최근 리포트 조회 중 오류가 발생했습니다: ${error.message}`
      );
    }
  }
);

