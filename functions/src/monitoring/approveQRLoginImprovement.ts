/**
 * ✅ QR 로그인 개선 제안 승인/반려 (Callable Function)
 * 
 * 관리자가 개선 제안을 승인하거나 반려하는 함수
 * 
 * 안전장치:
 * - 관리자 권한 필수
 * - 승인 시에만 영구 설정 반영
 */

import { onCall } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import {
  approveImprovementProposal,
  rejectImprovementProposal,
  getPendingProposals,
} from "./qrLoginImprovementProposals";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

/**
 * 관리자 권한 확인
 */
async function isAdmin(uid: string): Promise<boolean> {
  try {
    const user = await getAuth().getUser(uid);
    const customClaims = user.customClaims || {};
    return customClaims.admin === true || customClaims.role === "admin";
  } catch (error: any) {
    logger.error("❌ [approveQRLoginImprovement] 사용자 조회 실패:", {
      uid,
      error: error.message,
    });
    return false;
  }
}

/**
 * 개선 제안 승인
 */
export const approveQRLoginImprovement = onCall(
  {
    region: "asia-northeast3",
  },
  async (request) => {
    const { proposalId } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
      throw new Error("인증이 필요합니다.");
    }

    if (!proposalId) {
      throw new Error("제안 ID가 필요합니다.");
    }

    // 관리자 권한 확인
    const admin = await isAdmin(uid);
    if (!admin) {
      throw new Error("관리자 권한이 필요합니다.");
    }

    logger.info("✅ [approveQRLoginImprovement] 개선 제안 승인 요청:", {
      proposalId,
      approvedBy: uid,
    });

    const success = await approveImprovementProposal(proposalId, uid);

    if (!success) {
      throw new Error("제안 승인에 실패했습니다.");
    }

    return {
      success: true,
      message: "개선 제안이 승인되었습니다.",
    };
  }
);

/**
 * 개선 제안 반려
 */
export const rejectQRLoginImprovement = onCall(
  {
    region: "asia-northeast3",
  },
  async (request) => {
    const { proposalId, rejectionReason } = request.data;
    const uid = request.auth?.uid;

    if (!uid) {
      throw new Error("인증이 필요합니다.");
    }

    if (!proposalId) {
      throw new Error("제안 ID가 필요합니다.");
    }

    // 관리자 권한 확인
    const admin = await isAdmin(uid);
    if (!admin) {
      throw new Error("관리자 권한이 필요합니다.");
    }

    logger.info("❌ [rejectQRLoginImprovement] 개선 제안 반려 요청:", {
      proposalId,
      rejectedBy: uid,
      rejectionReason,
    });

    const success = await rejectImprovementProposal(proposalId, uid, rejectionReason);

    if (!success) {
      throw new Error("제안 반려에 실패했습니다.");
    }

    return {
      success: true,
      message: "개선 제안이 반려되었습니다.",
    };
  }
);

/**
 * pending 제안 목록 조회
 */
export const getQRLoginPendingProposals = onCall(
  {
    region: "asia-northeast3",
  },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new Error("인증이 필요합니다.");
    }

    // 관리자 권한 확인
    const admin = await isAdmin(uid);
    if (!admin) {
      throw new Error("관리자 권한이 필요합니다.");
    }

    const proposals = await getPendingProposals();

    return {
      success: true,
      proposals: proposals.map((p) => ({
        id: p.flag, // 실제로는 proposalId를 반환해야 함
        ...p,
      })),
    };
  }
);
