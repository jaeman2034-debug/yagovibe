/**
 * 🔥 QR 토큰 발급
 * Phase 1-4: 선수별 QR 토큰 생성
 * 
 * - ADMIN 또는 운영 권한만 호출 권장
 * - playerId 기준 1회 발급(재발급 시 기존 토큰 REVOKED 가능)
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import * as crypto from "crypto";

const db = admin.firestore();

export const issueQrToken = onRequest(
  { region: "asia-northeast3", cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!idToken) {
        res.status(401).json({ error: "NO_AUTH" });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;

      const { associationId, tournamentId, playerId } = req.body ?? {};
      if (!associationId || !tournamentId || !playerId) {
        res.status(400).json({ error: "MISSING_PARAMS" });
        return;
      }

      // 🔥 승인된 선수만 토큰 발급 가능
      const playerRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/players/${playerId}`
      );
      const playerSnap = await playerRef.get();

      if (!playerSnap.exists) {
        res.status(404).json({ error: "PLAYER_NOT_FOUND" });
        return;
      }

      const playerData = playerSnap.data();
      if (playerData?.approvalStatus !== "approved") {
        res.status(403).json({ 
          error: "NOT_APPROVED",
          message: "승인된 선수만 QR 토큰을 발급받을 수 있습니다."
        });
        return;
      }

      // 원문 토큰 생성 (클라이언트에만 전달)
      const rawToken = crypto.randomBytes(16).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      // 🔥 토큰은 tokenHash를 문서 ID로 사용 (1회성 보장)
      const tokenRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/qrTokens/${tokenHash}`
      );

      // 만료 시간 (5분)
      const expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 5 * 60 * 1000)
      );

      await tokenRef.set({
        playerId,
        teamId: playerData.teamId,
        used: false,
        expiresAt,
        issuedAt: admin.firestore.FieldValue.serverTimestamp(),
        issuedBy: decoded.uid,
      });

      res.json({
        ok: true,
        token: rawToken, // ⚠️ 이 값만 QR로 인코딩
        expiresIn: 300, // 5분 (초)
      });
      return;
    } catch (e) {
      console.error("issueQrToken 오류:", e);
      res.status(500).json({ error: "INTERNAL" });
      return;
    }
  }
);

