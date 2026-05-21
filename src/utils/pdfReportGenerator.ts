// src/utils/pdfReportGenerator.ts
// 🔥 월간 회비 정산 PDF 생성 엔진 (A4 1장 최적화)

import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { type TeamMember, type TeamFeePolicy, calculateDueAmount, resolveFeePlan } from "./teamRules";

export interface MonthlyReportData {
  yyyymm: string;
  teamName: string;
  totalMembers: number;
  exemptCount: number;
  paidCount: number;
  unpaidCount: number;
  pausedCount: number;
  expectedTotal: number;
  collectedTotal: number;
  unpaidTotal: number;
  unpaidList: Array<{ name: string; unpaidMonths: number; amount: number }>;
  pausedList: Array<{ name: string; unpaidMonths: number }>;
}

// 🔥 PDF HTML 생성 (A4 1장 최적화)
function generatePDFHTML(data: MonthlyReportData): string {
  const [year, month] = data.yyyymm.split("-").map(Number);
  const monthName = `${year}년 ${month}월`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${monthName} 회비 정산 보고서</title>
      <style>
        @media print {
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          body { margin: 0; padding: 0; }
        }
        body { 
          font-family: "Malgun Gothic", "맑은 고딕", Arial, sans-serif; 
          padding: 20px; 
          max-width: 210mm;
          margin: 0 auto;
          font-size: 11px;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 3px solid #1f2937;
          padding-bottom: 15px;
        }
        .header h1 {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
          margin: 0;
        }
        .header p {
          font-size: 12px;
          color: #6b7280;
          margin: 3px 0;
        }
        .summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }
        .summary-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
        }
        .summary-card h3 {
          font-size: 10px;
          color: #6b7280;
          margin: 0 0 5px 0;
          font-weight: normal;
        }
        .summary-card .value {
          font-size: 16px;
          font-weight: bold;
          color: #1f2937;
        }
        .section {
          margin-bottom: 15px;
        }
        .section h2 {
          font-size: 13px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 3px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
          font-size: 10px;
        }
        th, td {
          border: 1px solid #d1d5db;
          padding: 6px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
          color: #374151;
        }
        .signature {
          margin-top: 25px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }
        .signature-box {
          text-align: center;
        }
        .signature-box .label {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 30px;
          color: #374151;
        }
        .signature-line {
          border-top: 1px solid #1f2937;
          padding-top: 5px;
          font-size: 10px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${monthName} 회비 정산 보고서</h1>
        <p><strong>팀명:</strong> ${data.teamName}</p>
        <p><strong>작성일:</strong> ${new Date().toLocaleDateString("ko-KR")}</p>
      </div>

      <div class="summary">
        <div class="summary-card">
          <h3>전체 회원 수</h3>
          <div class="value">${data.totalMembers}명</div>
        </div>
        <div class="summary-card">
          <h3>면제 인원</h3>
          <div class="value">${data.exemptCount}명</div>
        </div>
        <div class="summary-card">
          <h3>납부 인원</h3>
          <div class="value">${data.paidCount}명</div>
        </div>
        <div class="summary-card">
          <h3>미납 인원</h3>
          <div class="value" style="color: ${data.unpaidCount > 0 ? '#dc2626' : '#059669'}">${data.unpaidCount}명</div>
        </div>
        <div class="summary-card">
          <h3>이번 달 청구액</h3>
          <div class="value">${data.expectedTotal.toLocaleString()}원</div>
        </div>
        <div class="summary-card">
          <h3>실제 수납액</h3>
          <div class="value">${data.collectedTotal.toLocaleString()}원</div>
        </div>
        <div class="summary-card">
          <h3>미수금 합계</h3>
          <div class="value" style="color: ${data.unpaidTotal > 0 ? '#dc2626' : '#059669'}">${data.unpaidTotal.toLocaleString()}원</div>
        </div>
        <div class="summary-card">
          <h3>휴원 처리 인원</h3>
          <div class="value" style="color: ${data.pausedCount > 0 ? '#dc2626' : '#059669'}">${data.pausedCount}명</div>
        </div>
      </div>

      ${data.unpaidList.length > 0 ? `
        <div class="section">
          <h2>미납자 명단</h2>
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>미납 개월</th>
                <th>미납액</th>
              </tr>
            </thead>
            <tbody>
              ${data.unpaidList.map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.unpaidMonths}개월</td>
                  <td>${item.amount.toLocaleString()}원</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : ""}

      ${data.pausedList.length > 0 ? `
        <div class="section">
          <h2>휴원자 명단</h2>
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>미납 개월</th>
              </tr>
            </thead>
            <tbody>
              ${data.pausedList.map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.unpaidMonths}개월</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : ""}

      <div class="signature">
        <div class="signature-box">
          <div class="label">회장</div>
          <div class="signature-line">서명</div>
        </div>
        <div class="signature-box">
          <div class="label">총무</div>
          <div class="signature-line">서명</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 🔥 HTML을 PDF Blob으로 변환 (window.print 활용)
async function htmlToPDFBlob(html: string): Promise<Blob> {
  // 🔥 브라우저의 print 기능을 활용한 PDF 생성
  // 실제로는 Cloud Functions에서 jsPDF 사용 권장
  // 클라이언트에서는 HTML을 그대로 저장하고, 서버에서 PDF 변환
  
  // TODO: 실제 PDF 생성 라이브러리 사용 (jsPDF, html2pdf.js 등)
  // 현재는 HTML을 text/html로 저장 (나중에 서버에서 PDF 변환)
  
  return new Blob([html], { type: "text/html;charset=utf-8" });
}

// 🔥 월간 리포트 데이터 수집
async function collectMonthlyReportData(
  teamId: string,
  yyyymm: string,
  members: TeamMember[],
  feePolicy: TeamFeePolicy
): Promise<MonthlyReportData> {
  const [year, month] = yyyymm.split("-").map(Number);
  const reportDate = new Date(year, month - 1, 1);

  // 팀 정보 조회
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  const teamName = teamSnap.data()?.name || "팀";

  // ledger 조회
  const ledgerRef = collection(db, "teams", teamId, "ledger", yyyymm, "items");
  const ledgerSnapshot = await getDocs(ledgerRef);
  
  const ledgerMap = new Map<string, { dueAmount: number; paidAmount: number }>();
  ledgerSnapshot.forEach((doc) => {
    const data = doc.data();
    ledgerMap.set(doc.id, {
      dueAmount: data.dueAmount || 0,
      paidAmount: data.paidAmount || 0,
    });
  });

  // 통계 계산
  let totalMembers = members.length;
  let exemptCount = 0;
  let paidCount = 0;
  let unpaidCount = 0;
  let pausedCount = 0;
  let expectedTotal = 0;
  let collectedTotal = 0;
  let unpaidTotal = 0;
  
  const unpaidList: Array<{ name: string; unpaidMonths: number; amount: number }> = [];
  const pausedList: Array<{ name: string; unpaidMonths: number }> = [];

  for (const member of members) {
    const ledger = ledgerMap.get(member.id || "");
    const dueAmount = ledger?.dueAmount || calculateDueAmount(member, feePolicy, year, month);
    const paidAmount = ledger?.paidAmount || 0;
    const resolved = resolveFeePlan(member);

    if (resolved.feePlan === "exempt") {
      exemptCount++;
    } else {
      expectedTotal += dueAmount;
      
      if (paidAmount >= dueAmount) {
        paidCount++;
        collectedTotal += paidAmount;
      } else {
        unpaidCount++;
        unpaidTotal += (dueAmount - paidAmount);
        unpaidList.push({
          name: member.name,
          unpaidMonths: member.unpaidMonths || 0,
          amount: dueAmount - paidAmount,
        });
      }
    }

    if (member.status === "paused") {
      pausedCount++;
      pausedList.push({
        name: member.name,
        unpaidMonths: member.unpaidMonths || 0,
      });
    }
  }

  return {
    yyyymm,
    teamName,
    totalMembers,
    exemptCount,
    paidCount,
    unpaidCount,
    pausedCount,
    expectedTotal,
    collectedTotal,
    unpaidTotal,
    unpaidList,
    pausedList,
  };
}

// 🔥 월간 리포트 PDF 생성 및 저장
export async function generateMonthlyReportPDF(
  teamId: string,
  yyyymm: string,
  members: TeamMember[],
  feePolicy: TeamFeePolicy
): Promise<string> {
  // 1. 리포트 데이터 수집
  const reportData = await collectMonthlyReportData(teamId, yyyymm, members, feePolicy);

  // 2. PDF HTML 생성
  const html = generatePDFHTML(reportData);

  // 3. HTML을 Blob으로 변환
  const blob = await htmlToPDFBlob(html);

  // 4. Firebase Storage에 업로드
  const fileName = `${yyyymm}.html`; // TODO: 실제 PDF로 변환 시 .pdf로 변경
  const storageRef = ref(storage, `teams/${teamId}/reports/${fileName}`);
  
  await uploadBytes(storageRef, blob, {
    contentType: "text/html;charset=utf-8", // TODO: "application/pdf"로 변경
    customMetadata: {
      teamId,
      yyyymm,
      generatedAt: new Date().toISOString(),
    },
  });

  // 5. 다운로드 URL 생성 (공개 URL)
  // TODO: 서명 URL 생성 (Firebase Admin SDK의 getSignedUrl 사용)
  // 현재는 공개 URL 반환 (Storage 규칙에서 읽기 권한 필요)
  const downloadURL = await getDownloadURL(storageRef);
  
  console.log(`[PDF Report] 생성 완료: ${fileName}`, downloadURL);
  
  return downloadURL;
}

