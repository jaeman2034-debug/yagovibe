/**
 * 🔥 QR 검증 + checkin write 연결
 * Phase 1-4: 현장 운영 핵심
 * 
 * - 심판(로그인 사용자)만 호출 가능
 * - 토큰 검증 + 이미 검인 여부 체크 + 체크인 기록을 서버에서 원자적으로 생성
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import * as crypto from "crypto";

const db = admin.firestore();

export const qrVerifyAndCheckin = onRequest(
  { region: "asia-northeast3", cors: true },
  async (req, res): Promise<void> => {
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
      const uid = decoded.uid;

      const { associationId, tournamentId, matchId, qrToken } = req.body ?? {};
      
      if (!associationId || !tournamentId || !qrToken) {
        res.status(400).json({ error: "Missing associationId/tournamentId/qrToken" });
        return;
      }

      // 🔥 관리자 권한 확인 (경기별 체크인인 경우 심판 권한도 확인)
      const associationRef = db.collection("associations").doc(associationId);
      const associationSnap = await associationRef.get();

      if (!associationSnap.exists) {
        res.status(404).json({ error: "Association not found" });
        return;
      }

      const associationData = associationSnap.data();
      const isAdmin =
        (associationData?.adminUids && associationData.adminUids.includes(uid)) ||
        (decoded.role === "ADMIN" && decoded.associationId === associationId);

      // 경기별 체크인인 경우 심판 권한도 확인
      if (matchId) {
        const matchRef = db.doc(
          `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}`
        );
        const matchSnap = await matchRef.get();
        
        if (matchSnap.exists) {
          const match = matchSnap.data() as any;
          const referees = match.referees || {};
          const refereeIds: string[] = [
            referees.main,
            referees.assistant1,
            referees.assistant2,
          ].filter((id): id is string => !!id);

          // 관리자이거나 배정된 심판이면 허용
          if (!isAdmin && !refereeIds.includes(uid)) {
            res.status(403).json({ error: "Not authorized for this match" });
            return;
          }
        }
      } else {
        // 전체 체크인은 관리자만 가능
        if (!isAdmin) {
          res.status(403).json({ error: "Admin permission required" });
          return;
        }
      }

      // 2) QR 토큰 검증: tokenHash를 문서 ID로 사용
      const tokenHash = crypto.createHash("sha256").update(String(qrToken)).digest("hex");

      const tokenRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/qrTokens/${tokenHash}`
      );
      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        res.status(400).json({ error: "INVALID_QR", message: "유효하지 않은 QR 코드입니다." });
        return;
      }

      const tokenData = tokenSnap.data() as any;
      const playerId: string = tokenData.playerId;

      // 🔥 승인된 선수만 체크인 가능 (이중 확인)
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
          message: "승인된 선수만 체크인할 수 있습니다."
        });
        return;
      }

      // 만료 체크
      if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
        res.status(400).json({ error: "QR_TOKEN_EXPIRED", message: "QR 코드가 만료되었습니다." });
        return;
      }

      // 재사용 방지
      if (tokenData.used === true) {
        res.status(400).json({ error: "ALREADY_USED", message: "이미 사용된 QR 코드입니다." });
        return;
      }

      // 3) 체크인 중복 방지 + 기록 생성 (트랜잭션)
      const checkinsCol = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/checkins`
      );
      
      // 경기별 체크인인 경우 matchId 포함, 전체 체크인인 경우 null
      const checkinId = matchId ? `${matchId}_${playerId}` : playerId;
      const checkinRef = checkinsCol.doc(checkinId);

      await db.runTransaction(async (tx) => {
        // 체크인 중복 확인
        const existingCheckin = await tx.get(checkinRef);
        if (existingCheckin.exists) {
          throw Object.assign(new Error("ALREADY_CHECKED_IN"), { code: "ALREADY_CHECKED_IN" });
        }

        // 토큰 사용 처리 확인
        const tokenDataInTx = await tx.get(tokenRef);
        if (!tokenDataInTx.exists || tokenDataInTx.data()?.used === true) {
          throw Object.assign(new Error("TOKEN_ALREADY_USED"), { code: "TOKEN_ALREADY_USED" });
        }

        // 체크인 기록 생성
        tx.set(checkinRef, {
          playerId,
          teamId: tokenData.teamId || playerData.teamId,
          matchId: matchId || null,
          method: "QR",
          checkedAt: admin.firestore.FieldValue.serverTimestamp(),
          checkedByUid: uid,
        });

        // 토큰 사용 처리
        tx.update(tokenRef, {
          used: true,
          usedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Roster 업데이트 (경기별 체크인인 경우)
        if (matchId) {
          const rostersCol = db.collection(
            `associations/${associationId}/tournaments/${tournamentId}/matches/${matchId}/rosters`
          );
          const rosterQuery = await rostersCol.where("playerId", "==", playerId).limit(1).get();
          if (!rosterQuery.empty) {
            const rosterRef = rosterQuery.docs[0].ref;
            tx.update(rosterRef, {
              checked: true,
            });
          }
        }
      });

      res.json({ 
        ok: true, 
        playerId,
        playerName: playerData.name,
        teamName: playerData.teamName,
        message: "체크인 완료"
      });
    } catch (e: any) {
      if (e?.code === "ALREADY_CHECKED_IN" || e?.message === "ALREADY_CHECKED_IN") {
        res.status(409).json({ 
          error: "ALREADY_CHECKED_IN",
          message: "이미 체크인된 선수입니다."
        });
        return;
      }
      if (e?.code === "TOKEN_ALREADY_USED" || e?.message === "TOKEN_ALREADY_USED") {
        res.status(400).json({ 
          error: "TOKEN_ALREADY_USED",
          message: "이미 사용된 QR 코드입니다."
        });
        return;
      }
      console.error("qrVerifyAndCheckin 오류:", e);
      res.status(500).json({ 
        error: "INTERNAL",
        message: e?.message || "체크인 처리 중 오류가 발생했습니다."
      });
      return;
    }
  }
);

