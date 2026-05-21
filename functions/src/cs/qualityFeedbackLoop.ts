/**
 * 🔥 품질 피드백 루프 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - CS 로그 → FAQ 자동 갱신
 * - 반복 키워드 → 템플릿 생성
 * - SLA 초과 → 원인 리포트
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 품질 피드백 루프 임계값
const FAQ_UPDATE_THRESHOLD = 5; // 동일 문의 5회 이상 시 FAQ 자동 갱신
const TEMPLATE_GENERATION_THRESHOLD = 3; // 반복 키워드 3회 이상 시 템플릿 생성
const SLA_EXCEED_THRESHOLD = 0.1; // SLA 초과율 10% 이상 시 원인 리포트

/**
 * CS 로그 분석 및 FAQ 자동 갱신
 */
export const onCSLogFAQUpdate = onDocumentCreated(
  {
    document: "csLogs/{logId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const csLog = event.data?.data();
    if (!csLog) return;

    const logId = event.params.logId;
    const inquiry = csLog.inquiry || "";
    const response = csLog.response || "";

    logger.info("[onCSLogFAQUpdate] CS 로그 분석:", { logId });

    try {
      // 🔥 최근 30일 내 동일/유사 문의 조회
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );

      const similarLogs = await db
        .collection("csLogs")
        .where("createdAt", ">=", thirtyDaysAgo)
        .limit(100)
        .get();

      // 🔥 문의 유사도 계산
      const inquiryLower = inquiry.toLowerCase();
      let similarCount = 0;
      const similarResponses: string[] = [];

      for (const doc of similarLogs.docs) {
        if (doc.id === logId) continue;

        const existingLog = doc.data();
        const existingInquiry = (existingLog.inquiry || "").toLowerCase();

        // 🔥 단어 기반 유사도 계산
        const words1 = new Set(inquiryLower.split(/\s+/));
        const words2 = new Set(existingInquiry.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        const similarity = intersection.size / union.size;

        if (similarity >= 0.7) {
          similarCount++;
          if (existingLog.response) {
            similarResponses.push(existingLog.response);
          }
        }
      }

      // 🔥 FAQ 자동 갱신 임계값 초과 시
      if (similarCount >= FAQ_UPDATE_THRESHOLD) {
        // 🔥 가장 많이 사용된 응답 선택
        const responseCounts = new Map<string, number>();
        similarResponses.forEach((r) => {
          responseCounts.set(r, (responseCounts.get(r) || 0) + 1);
        });

        let mostCommonResponse = "";
        let maxCount = 0;
        responseCounts.forEach((count, resp) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonResponse = resp;
          }
        });

        // 🔥 FAQ 자동 갱신 요청 등록
        await db.collection("faqAutoUpdateQueue").add({
          inquiry,
          response: mostCommonResponse || response,
          similarCount,
          threshold: FAQ_UPDATE_THRESHOLD,
          reason: "REPEATED_INQUIRY",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        logger.info("[onCSLogFAQUpdate] FAQ 자동 갱신 요청 등록:", {
          logId,
          inquiry,
          similarCount,
          threshold: FAQ_UPDATE_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[onCSLogFAQUpdate] CS 로그 분석 실패:", {
        logId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 반복 키워드 감지 및 템플릿 생성
 */
export const onRepeatedKeywordTemplate = onDocumentCreated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const dispute = event.data?.data();
    if (!dispute) return;

    const disputeId = event.params.disputeId;
    const title = dispute.title || "";
    const description = dispute.description || "";

    logger.info("[onRepeatedKeywordTemplate] 반복 키워드 체크:", { disputeId });

    try {
      // 🔥 최근 7일 내 분쟁 조회
      const sevenDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      const recentDisputes = await db
        .collection("disputes")
        .where("createdAt", ">=", sevenDaysAgo)
        .limit(200)
        .get();

      // 🔥 키워드 빈도 계산
      const keywordCounts = new Map<string, number>();
      const text = `${title} ${description}`.toLowerCase();

      // 🔥 단어 추출 (2글자 이상)
      const words = text.split(/\s+/).filter((w) => w.length >= 2);

      recentDisputes.docs.forEach((doc) => {
        if (doc.id === disputeId) return;

        const existingDispute = doc.data();
        const existingText = `${existingDispute.title || ""} ${existingDispute.description || ""}`.toLowerCase();
        const existingWords = existingText.split(/\s+/).filter((w) => w.length >= 2);

        // 🔥 공통 키워드 카운트
        words.forEach((word) => {
          if (existingWords.includes(word)) {
            keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
          }
        });
      });

      // 🔥 반복 키워드 임계값 초과 시 템플릿 생성 요청
      const repeatedKeywords: string[] = [];
      keywordCounts.forEach((count, keyword) => {
        if (count >= TEMPLATE_GENERATION_THRESHOLD) {
          repeatedKeywords.push(keyword);
        }
      });

      if (repeatedKeywords.length > 0) {
        await db.collection("templateGenerationQueue").add({
          disputeId,
          keywords: repeatedKeywords,
          title,
          description,
          threshold: TEMPLATE_GENERATION_THRESHOLD,
          reason: "REPEATED_KEYWORDS",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        logger.info("[onRepeatedKeywordTemplate] 템플릿 생성 요청 등록:", {
          disputeId,
          keywords: repeatedKeywords,
          threshold: TEMPLATE_GENERATION_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[onRepeatedKeywordTemplate] 반복 키워드 체크 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * SLA 초과 원인 리포트 생성
 */
export const onSLAExceedReport = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[onSLAExceedReport] SLA 초과 원인 리포트 생성 시작");

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStart = Timestamp.fromDate(yesterday);
      const yesterdayEnd = Timestamp.fromDate(
        new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
      );

      // 🔥 어제 분쟁 조회
      const disputes = await db
        .collection("disputes")
        .where("createdAt", ">=", yesterdayStart)
        .where("createdAt", "<", yesterdayEnd)
        .get();

      let totalDisputes = 0;
      let slaExceeded = 0;
      const exceedReasons: Record<string, number> = {};

      disputes.docs.forEach((doc) => {
        const dispute = doc.data();
        totalDisputes++;

        const createdAt = dispute.createdAt?.toDate();
        const botRespondedAt = dispute.botRespondedAt?.toDate();
        const agentAssignedAt = dispute.agentAssignedAt?.toDate();

        // 🔥 SLA 초과 체크
        if (createdAt) {
          // 🔥 봇 응답 SLA 초과 (40초)
          if (!botRespondedAt || (botRespondedAt.getTime() - createdAt.getTime()) > 40 * 1000) {
            slaExceeded++;
            exceedReasons["BOT_RESPONSE_DELAY"] = (exceedReasons["BOT_RESPONSE_DELAY"] || 0) + 1;
          }

          // 🔥 상담원 연결 SLA 초과 (6분)
          if (!agentAssignedAt || (agentAssignedAt.getTime() - createdAt.getTime()) > 6 * 60 * 1000) {
            slaExceeded++;
            exceedReasons["AGENT_ASSIGNMENT_DELAY"] = (exceedReasons["AGENT_ASSIGNMENT_DELAY"] || 0) + 1;
          }
        }
      });

      const exceedRate = totalDisputes > 0 ? slaExceeded / totalDisputes : 0;

      // 🔥 SLA 초과율 임계값 초과 시 원인 리포트 생성
      if (exceedRate >= SLA_EXCEED_THRESHOLD) {
        await db.collection("slaExceedReports").add({
          date: yesterdayStart,
          totalDisputes,
          slaExceeded,
          exceedRate,
          exceedReasons,
          threshold: SLA_EXCEED_THRESHOLD,
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING_REVIEW",
        });

        logger.warn("[onSLAExceedReport] SLA 초과 원인 리포트 생성:", {
          date: yesterdayStart.toDate().toISOString(),
          totalDisputes,
          slaExceeded,
          exceedRate,
          exceedReasons,
        });
      }
    } catch (error: any) {
      logger.error("[onSLAExceedReport] SLA 초과 원인 리포트 생성 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
