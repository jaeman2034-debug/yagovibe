/**
 * 🔥 QR PDF 생성 유틸
 * Phase 1-4: 현장 배포 단위
 * 
 * 선수 1명 = PDF 1장
 * 대회명, 팀명, 선수명, QR 코드, 주의 문구 포함
 */

import QRCode from "qrcode";
import jsPDF from "jspdf";

export type GenerateQrPdfParams = {
  tournamentName: string;
  teamName: string;
  playerName: string;
  qrToken: string;
};

/**
 * QR PDF 생성 및 다운로드
 */
export async function generateQrPdf({
  tournamentName,
  teamName,
  playerName,
  qrToken,
}: GenerateQrPdfParams): Promise<void> {
  // QR 이미지 생성 (base64)
  const qrDataUrl = await QRCode.toDataURL(qrToken, {
    margin: 2,
    width: 300,
    errorCorrectionLevel: "M",
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 제목
  pdf.setFontSize(18);
  pdf.text(tournamentName, 105, 20, { align: "center" });

  pdf.setFontSize(14);
  pdf.text("선수 출전 QR", 105, 30, { align: "center" });

  // 정보
  pdf.setFontSize(12);
  pdf.text(`팀명: ${teamName}`, 20, 45);
  pdf.text(`선수명: ${playerName}`, 20, 55);

  // QR 이미지 (중앙 정렬)
  const qrWidth = 120;
  const qrHeight = 120;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const qrX = (pageWidth - qrWidth) / 2;
  pdf.addImage(qrDataUrl, "PNG", qrX, 70, qrWidth, qrHeight);

  // 안내 문구
  pdf.setFontSize(10);
  const noticeText = [
    "※ 본 QR은 해당 대회에서만 유효합니다.",
    "※ 타인 사용 시 출전이 제한될 수 있습니다.",
    "※ 경기 전 심판에게 QR을 제시하세요.",
  ];
  
  let yPos = 205;
  noticeText.forEach((line) => {
    pdf.text(line, 20, yPos);
    yPos += 7;
  });

  // 파일명
  const fileName = `${playerName}_QR.pdf`;
  pdf.save(fileName);
}

