/**
 * 🔥 지식 자동 확장 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 반복 키워드 → FAQ 생성
 * - 미해결 패턴 → 템플릿 추가
 * - SLA 초과 → 원인 분석
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";

// 🔥 지식 자동 확장 임계값
const FAQ_GENERATION_THRESHOLD = 3; // 반복 키워드 3회 이상 시 FAQ 생성
const TEMPLATE_ADDITION_THRESHOLD = 2; // 미해결 패턴 2회 이상 시 템플릿 추가
const SLA_ANALYSIS_THRESHOLD = 0.1; // SLA 초과율 10% 이상 시 원인 분석

/**
 * 반복 키워드 감지 및 FAQ 생성
 */
export const onRepeatedKeywordFAQ = onDocumentCreated(
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

    logger.info("[onRepeatedKeywordFAQ] 반복 키워드 FAQ 생성 체크:", { disputeId });

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
      const words = text.split(/\s+/).filter((w) => w.length >= 2);

      recentDisputes.docs.forEach((doc) => {
        if (doc.id === disputeId) return;

        const existingDispute = doc.data();
        const existingText = `${existingDispute.title || ""} ${existingDispute.description || ""}`.toLowerCase();
        const existingWords = existingText.split(/\s+/).filter((w) => w.length >= 2);

        words.forEach((word) => {
          if (existingWords.includes(word)) {
            keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
          }
        });
      });

      // 🔥 반복 키워드 임계값 초과 시 FAQ 생성 요청
      const repeatedKeywords: string[] = [];
      keywordCounts.forEach((count, keyword) => {
        if (count >= FAQ_GENERATION_THRESHOLD) {
          repeatedKeywords.push(keyword);
        }
      });

      if (repeatedKeywords.length > 0) {
        // 🔥 FAQ 생성 요청 등록
        await db.collection("faqGenerationQueue").add({
          disputeId,
          keywords: repeatedKeywords,
          title,
          description,
          threshold: FAQ_GENERATION_THRESHOLD,
          reason: "REPEATED_KEYWORDS",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        logger.info("[onRepeatedKeywordFAQ] FAQ 생성 요청 등록:", {
          disputeId,
          keywords: repeatedKeywords,
          threshold: FAQ_GENERATION_THRESHOLD,
        });
      }
    } catch (error: any) {
      logger.error("[onRepeatedKeywordFAQ] 반복 키워드 FAQ 생성 체크 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 미해결 패턴 감지 및 템플릿 추가
 */
export const onUnresolvedPatternTemplate = onDocumentUpdated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const disputeId = event.params.disputeId;

    // 🔥 미해결 상태로 전환된 경우 체크
    if (before.status !== "UNRESOLVED" && after.status === "UNRESOLVED") {
      const title = after.title || "";
      const description = after.description || "";
      const type = after.type || "OTHER";

      logger.info("[onUnresolvedPatternTemplate] 미해결 패턴 체크:", { disputeId, type });

      try {
        // 🔥 최근 30일 내 동일 유형 미해결 분쟁 조회
        const thirtyDaysAgo = Timestamp.fromDate(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );

        const unresolvedDisputes = await db
          .collection("disputes")
          .where("type", "==", type)
          .where("status", "==", "UNRESOLVED")
          .where("createdAt", ">=", thirtyDaysAgo)
          .get();

        // 🔥 미해결 패턴 임계값 초과 시 템플릿 추가 요청
        if (unresolvedDisputes.size >= TEMPLATE_ADDITION_THRESHOLD) {
          await db.collection("templateAdditionQueue").add({
            disputeId,
            type,
            title,
            description,
            unresolvedCount: unresolvedDisputes.size,
            threshold: TEMPLATE_ADDITION_THRESHOLD,
            reason: "UNRESOLVED_PATTERN",
            createdAt: FieldValue.serverTimestamp(),
            status: "PENDING",
          });

          logger.warn("[onUnresolvedPatternTemplate] 템플릿 추가 요청 등록:", {
            disputeId,
            type,
            unresolvedCount: unresolvedDisputes.size,
            threshold: TEMPLATE_ADDITION_THRESHOLD,
          });
        }
      } catch (error: any) {
        logger.error("[onUnresolvedPatternTemplate] 미해결 패턴 체크 실패:", {
          disputeId,
          error: error.message,
          stack: error.stack,
        });
      }
    }
  }
);

/**
 * SLA 초과 원인 분석
 */
export const onSLAExceedAnalysis = onSchedule(
  { schedule: "0 0 * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[onSLAExceedAnalysis] SLA 초과 원인 분석 시작");

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
      const typeBreakdown: Record<string, { total: number; exceeded: number }> = {};
      const priorityBreakdown: Record<string, { total: number; exceeded: number }> = {};

      disputes.docs.forEach((doc) => {
        const dispute = doc.data();
        totalDisputes++;

        const type = dispute.type || "OTHER";
        const priority = dispute.priority || "MEDIUM";

        // 🔥 유형별 집계
        if (!typeBreakdown[type]) {
          typeBreakdown[type] = { total: 0, exceeded: 0 };
        }
        typeBreakdown[type].total++;

        // 🔥 우선순위별 집계
        if (!priorityBreakdown[priority]) {
          priorityBreakdown[priority] = { total: 0, exceeded: 0 };
        }
        priorityBreakdown[priority].total++;

        const createdAt = dispute.createdAt?.toDate();
        const botRespondedAt = dispute.botRespondedAt?.toDate();
        const agentAssignedAt = dispute.agentAssignedAt?.toDate();

        // 🔥 SLA 초과 체크
        if (createdAt) {
          let isExceeded = false;

          // 🔥 봇 응답 SLA 초과 (25초)
          if (!botRespondedAt || (botRespondedAt.getTime() - createdAt.getTime()) > 25 * 1000) {
            exceedReasons["BOT_RESPONSE_DELAY"] = (exceedReasons["BOT_RESPONSE_DELAY"] || 0) + 1;
            isExceeded = true;
          }

          // 🔥 상담원 연결 SLA 초과 (6분)
          if (!agentAssignedAt || (agentAssignedAt.getTime() - createdAt.getTime()) > 6 * 60 * 1000) {
            exceedReasons["AGENT_ASSIGNMENT_DELAY"] = (exceedReasons["AGENT_ASSIGNMENT_DELAY"] || 0) + 1;
            isExceeded = true;
          }

          if (isExceeded) {
            slaExceeded++;
            typeBreakdown[type].exceeded++;
            priorityBreakdown[priority].exceeded++;
          }
        }
      });

      const exceedRate = totalDisputes > 0 ? slaExceeded / totalDisputes : 0;

      // 🔥 SLA 초과율 임계값 초과 시 원인 분석 리포트 생성
      if (exceedRate >= SLA_ANALYSIS_THRESHOLD) {
        await db.collection("slaAnalysisReports").add({
          date: yesterdayStart,
          totalDisputes,
          slaExceeded,
          exceedRate,
          exceedReasons,
          typeBreakdown,
          priorityBreakdown,
          threshold: SLA_ANALYSIS_THRESHOLD,
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING_REVIEW",
        });

        logger.warn("[onSLAExceedAnalysis] SLA 초과 원인 분석 리포트 생성:", {
          date: yesterdayStart.toDate().toISOString(),
          totalDisputes,
          slaExceeded,
          exceedRate,
          exceedReasons,
          typeBreakdown,
          priorityBreakdown,
        });
      }
    } catch (error: any) {
      logger.error("[onSLAExceedAnalysis] SLA 초과 원인 분석 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
