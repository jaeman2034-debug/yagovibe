/**
 * 🔥 CS 자동 답변 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 분쟁 3단 워크플로 자동 처리
 * - 자동 답변 템플릿 적용
 * - SLA 규칙 준수
 * - 에스컬레이션 조건 체크
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";

// 🔥 SLA 규칙
const SLA_FIRST_RESPONSE_MINUTES = 30; // 첫 응답 30분 이내
const SLA_RESOLUTION_HOURS = 24; // 해결 24시간 이내
const SLA_ESCALATION_HOURS = 48; // 에스컬레이션 48시간 이내

// 🔥 분쟁 단계
type DisputeStage = "INITIAL" | "INVESTIGATION" | "RESOLUTION" | "ESCALATED";

// 🔥 분쟁 유형
type DisputeType = 
  | "NO_SHOW" 
  | "PRICE_DISAGREEMENT" 
  | "ITEM_CONDITION" 
  | "PAYMENT_ISSUE" 
  | "DELIVERY_ISSUE"
  | "OTHER";

/**
 * 자동 답변 템플릿
 */
const AUTO_RESPONSE_TEMPLATES: Record<DisputeType, {
  initial: string;
  investigation: string;
  resolution: string;
}> = {
  NO_SHOW: {
    initial: "노쇼 신고가 접수되었습니다. 30분 이내에 확인 후 조치하겠습니다.",
    investigation: "노쇼 사유를 확인 중입니다. 상대방에게 연락을 시도하고 있습니다.",
    resolution: "노쇼가 확인되었습니다. 보증금 환불 및 평판 조정이 진행됩니다.",
  },
  PRICE_DISAGREEMENT: {
    initial: "가격 분쟁이 접수되었습니다. 채팅 내역 및 가격 협의 내용을 확인 중입니다.",
    investigation: "가격 협의 내역을 검토 중입니다. 채팅 로그를 확인하여 원인을 파악하겠습니다.",
    resolution: "가격 분쟁이 해결되었습니다. 합의된 가격으로 거래가 진행됩니다.",
  },
  ITEM_CONDITION: {
    initial: "상품 상태 분쟁이 접수되었습니다. 사진 및 설명을 확인 중입니다.",
    investigation: "상품 상태를 검토 중입니다. 사진 비교 및 설명 대조를 진행하겠습니다.",
    resolution: "상품 상태 분쟁이 해결되었습니다. 환불 또는 가격 조정이 진행됩니다.",
  },
  PAYMENT_ISSUE: {
    initial: "결제 문제가 접수되었습니다. 결제 내역을 확인 중입니다.",
    investigation: "결제 내역을 검토 중입니다. 결제 시스템 로그를 확인하겠습니다.",
    resolution: "결제 문제가 해결되었습니다. 환불 또는 재결제가 진행됩니다.",
  },
  DELIVERY_ISSUE: {
    initial: "배송 문제가 접수되었습니다. 배송 추적 정보를 확인 중입니다.",
    investigation: "배송 추적 정보를 검토 중입니다. 배송사와 연락하여 상황을 파악하겠습니다.",
    resolution: "배송 문제가 해결되었습니다. 재배송 또는 환불이 진행됩니다.",
  },
  OTHER: {
    initial: "문의가 접수되었습니다. 30분 이내에 확인 후 조치하겠습니다.",
    investigation: "문의 내용을 검토 중입니다. 관련 정보를 확인하여 답변드리겠습니다.",
    resolution: "문의가 해결되었습니다. 추가 문의사항이 있으시면 언제든지 연락주세요.",
  },
};

/**
 * 분쟁 3단 워크플로
 */
