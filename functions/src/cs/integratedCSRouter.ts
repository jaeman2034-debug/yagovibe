/**
 * 🔥 통합 CS 자동 라우터 (실전 배포 패키지)
 * 
 * 역할:
 * - 분쟁/문의 자동 분류 및 라우팅
 * - 템플릿 자동 응답
 * - 상담원 연결 (필요 시)
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";
import { routeCSIssue, CSAutoResponse, IssueType } from "../market/coreStabilityEngine";
import { AUTO_RESPONSE_TEMPLATES } from "./autoResponseV2";

/**
 * 분쟁 생성 시 자동 라우팅
 */
export const onDisputeCreated = onDocumentCreated(
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

    logger.info("[onDisputeCreated] 분쟁 생성 자동 라우팅 시작:", { disputeId });

    try {
      // ============================================
      // 1. 이슈 타입 자동 분류
      // ============================================
      let issueType: IssueType = "OTHER";
      
      const text = `${title} ${description}`.toLowerCase();
      if (text.includes("가격") || text.includes("비싸") || text.includes("싸")) {
        issueType = "PRICE";
      } else if (text.includes("상태") || text.includes("품질") || text.includes("손상")) {
        issueType = "STATE";
      } else if (text.includes("배송") || text.includes("택배") || text.includes("지연")) {
        issueType = "DELIVERY";
      } else if (text.includes("결제") || text.includes("환불") || text.includes("입금")) {
        issueType = "PAYMENT";
      }

      // ============================================
      // 2. CS 자동 라우팅
      // ============================================
      const csResponse: CSAutoResponse = routeCSIssue({
        type: issueType,
        title,
        description,
      });

      // ============================================
      // 3. 템플릿 자동 응답 (상담원 불필요 시)
      // ============================================
      if (!csResponse.needsHuman && csResponse.template !== "OTHER") {
        const template = AUTO_RESPONSE_TEMPLATES[csResponse.template as keyof typeof AUTO_RESPONSE_TEMPLATES];
        
        if (template) {
          // 🔥 자동 응답 저장
          await db.collection("disputes").doc(disputeId).collection("responses").add({
            type: "AUTO_RESPONSE",
            template: csResponse.template,
            message: template.initial, // initial 단계 템플릿 사용
            createdAt: FieldValue.serverTimestamp(),
            botResponded: true,
          });

          // 🔥 분쟁 상태 업데이트
          await db.collection("disputes").doc(disputeId).update({
            stage: "AUTO_RESPONDED",
            issueType,
            autoResponseTemplate: csResponse.template,
            botResponded: true,
            botRespondedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });

          logger.info("[onDisputeCreated] 자동 응답 발송:", {
            disputeId,
            template: csResponse.template,
          });
        }
      } else {
        // 🔥 상담원 연결 필요
        await db.collection("disputes").doc(disputeId).update({
          stage: "PENDING_AGENT",
          issueType,
          needsHuman: true,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // 🔥 CS 큐에 등록
        await db.collection("csQueue").add({
          disputeId,
          issueType,
          priority: issueType === "PAYMENT" ? "HIGH" : "MEDIUM",
          createdAt: FieldValue.serverTimestamp(),
          status: "PENDING",
        });

        logger.info("[onDisputeCreated] 상담원 연결 요청:", {
          disputeId,
          issueType,
        });
      }
    } catch (error: any) {
      logger.error("[onDisputeCreated] 분쟁 자동 라우팅 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
