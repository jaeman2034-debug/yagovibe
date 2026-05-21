/**
 * 🔥 대회 엑셀 Export (Callable Function)
 * 
 * 참가팀 요약 + 선수 명단을 엑셀 파일로 생성
 * Storage 업로드 후 Signed URL 반환
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as ExcelJS from "exceljs";
import { Storage } from "@google-cloud/storage";

const db = admin.firestore();
const storage = new Storage();

/**
 * 대회 엑셀 Export (Callable Function)
 * 
 * @param request.data
 *   - associationId: string
 *   - tournamentId: string
 */
export const exportCompetitionExcel = onCall(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 60,
  },
  async (request) => {
    // 인증 확인
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { associationId, tournamentId } = request.data || {};

    if (!associationId || !tournamentId) {
      throw new HttpsError(
        "invalid-argument",
        "associationId, tournamentId가 필요합니다."
      );
    }

    const uid = request.auth.uid;

    try {
      // 1. 관리자 권한 확인
      const associationRef = db.doc(`associations/${associationId}`);
      const associationDoc = await associationRef.get();

      if (!associationDoc.exists) {
        throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
      }

      const associationData = associationDoc.data();
      const adminUids = associationData?.adminUids || {};

      if (!adminUids[uid] && associationData?.ownerUid !== uid) {
        // Custom Claims 확인 (보조)
        const userRecord = await admin.auth().getUser(uid);
        const customClaims = userRecord.customClaims || {};
        const isAdmin = customClaims.role === "admin" || customClaims[`assoc_${associationId}`] === "admin";

        if (!isAdmin) {
          throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
        }
      }

      // 🔥 요금제 체크: BASIC 또는 PRO만 엑셀 Export 가능
      const plan = associationData?.plan || "free";
      if (plan === "free") {
        throw new HttpsError(
          "failed-precondition",
          "엑셀 Export는 BASIC 플랜부터 사용 가능합니다. 플랜을 업그레이드해주세요."
        );
      }

      // 2. 대회 정보 조회
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentDoc = await tournamentRef.get();

      if (!tournamentDoc.exists) {
        throw new HttpsError("not-found", "대회를 찾을 수 없습니다.");
      }

      const tournamentData = tournamentDoc.data();
      const competitionName = tournamentData?.name || "대회";
      const competitionYear = tournamentData?.year || new Date().getFullYear();

      // 3. 참가 신청 조회 (approved만)
      const applicationsRef = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/applications`
      );
      const applicationsSnap = await applicationsRef
        .where("status", "==", "approved")
        .get();

      if (applicationsSnap.empty) {
        throw new HttpsError("not-found", "승인된 참가 신청이 없습니다.");
      }

      // 4. 엑셀 워크북 생성
      const workbook = new ExcelJS.Workbook();

      // 시트 1: 참가팀 요약
      const teamSheet = workbook.addWorksheet("참가팀");
      teamSheet.columns = [
        { header: "팀명", key: "teamName", width: 20 },
        { header: "신청자", key: "managerName", width: 15 },
        { header: "연락처", key: "phone", width: 15 },
        { header: "팀 수", key: "teamCount", width: 10 },
        { header: "상태", key: "status", width: 10 },
        { header: "선수 수", key: "playerCount", width: 10 },
        { header: "명단 상태", key: "rosterStatus", width: 12 },
      ];

      // 시트 2: 선수 명단
      const playerSheet = workbook.addWorksheet("선수 명단");
      playerSheet.columns = [
        { header: "팀명", key: "teamName", width: 20 },
        { header: "선수명", key: "name", width: 15 },
        { header: "생년월일", key: "birthDate", width: 12 },
        { header: "포지션", key: "position", width: 10 },
        { header: "연락처", key: "phone", width: 15 },
      ];

      // 5. 데이터 수집 및 엑셀 작성
      const teamRows: any[] = [];
      const playerRows: any[] = [];

      for (const appDoc of applicationsSnap.docs) {
        const appData = appDoc.data();
        const applicationId = appDoc.id;

        // 선수 명단 조회
        // 경로: associations/{associationId}/tournaments/{tournamentId}/rosters/{applicationId}/players
        const playersRef = db.collection(
          `associations/${associationId}/tournaments/${tournamentId}/rosters/${applicationId}/players`
        );
        const playersSnap = await playersRef.get();

        const playerCount = playersSnap.size;
        const rosterStatus = appData.rosterStatus === "submitted" ? "제출 완료" : "미제출";

        // 참가팀 요약 row
        teamRows.push({
          teamName: appData.teamName || "-",
          managerName: appData.managerName || "-",
          phone: appData.phone || "-",
          teamCount: appData.teamCount || 0,
          status: "승인",
          playerCount,
          rosterStatus,
        });

        // 선수 명단 rows
        if (!playersSnap.empty) {
          playersSnap.forEach((playerDoc) => {
            const playerData = playerDoc.data();

            // 생년월일 포맷팅 (Timestamp → YYYY-MM-DD)
            let birthDateStr = "-";
            if (playerData.birthDate) {
              const birthDate = playerData.birthDate.toDate
                ? playerData.birthDate.toDate()
                : new Date(playerData.birthDate);
              birthDateStr = birthDate.toISOString().split("T")[0];
            }

            playerRows.push({
              teamName: appData.teamName || "-",
              name: playerData.name || "-",
              birthDate: birthDateStr,
              position: playerData.position || "-",
              phone: playerData.phone || "-",
            });
          });
        } else {
          // 선수가 없는 경우도 한 줄 추가 (팀명만)
          playerRows.push({
            teamName: appData.teamName || "-",
            name: "-",
            birthDate: "-",
            position: "-",
            phone: "-",
          });
        }
      }

      // 6. 엑셀 시트에 데이터 추가
      teamSheet.addRows(teamRows);
      playerSheet.addRows(playerRows);

      // 7. 스타일 적용 (헤더 행)
      const teamHeaderRow = teamSheet.getRow(1);
      teamHeaderRow.font = { bold: true };
      teamHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      const playerHeaderRow = playerSheet.getRow(1);
      playerHeaderRow.font = { bold: true };
      playerHeaderRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // 8. 엑셀 버퍼 생성
      const buffer = await workbook.xlsx.writeBuffer();

      // 9. Storage 업로드
      const bucketName = process.env.STORAGE_BUCKET || admin.storage().bucket().name;
      const bucket = storage.bucket(bucketName);

      const fileName = `${competitionYear}_${competitionName.replace(/\s+/g, "_")}_선수명단.xlsx`;
      const filePath = `exports/${associationId}/${tournamentId}/${fileName}`;
      const file = bucket.file(filePath);

      // 🔥 Buffer를 Uint8Array로 변환 (TypeScript 타입 호환)
      // writeBuffer()는 Buffer 또는 Uint8Array를 반환할 수 있으므로 명시적 변환
      let uint8Array: Uint8Array;
      if (Buffer.isBuffer(buffer)) {
        // Buffer인 경우
        const buf = buffer as Buffer;
        uint8Array = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } else if (buffer instanceof Uint8Array) {
        uint8Array = buffer;
      } else {
        // ArrayBuffer인 경우
        uint8Array = new Uint8Array(buffer as ArrayBuffer);
      }

      await file.save(uint8Array as any, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        metadata: {
          metadata: {
            exportedBy: uid,
            exportedAt: new Date().toISOString(),
            competitionName,
            competitionYear: String(competitionYear),
          },
        },
      });

      // 10. Signed URL 생성 (10분 유효)
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 10, // 10분
      });

      console.log("✅ [exportCompetitionExcel] 엑셀 Export 완료:", {
        associationId,
        tournamentId,
        fileName,
        filePath,
        teamCount: teamRows.length,
        playerCount: playerRows.length,
      });

      return {
        url,
        fileName,
        teamCount: teamRows.length,
        playerCount: playerRows.length,
      };
    } catch (error: any) {
      console.error("❌ [exportCompetitionExcel] 오류:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        error.message || "엑셀 Export 실패"
      );
    }
  }
);
