/**
 * 🔥 회계용 엑셀 자동 생성
 * GET /exportAccountingXlsx?aid={aid}&tid={tid}
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import ExcelJS from "exceljs";

const db = admin.firestore();
const storage = admin.storage().bucket();

/**
 * 회계용 엑셀 다운로드
 */
export const exportAccountingXlsx = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const { aid, tid } = req.query as any;

      if (!aid || !tid) {
        return res.status(400).json({ error: "MISSING_aid_tid" });
      }

      // 권한: ADMIN만 (커스텀 클레임 role 검사)
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      if (!idToken) {
        return res.status(401).json({ error: "NO_AUTH" });
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      // TODO: ADMIN 권한 확인 (associations/{aid}/adminUids 체크)
      void decoded;

      // 참가 신청 목록 조회
      const appsSnap = await db
        .collection(`associations/${aid}/tournaments/${tid}/applications`)
        .get();

      // 대회 정보 조회 (대회명)
      const tournamentRef = db.doc(
        `associations/${aid}/tournaments/${tid}`
      );
      const tournamentSnap = await tournamentRef.get();
      const tournamentName = tournamentSnap.data()?.name || "대회명 없음";

      // 엑셀 워크북 생성
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Payments");

      // 헤더 스타일
      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // 컬럼 정의
      ws.columns = [
        { header: "대회명", key: "tournamentName", width: 20 },
        { header: "팀명", key: "teamName", width: 20 },
        { header: "신청 팀 수", key: "teamCount", width: 12 },
        { header: "산정 참가비", key: "totalFee", width: 14 },
        { header: "납부 합계", key: "paidTotal", width: 14 },
        { header: "미납", key: "dueAmount", width: 12 },
        { header: "상태", key: "paymentStatus", width: 10 },
        { header: "마지막 납부일", key: "lastPaymentAt", width: 18 },
        { header: "납부수단", key: "paymentMethod", width: 12 },
        { header: "비고", key: "notes", width: 20 },
      ];

      // 데이터 행 추가
      for (const doc of appsSnap.docs) {
        const app = doc.data() as any;

        // 최근 결제 방법 조회
        let paymentMethod = "";
        try {
          const paymentsSnap = await db
            .collection(
              `associations/${aid}/tournaments/${tid}/applications/${doc.id}/payments`
            )
            .where("status", "==", "PAID")
            .orderBy("paidAt", "desc")
            .limit(1)
            .get();

          if (!paymentsSnap.empty) {
            const method = paymentsSnap.docs[0].data().method;
            const methodMap: Record<string, string> = {
              CASH: "현금",
              TRANSFER: "계좌이체",
              CARD: "카드",
              OTHER: "기타",
            };
            paymentMethod = methodMap[method] || method;
          }
        } catch (e) {
          // 결제 기록 조회 실패 시 무시
        }

        ws.addRow({
          tournamentName,
          teamName: app.teamName ?? "",
          teamCount: app.teamCount ?? 0,
          totalFee: app.feeCalc?.totalFee ?? 0,
          paidTotal: app.paidTotal ?? 0,
          dueAmount: app.dueAmount ?? 0,
          paymentStatus:
            app.paymentStatus === "PAID"
              ? "완납"
              : app.paymentStatus === "PARTIAL"
                ? "부분납"
                : "미납",
          lastPaymentAt: app.lastPaymentAt?.toDate?.()?.toISOString?.()?.slice(0, 10) ?? "",
          paymentMethod,
          notes: "",
        });
      }

      // 엑셀 버퍼 생성
      const buffer = await wb.xlsx.writeBuffer();

      // Storage에 업로드
      const filePath = `exports/accounting_${aid}_${tid}_${Date.now()}.xlsx`;
      const file = storage.file(filePath);

      await file.save(Buffer.from(buffer), {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // 다운로드 URL (Signed URL)
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 1000 * 60 * 10, // 10분
      });

      return res.json({ ok: true, url });
    } catch (e: any) {
      console.error("[exportAccountingXlsx] Error:", e);
      return res.status(500).json({
        error: "INTERNAL",
        message: e.message || "엑셀 생성 실패",
      });
    }
  }
);

