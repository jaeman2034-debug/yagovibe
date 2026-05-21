/**
 * 🔐 QR 초대 토큰 생성 Cloud Function
 * 
 * 역할:
 * - QR 초대 토큰 생성
 * - 현장용/온라인용 구분
 * - 만료 시간 및 사용 횟수 설정
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeAuditLog } from "./utils/auditLog";

const db = getFirestore();

interface GenerateInviteTokenRequest {
  teamId: string;
  role: "member" | "coach" | "staff";
  context: "on-site" | "online";
  maxUses?: number;  // 온라인용만
  expiresInHours?: number;  // 커스텀 만료 시간
}

interface GenerateInviteTokenResponse {
  tokenId: string;
  qrUrl: string;
  expiresAt: Timestamp;
  maxUses?: number;
}

/**
 * 토큰 ID 생성 (안전한 랜덤 문자열)
 */
function generateTokenId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const generateInviteToken = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<GenerateInviteTokenResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [generateInviteToken] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = auth.uid;
    const { teamId, role, context, maxUses, expiresInHours } = data as GenerateInviteTokenRequest;

    // 2️⃣ 입력 검증
    if (!teamId || !role || !context) {
      throw new HttpsError("invalid-argument", "필수 파라미터가 누락되었습니다.");
    }

    // 3️⃣ 역할 검증
    const validRoles = ["member", "coach", "staff"];
    if (!validRoles.includes(role)) {
      throw new HttpsError("invalid-argument", "유효하지 않은 역할입니다.");
    }

    // 4️⃣ 생성자 권한 확인
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const teamData = teamSnap.data()!;
    
    // 팀 소유자 확인
    if (teamData.ownerId !== uid) {
      // 멤버 권한 확인
      const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
      const memberSnap = await memberRef.get();
      
      if (!memberSnap.exists) {
        throw new HttpsError("permission-denied", "팀 멤버만 초대 토큰을 생성할 수 있습니다.");
      }

      const memberData = memberSnap.data()!;
      const userRole = memberData.role;

      // 역할별 QR 생성 권한 확인
      if (userRole === "member") {
        throw new HttpsError("permission-denied", "일반 멤버는 QR 초대 토큰을 생성할 수 없습니다.");
      }

      if (userRole === "coach" && (role === "coach" || role === "admin")) {
        throw new HttpsError("permission-denied", "코치는 member와 staff만 초대할 수 있습니다.");
      }
    }

    // 5️⃣ 만료 시간 계산
    let expiresIn: number;
    if (expiresInHours) {
      expiresIn = expiresInHours * 60 * 60 * 1000;
    } else if (context === "on-site") {
      expiresIn = 60 * 60 * 1000; // 1시간
    } else {
      expiresIn = 30 * 24 * 60 * 60 * 1000; // 30일
    }

    const expiresAt = Timestamp.fromDate(new Date(Date.now() + expiresIn));

    // 6️⃣ 최대 사용 횟수 설정
    let finalMaxUses: number | null = null;
    if (context === "on-site") {
      finalMaxUses = 1; // 현장용은 단일 사용
    } else if (maxUses) {
      finalMaxUses = maxUses; // 온라인용은 지정된 횟수
    } else {
      finalMaxUses = 100; // 기본값: 100회
    }

    // 7️⃣ 토큰 생성
    const tokenId = generateTokenId();
    const tokenRef = db.doc(`invite_tokens/${tokenId}`);

    const tokenData = {
      tokenId,
      teamId,
      createdBy: uid,
      role,
      context,
      expiresAt,
      maxUses: finalMaxUses,
      usedCount: 0,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      usedBy: [],
    };

    await tokenRef.set(tokenData);

    // 8️⃣ 감사 로그
    await writeAuditLog({
      action: "generate_invite_token",
      userId: uid,
      teamId,
      metadata: {
        tokenId,
        role,
        context,
        expiresAt: expiresAt.toDate().toISOString(),
        maxUses: finalMaxUses,
      },
    });

    logger.info("✅ [generateInviteToken] 토큰 생성 완료", {
      tokenId,
      teamId,
      role,
      context,
      expiresAt: expiresAt.toDate().toISOString(),
    });

    // 9️⃣ QR URL 생성
    const qrUrl = `qr.yago.app/invite?token=${tokenId}`;
    // 또는: `${window.location.origin}/qr/preview?token=${tokenId}`

    return {
      tokenId,
      qrUrl,
      expiresAt,
      maxUses: finalMaxUses || undefined,
    };
  }
);

