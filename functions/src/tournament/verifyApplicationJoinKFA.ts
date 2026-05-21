/**
 * 🔥 JoinKFA 자동 검증
 * Phase 1-4: 참가 신청 검증
 * 
 * - 참가 신청(applications) 생성 시 호출하거나, 관리자 화면에서 수동 재검증 버튼으로 호출
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { verifyJoinKfaEligibility } from "../lib/joinKfa";

const db = admin.firestore();

export const verifyApplicationJoinKFA = onRequest(
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
        res.status(401).json({ error: "Missing Authorization Bearer token" });
        return;
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      // 여기서 decoded.role 같은 커스텀 클레임으로 ADMIN만 허용하는 걸 권장
      // 일단은 로그인만 확인
      void decoded;

      const { associationId, tournamentId, applicationId } = req.body ?? {};
      if (!associationId || !tournamentId || !applicationId) {
        res.status(400).json({ error: "Missing associationId/tournamentId/applicationId" });
        return;
      }

      const appRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
      );
      const snap = await appRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      const appData = snap.data() as any;

      // 실제 JoinKFA 연동은 여기(verifyJoinKfaEligibility)에서 처리
      const result = await verifyJoinKfaEligibility(appData);

      await appRef.set(
        {
          status: result.status, // APPROVED | HOLD | REJECTED
          statusReason: result.reason ?? null,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({ ok: true, ...result });
      return;
    } catch (e) {
      console.error("verifyApplicationJoinKFA 오류:", e);
      res.status(500).json({ error: "INTERNAL" });
      return;
    }
  }
);

