/**
 * 🔥 SLA 에스컬레이션 강화 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 90초 무응답 → 봇 자동 응답
 * - 8분 → 상담원 연결
 * - 25분 → 리드 에스컬레이션
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { db, FieldValue, Timestamp } from "../firebase";
import { notify } from "../notifications";
import { AUTO_RESPONSE_TEMPLATES } from "./autoResponseV2";

// 🔥 SLA 에스컬레이션 시간 (완전 운영)
const SLA_BOT_RESPONSE_SECONDS = 15; // 15초 → 봇 자동 응답 (18초 → 15초로 강화)
const SLA_AGENT_ESCALATION_MINUTES = 6; // 6분 → 상담원 연결
const SLA_LEAD_ESCALATION_MINUTES = 20; // 20분 → 리드 에스컬레이션
const SLA_COMPENSATION_MINUTES = 60; // 60분 → 보상 트리거
const SLA_COUPON_MINUTES = 20; // 20분 → 쿠폰 지급

/**
 * 15초 무응답 → 봇 자동 응답 (18초 → 15초로 강화)
 */
async function escalateToBot(): Promise<void> {
  const now = Timestamp.now();
  const fifteenSecondsAgo = Timestamp.fromDate(
    new Date(Date.now() - SLA_BOT_RESPONSE_SECONDS * 1000)
  );

  // 🔥 15초 이상 응답 없는 분쟁 조회
  const unrespondedDisputes = await db
    .collection("disputes")
    .where("stage", "==", "INITIAL")
    .where("createdAt", "<=", fifteenSecondsAgo)
    .where("botResponded", "!=", true)
    .limit(50)
    .get();

  for (const doc of unrespondedDisputes.docs) {
    const dispute = doc.data();
    const disputeType = dispute.type || "OTHER";
    const template = AUTO_RESPONSE_TEMPLATES[disputeType as keyof typeof AUTO_RESPONSE_TEMPLATES];

    // 🔥 봇 자동 응답 발송
    await db.collection("disputes").doc(doc.id).update({
      botResponded: true,
      botRespondedAt: FieldValue.serverTimestamp(),
      autoResponse: template.initial,
      autoResponseAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 🔥 사용자에게 봇 응답 알림
    await notify(dispute.userId, {
      type: "JOIN_APPROVED", // 임시 타입
      title: "문의 접수 완료",
      body: template.initial,
      postId: dispute.postId || "",
    });

    logger.info("[escalateToBot] 봇 자동 응답 발송:", {
      disputeId: doc.id,
      type: disputeType,
    });
  }
}

/**
 * 6분 → 상담원 연결 (8분 → 6분으로 강화)
 */
async function escalateToAgent(): Promise<void> {
  const now = Timestamp.now();
  const sixMinutesAgo = Timestamp.fromDate(
    new Date(Date.now() - SLA_AGENT_ESCALATION_MINUTES * 60 * 1000)
  );

  // 🔥 6분 이상 응답 없는 분쟁 조회
  const unrespondedDisputes = await db
    .collection("disputes")
    .where("stage", "==", "INITIAL")
    .where("createdAt", "<=", sixMinutesAgo)
    .where("agentAssigned", "!=", true)
    .limit(50)
    .get();

  for (const doc of unrespondedDisputes.docs) {
    const dispute = doc.data();

    // 🔥 상담원 큐에 등록
    await db.collection("csQueue").add({
      disputeId: doc.id,
      priority: dispute.priority || "MEDIUM",
      type: dispute.type || "OTHER",
      escalatedFrom: "SLA_8MIN",
      createdAt: FieldValue.serverTimestamp(),
      status: "PENDING",
    });

    // 🔥 분쟁 문서 업데이트
    await db.collection("disputes").doc(doc.id).update({
      agentAssigned: true,
      agentAssignedAt: FieldValue.serverTimestamp(),
      stage: "INVESTIGATION",
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info("[escalateToAgent] 상담원 연결:", {
      disputeId: doc.id,
      priority: dispute.priority,
    });
  }
}

/**
 * 20분 → 리드 에스컬레이션 (25분 → 20분으로 강화)
 */
async function escalateToLead(): Promise<void> {
  const now = Timestamp.now();
  const twentyMinutesAgo = Timestamp.fromDate(
    new Date(Date.now() - SLA_LEAD_ESCALATION_MINUTES * 60 * 1000)
  );

  // 🔥 20분 이상 응답 없는 분쟁 조회
  const unrespondedDisputes = await db
    .collection("disputes")
    .where("stage", "==", "INVESTIGATION")
    .where("createdAt", "<=", twentyMinutesAgo)
    .where("leadEscalated", "!=", true)
    .limit(50)
    .get();

  for (const doc of unrespondedDisputes.docs) {
    const dispute = doc.data();

    // 🔥 리드 큐에 등록
    await db.collection("csLeadQueue").add({
      disputeId: doc.id,
      priority: "CRITICAL",
      type: dispute.type || "OTHER",
      escalatedFrom: "SLA_25MIN",
      createdAt: FieldValue.serverTimestamp(),
      status: "PENDING",
    });

    // 🔥 분쟁 문서 업데이트
    await db.collection("disputes").doc(doc.id).update({
      leadEscalated: true,
      leadEscalatedAt: FieldValue.serverTimestamp(),
      stage: "ESCALATED",
      escalatedTo: "LEAD",
      priority: "CRITICAL",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 🔥 사용자에게 리드 에스컬레이션 알림
    await notify(dispute.userId, {
      type: "JOIN_APPROVED", // 임시 타입
      title: "에스컬레이션 안내",
      body: "문의가 리드에게 에스컬레이션되었습니다. 빠른 시일 내에 처리하겠습니다.",
      postId: dispute.postId || "",
    });

    logger.warn("[escalateToLead] 리드 에스컬레이션:", {
      disputeId: doc.id,
      priority: "CRITICAL",
    });
  }
}

/**
 * 20분 → 쿠폰 지급
 */
async function triggerCoupon(): Promise<void> {
  const now = Timestamp.now();
  const twentyMinutesAgo = Timestamp.fromDate(
    new Date(Date.now() - SLA_COUPON_MINUTES * 60 * 1000)
  );

  // 🔥 20분 이상 미해결 분쟁 조회
  const delayedDisputes = await db
    .collection("disputes")
    .where("stage", "!=", "RESOLUTION")
    .where("stage", "!=", "CLOSED")
    .where("createdAt", "<=", twentyMinutesAgo)
    .where("couponIssued", "!=", true)
    .limit(50)
    .get();

  for (const doc of delayedDisputes.docs) {
    const dispute = doc.data();

    // 🔥 쿠폰 지급 설정
    await db.collection("disputes").doc(doc.id).update({
      couponIssued: true,
      couponIssuedAt: FieldValue.serverTimestamp(),
      couponAmount: 3000, // 기본 쿠폰 3,000원
      couponReason: "SLA_20MIN_DELAY",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 🔥 사용자에게 쿠폰 안내
    await notify(dispute.userId, {
      type: "JOIN_APPROVED", // 임시 타입
      title: "지연 보상 쿠폰",
      body: "문의 처리 지연으로 인해 3,000원 쿠폰이 지급되었습니다.",
      postId: dispute.postId || "",
    });

    logger.info("[triggerCoupon] 쿠폰 지급:", {
      disputeId: doc.id,
      couponAmount: 3000,
    });
  }
}

/**
 * 60분 → 보상 트리거
 */
async function triggerCompensation(): Promise<void> {
  const now = Timestamp.now();
  const sixtyMinutesAgo = Timestamp.fromDate(
    new Date(Date.now() - SLA_COMPENSATION_MINUTES * 60 * 1000)
  );

  // 🔥 60분 이상 미해결 분쟁 조회
  const unresolvedDisputes = await db
    .collection("disputes")
    .where("stage", "!=", "RESOLUTION")
    .where("stage", "!=", "CLOSED")
    .where("createdAt", "<=", sixtyMinutesAgo)
    .where("compensationTriggered", "!=", true)
    .limit(50)
    .get();

  for (const doc of unresolvedDisputes.docs) {
    const dispute = doc.data();

    // 🔥 보상 트리거 설정
    await db.collection("disputes").doc(doc.id).update({
      compensationTriggered: true,
      compensationTriggeredAt: FieldValue.serverTimestamp(),
      compensationAmount: 5000, // 기본 보상 5,000원
      compensationReason: "SLA_60MIN_EXCEEDED",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 🔥 사용자에게 보상 안내
    await notify(dispute.userId, {
      type: "JOIN_APPROVED", // 임시 타입
      title: "보상 안내",
      body: "문의 처리 지연으로 인해 5,000원의 보상이 지급됩니다. 빠른 시일 내에 해결하겠습니다.",
      postId: dispute.postId || "",
    });

    logger.warn("[triggerCompensation] 보상 트리거:", {
      disputeId: doc.id,
      compensationAmount: 5000,
    });
  }
}

/**
 * SLA 에스컬레이션 스케줄러 (1분마다)
 */
export const slaEscalationScheduler = onSchedule(
  { schedule: "* * * * *", timeZone: "Asia/Seoul", retryCount: 1 },
  async () => {
    logger.info("[slaEscalationScheduler] SLA 에스컬레이션 체크 시작");

    try {
      // 🔥 90초 무응답 → 봇 자동 응답
      await escalateToBot();

      // 🔥 8분 → 상담원 연결
      await escalateToAgent();

      // 🔥 25분 → 리드 에스컬레이션
      await escalateToLead();

      logger.info("[slaEscalationScheduler] SLA 에스컬레이션 체크 완료");
    } catch (error: any) {
      logger.error("[slaEscalationScheduler] SLA 에스컬레이션 체크 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
