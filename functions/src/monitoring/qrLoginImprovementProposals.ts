/**
 * 🏆 QR 로그인 영구 개선 제안 시스템
 * 
 * 실험 결과가 Positive일 때 영구 적용 제안을 자동으로 생성하고,
 * 관리자 승인 후 영구 설정에 반영
 * 
 * 안전장치:
 * - 자동 변경 금지
 * - 승인 시에만 반영
 * - 명확한 근거 포함
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { QRLoginExperimentResult } from "./qrLoginExperimentAnalysis";

const db = getFirestore();

/**
 * 개선 제안 구조
 */
export interface ImprovementProposal {
  flag: "smsUXVariant_v2" | "extendedExpire" | "mobileUXBoost";
  recommendation: "apply_permanently" | "reject" | "needs_review";
  rationale: {
    successRateDelta: number;
    smsFailRateDelta: number;
    avgDurationDelta: number;
    expiredRateDelta: number;
    sampleSize: number;
    confidence: number;
  };
  experimentId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  rejectedAt?: Timestamp;
  rejectedBy?: string;
  rejectionReason?: string;
}

/**
 * 영구 개선 제안 생성
 * 
 * @param experimentResult 실험 결과
 * @returns 제안 ID
 */
export async function createImprovementProposal(
  experimentResult: QRLoginExperimentResult
): Promise<string | null> {
  // Positive 판정이 아니면 제안 생성 안 함
  if (experimentResult.verdict !== "positive") {
    logger.info("⏭️ [qrLoginImprovementProposals] Positive 판정 아님 → 제안 생성 스킵");
    return null;
  }

  // 신뢰도가 너무 낮으면 제안 생성 안 함 (0.5 미만)
  if (experimentResult.confidence < 0.5) {
    logger.info("⏭️ [qrLoginImprovementProposals] 신뢰도 낮음 → 제안 생성 스킵", {
      confidence: experimentResult.confidence,
    });
    return null;
  }

  // 이미 같은 flag로 pending 제안이 있으면 스킵
  const existingProposals = await db
    .collection("improvementProposals")
    .where("flag", "==", experimentResult.flag)
    .where("status", "==", "pending")
    .get();

  if (!existingProposals.empty) {
    logger.info("⏭️ [qrLoginImprovementProposals] 이미 pending 제안 존재 → 스킵", {
      flag: experimentResult.flag,
    });
    return null;
  }

  const proposalRef = db.collection("improvementProposals").doc();
  const proposalId = proposalRef.id;

  const proposal: ImprovementProposal = {
    flag: experimentResult.flag as ImprovementProposal["flag"],
    recommendation: "apply_permanently",
    rationale: {
      successRateDelta: experimentResult.delta.successRate,
      smsFailRateDelta: experimentResult.delta.smsFailRate,
      avgDurationDelta: experimentResult.delta.avgDuration,
      expiredRateDelta: experimentResult.delta.expiredRate,
      sampleSize: experimentResult.after.sampleSize,
      confidence: experimentResult.confidence,
    },
    experimentId: experimentResult.experimentId,
    status: "pending",
    createdAt: Timestamp.now(),
  };

  await proposalRef.set(proposal);

  logger.info("🏆 [qrLoginImprovementProposals] 개선 제안 생성 완료:", {
    proposalId,
    flag: proposal.flag,
    experimentId: experimentResult.experimentId,
  });

  return proposalId;
}

/**
 * 개선 제안 승인
 * 
 * @param proposalId 제안 ID
 * @param approvedBy 승인자 UID
 * @returns 성공 여부
 */
export async function approveImprovementProposal(
  proposalId: string,
  approvedBy: string
): Promise<boolean> {
  try {
    const proposalRef = db.collection("improvementProposals").doc(proposalId);
    const proposalSnap = await proposalRef.get();

    if (!proposalSnap.exists) {
      logger.warn("⚠️ [qrLoginImprovementProposals] 제안 문서 없음:", proposalId);
      return false;
    }

    const proposal = proposalSnap.data() as ImprovementProposal;

    if (proposal.status !== "pending") {
      logger.warn("⚠️ [qrLoginImprovementProposals] 이미 처리된 제안:", {
        proposalId,
        status: proposal.status,
      });
      return false;
    }

    // 영구 설정 반영
    const configRef = db.doc("config/qrLogin");
    const update: any = {};

    switch (proposal.flag) {
      case "smsUXVariant_v2":
        update.smsUXVariant = "v2";
        update.smsUXVariantEnabledAt = Timestamp.now();
        break;
      case "extendedExpire":
        update.extendedExpireSec = 60;
        update.extendedExpireEnabledAt = Timestamp.now();
        break;
      case "mobileUXBoost":
        update.mobileUXBoost = true;
        update.mobileUXBoostEnabledAt = Timestamp.now();
        break;
    }

    // 영구 설정 업데이트
    await configRef.set(update, { merge: true });

    // 제안 상태 업데이트
    await proposalRef.update({
      status: "approved",
      approvedAt: Timestamp.now(),
      approvedBy,
    });

    logger.info("✅ [qrLoginImprovementProposals] 개선 제안 승인 완료:", {
      proposalId,
      flag: proposal.flag,
      approvedBy,
    });

    return true;
  } catch (error: any) {
    logger.error("❌ [qrLoginImprovementProposals] 제안 승인 실패:", {
      proposalId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * 개선 제안 반려
 * 
 * @param proposalId 제안 ID
 * @param rejectedBy 반려자 UID
 * @param rejectionReason 반려 사유
 * @returns 성공 여부
 */
export async function rejectImprovementProposal(
  proposalId: string,
  rejectedBy: string,
  rejectionReason?: string
): Promise<boolean> {
  try {
    const proposalRef = db.collection("improvementProposals").doc(proposalId);
    const proposalSnap = await proposalRef.get();

    if (!proposalSnap.exists) {
      logger.warn("⚠️ [qrLoginImprovementProposals] 제안 문서 없음:", proposalId);
      return false;
    }

    const proposal = proposalSnap.data() as ImprovementProposal;

    if (proposal.status !== "pending") {
      logger.warn("⚠️ [qrLoginImprovementProposals] 이미 처리된 제안:", {
        proposalId,
        status: proposal.status,
      });
      return false;
    }

    await proposalRef.update({
      status: "rejected",
      rejectedAt: Timestamp.now(),
      rejectedBy,
      rejectionReason: rejectionReason || "관리자 반려",
    });

    logger.info("❌ [qrLoginImprovementProposals] 개선 제안 반려 완료:", {
      proposalId,
      flag: proposal.flag,
      rejectedBy,
      rejectionReason,
    });

    return true;
  } catch (error: any) {
    logger.error("❌ [qrLoginImprovementProposals] 제안 반려 실패:", {
      proposalId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * 현재 pending 제안 목록 조회
 */
export async function getPendingProposals(): Promise<ImprovementProposal[]> {
  try {
    const proposalsRef = db.collection("improvementProposals");
    const pendingQuery = proposalsRef
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc");

    const pendingSnap = await pendingQuery.get();
    return pendingSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ImprovementProposal[];
  } catch (error: any) {
    logger.error("❌ [qrLoginImprovementProposals] 제안 목록 조회 실패:", {
      error: error.message,
    });
    return [];
  }
}
