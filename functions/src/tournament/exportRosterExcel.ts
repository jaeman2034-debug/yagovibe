/**
 * 🔥 STEP 5: 팀 명단 엑셀 다운로드 Callable
 * 
 * 조 추첨 완료(DRAW_DONE) 이후 확정된 팀/선수 명단을 엑셀로 내보냄
 * 운영/심판/현장에서 바로 사용 가능한 실무 산출물
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import ExcelJS from "exceljs";
import { db } from "../firebase";
import { checkIsAdmin } from "../auth/checkIsAdmin";

interface ExportRosterExcelRequest {
  associationId: string;
  tournamentId: string;
}

export const exportRosterExcelCallable = onCall(
  {
    region: "asia-northeast3",
    memory: "512MiB",
    timeoutSeconds: 300, // 엑셀 생성은 시간이 걸릴 수 있음
  },
  async (req) => {
    const { associationId, tournamentId } = req.data as ExportRosterExcelRequest;
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!associationId || !tournamentId) {
      throw new HttpsError("invalid-argument", "associationId와 tournamentId가 필요합니다.");
    }

    logger.info(`[exportRosterExcel] 시작`, { associationId, tournamentId, uid });

    // 1️⃣ 관리자 권한 확인
    const isAdmin = await checkIsAdmin(uid, associationId);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "관리자만 다운로드할 수 있습니다.");
    }

    // 2️⃣ 대회 정보 조회
    const tournamentRef = db
      .collection("associations")
      .doc(associationId)
      .collection("tournaments")
      .doc(tournamentId);

    const tournamentSnap = await tournamentRef.get();
    if (!tournamentSnap.exists) {
      throw new HttpsError("not-found", "대회를 찾을 수 없습니다.");
    }

    const tournament = tournamentSnap.data()!;

    // 3️⃣ 조 추첨 완료 상태 확인
    if (tournament.tournamentPhase !== "DRAW_DONE") {
      throw new HttpsError(
        "failed-precondition",
        "조 추첨 완료 후 다운로드 가능합니다."
      );
    }

    logger.info(`[exportRosterExcel] 조 추첨 완료 확인됨`, {
      tournamentPhase: tournament.tournamentPhase,
    });

    // 4️⃣ 조 정보 수집 (divisions 컬렉션 또는 drawDivisions)
    const divisionsRef = db
      .collection("associations")
      .doc(associationId)
      .collection("tournaments")
      .doc(tournamentId)
      .collection("divisions");

    const divisionsSnap = await divisionsRef.orderBy("divisionNumber", "asc").get();

    if (divisionsSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "조 정보를 찾을 수 없습니다. 조 추첨이 완료되었는지 확인해주세요."
      );
    }

    const divisions = divisionsSnap.docs.map((doc) => ({
      divisionNumber: doc.data().divisionNumber as number,
      division: `조 ${doc.data().divisionNumber}`,
      teamIds: doc.data().teamIds as string[],
      teamNames: doc.data().teamNames as string[],
    }));

    logger.info(`[exportRosterExcel] 조 정보 수집 완료`, {
      divisionCount: divisions.length,
    });

    // 5️⃣ 엑셀 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Yago Vibe SPT";
    workbook.created = new Date();

    // 시트 1: 전체 팀 명단
    const rosterSheet = workbook.addWorksheet("팀 명단");
    rosterSheet.columns = [
      { header: "조", key: "group", width: 8 },
      { header: "팀명", key: "teamName", width: 25 },
      { header: "선수명", key: "name", width: 15 },
      { header: "출생연도", key: "birthYear", width: 12 },
      { header: "포지션", key: "position", width: 10 },
      { header: "연락처", key: "phone", width: 18 },
    ];

    // 헤더 스타일 적용
    rosterSheet.getRow(1).font = { bold: true, size: 12 };
    rosterSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    rosterSheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // 6️⃣ 각 조별로 팀/선수 데이터 수집
    let totalRows = 0;
    for (const division of divisions) {
      for (let i = 0; i < division.teamIds.length; i++) {
        const teamId = division.teamIds[i];
        const teamName = division.teamNames[i] || "팀명 없음";

        // 팀의 선수 목록 조회
        const playersRef = db
          .collection("associations")
          .doc(associationId)
          .collection("tournaments")
          .doc(tournamentId)
          .collection("teams")
          .doc(teamId)
          .collection("players");

        const playersSnap = await playersRef.get();

        if (playersSnap.empty) {
          // 선수가 없는 팀도 1행으로 표시 (팀명만)
          rosterSheet.addRow({
            group: division.division,
            teamName: teamName,
            name: "",
            birthYear: "",
            position: "",
            phone: "",
          });
          totalRows++;
        } else {
          playersSnap.forEach((playerDoc) => {
            const player = playerDoc.data();
            rosterSheet.addRow({
              group: division.division,
              teamName: teamName,
              name: player.name || "",
              birthYear: player.birthYear || player.birthDateRaw || "",
              position: player.position || "",
              phone: player.phone || "",
            });
            totalRows++;
          });
        }
      }
    }

    logger.info(`[exportRosterExcel] 엑셀 데이터 생성 완료`, {
      totalRows,
      divisionCount: divisions.length,
    });

    // 시트 2: 팀 요약
    const summarySheet = workbook.addWorksheet("팀 요약");
    summarySheet.columns = [
      { header: "조", key: "group", width: 8 },
      { header: "팀명", key: "teamName", width: 25 },
      { header: "선수 수", key: "playerCount", width: 12 },
    ];

    // 헤더 스타일 적용
    summarySheet.getRow(1).font = { bold: true, size: 12 };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
    summarySheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // 팀 요약 데이터 생성
    for (const division of divisions) {
      for (let i = 0; i < division.teamIds.length; i++) {
        const teamId = division.teamIds[i];
        const teamName = division.teamNames[i] || "팀명 없음";

        const playersRef = db
          .collection("associations")
          .doc(associationId)
          .collection("tournaments")
          .doc(tournamentId)
          .collection("teams")
          .doc(teamId)
          .collection("players");

        const playersSnap = await playersRef.get();
        const playerCount = playersSnap.size;

        summarySheet.addRow({
          group: division.division,
          teamName: teamName,
          playerCount: playerCount,
        });
      }
    }

    // 7️⃣ 엑셀 파일 버퍼 생성
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const fileName = `${tournament.name || "대회"}_팀명단_${new Date().toISOString().split("T")[0]}.xlsx`;

    logger.info(`[exportRosterExcel] 완료`, {
      fileName,
      fileSize: buffer.length,
    });

    return {
      success: true,
      file: base64,
      fileName: fileName,
    };
  }
);