async function processDisputeWorkflow(
  disputeId: string,
  dispute: any,
  stage: DisputeStage
): Promise<void> {
  const disputeType = dispute.type as DisputeType || "OTHER";
  const template = AUTO_RESPONSE_TEMPLATES[disputeType];

  switch (stage) {
    case "INITIAL":
      // 🔥 1단계: 초기 접수
      await db.collection("disputes").doc(disputeId).update({
        stage: "INITIAL",
        autoResponse: template.initial,
        autoResponseAt: FieldValue.serverTimestamp(),
        slaFirstResponse: Timestamp.fromDate(
          new Date(Date.now() + SLA_FIRST_RESPONSE_MINUTES * 60 * 1000)
        ),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 🔥 사용자에게 자동 답변 알림
      await notify(dispute.userId, {
        type: "JOIN_APPROVED", // 임시 타입
        title: "문의 접수 완료",
        body: template.initial,
        postId: dispute.postId || "",
      });

      logger.info("[processDisputeWorkflow] 초기 접수 처리:", { disputeId, disputeType });
      break;

    case "INVESTIGATION":
      // 🔥 2단계: 조사 중
      await db.collection("disputes").doc(disputeId).update({
        stage: "INVESTIGATION",
        autoResponse: template.investigation,
        autoResponseAt: FieldValue.serverTimestamp(),
        investigationStartedAt: FieldValue.serverTimestamp(),
        slaResolution: Timestamp.fromDate(
          new Date(Date.now() + SLA_RESOLUTION_HOURS * 60 * 60 * 1000)
        ),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 🔥 사용자에게 조사 중 알림
      await notify(dispute.userId, {
        type: "JOIN_APPROVED", // 임시 타입
        title: "조사 진행 중",
        body: template.investigation,
        postId: dispute.postId || "",
      });

      logger.info("[processDisputeWorkflow] 조사 중 처리:", { disputeId, disputeType });
      break;

    case "RESOLUTION":
      // 🔥 3단계: 해결 완료
      await db.collection("disputes").doc(disputeId).update({
        stage: "RESOLUTION",
        autoResponse: template.resolution,
        autoResponseAt: FieldValue.serverTimestamp(),
        resolvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 🔥 사용자에게 해결 완료 알림
      await notify(dispute.userId, {
        type: "JOIN_APPROVED", // 임시 타입
        title: "문의 해결 완료",
        body: template.resolution,
        postId: dispute.postId || "",
      });

      logger.info("[processDisputeWorkflow] 해결 완료 처리:", { disputeId, disputeType });
      break;

    case "ESCALATED":
      // 🔥 에스컬레이션
      await db.collection("disputes").doc(disputeId).update({
        stage: "ESCALATED",
        escalatedAt: FieldValue.serverTimestamp(),
        escalatedTo: "ADMIN",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 🔥 관리자에게 에스컬레이션 알림
      // (관리자 알림 시스템 연동 필요)

      logger.warn("[processDisputeWorkflow] 에스컬레이션:", { disputeId, disputeType });
      break;
  }
}

/**
 * SLA 체크 및 에스컬레이션
 */
async function checkSLAAndEscalate(): Promise<void> {
  const now = Timestamp.now();

  // 🔥 첫 응답 SLA 초과 분쟁 조회
  const overdueFirstResponse = await db
    .collection("disputes")
    .where("stage", "==", "INITIAL")
    .where("slaFirstResponse", "<=", now)
    .limit(50)
    .get();

  for (const doc of overdueFirstResponse.docs) {
    const dispute = doc.data();
    await processDisputeWorkflow(doc.id, dispute, "INVESTIGATION");
    logger.warn("[checkSLAAndEscalate] 첫 응답 SLA 초과, 조사 단계로 전환:", {
      disputeId: doc.id,
    });
  }

  // 🔥 해결 SLA 초과 분쟁 조회
  const overdueResolution = await db
    .collection("disputes")
    .where("stage", "==", "INVESTIGATION")
    .where("slaResolution", "<=", now)
    .limit(50)
    .get();

  for (const doc of overdueResolution.docs) {
    const dispute = doc.data();
    const investigationHours = dispute.investigationStartedAt
      ? (now.toMillis() - dispute.investigationStartedAt.toMillis()) / (1000 * 60 * 60)
      : 0;

    // 🔥 48시간 초과 시 에스컬레이션
    if (investigationHours >= SLA_ESCALATION_HOURS) {
      await processDisputeWorkflow(doc.id, dispute, "ESCALATED");
      logger.warn("[checkSLAAndEscalate] 해결 SLA 초과, 에스컬레이션:", {
        disputeId: doc.id,
        investigationHours,
      });
    }
  }
}

/**
 * 분쟁 생성 시 자동 처리
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

    logger.info("[onDisputeCreated] 분쟁 생성 감지:", { disputeId });

    try {
      // 🔥 초기 접수 처리
      await processDisputeWorkflow(disputeId, dispute, "INITIAL");
    } catch (error: any) {
      logger.error("[onDisputeCreated] 분쟁 처리 실패:", {
        disputeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * 분쟁 업데이트 시 자동 처리
 */
export const onDisputeUpdated = onDocumentUpdated(
  {
    document: "disputes/{disputeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const disputeId = event.params.disputeId;

    // 🔥 관리자가 단계를 수동으로 변경한 경우
    if (before.stage !== after.stage && after.stage) {
      logger.info("[onDisputeUpdated] 분쟁 단계 변경:", {
        disputeId,
        beforeStage: before.stage,
        afterStage: after.stage,
      });

      try {
        await processDisputeWorkflow(disputeId, after, after.stage as DisputeStage);
      } catch (error: any) {
        logger.error("[onDisputeUpdated] 분쟁 처리 실패:", {
          disputeId,
          error: error.message,
        });
      }
    }
  }
);

/**
 * SLA 체크 스케줄러 (10분마다)
 */
import { onSchedule } from "firebase-functions/v2/scheduler";

export const checkSLAScheduler = onSchedule(
  { schedule: "*/10 * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[checkSLAScheduler] SLA 체크 시작");
    try {
      await checkSLAAndEscalate();
      logger.info("[checkSLAScheduler] SLA 체크 완료");
    } catch (error: any) {
      logger.error("[checkSLAScheduler] SLA 체크 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
