/**
 * 🔥 심판 운영 가이드 PDF 생성 유틸
 * Step 2: 심판용 1페이지 매뉴얼 (실무 보호용)
 */

import jsPDF from "jspdf";

export function generateRefereeGuidePdf(tournamentName: string): void {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 상단: 대회명
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(tournamentName, 105, 20, { align: "center" });

  // 부제목
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.text("심판 운영 가이드 (자동화 시스템 기준)", 105, 30, { align: "center" });

  // 본문 시작 위치
  let y = 50;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");

  // ① 선수 검인 (QR)
  pdf.setFont("helvetica", "bold");
  pdf.text("① 선수 검인 (QR)", 20, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("• 모든 선수는 경기 전 QR 검인 완료 상태여야 출전 가능합니다.", 20, y);
  y += 6;
  pdf.text("• QR 검인은 모바일 스캔으로만 진행합니다.", 20, y);
  y += 6;
  pdf.text("• \"이미 검인됨 / 미등록 / 자격 없음\" 표시 시 출전 불가입니다.", 20, y);
  y += 6;
  pdf.text("• QR 검인 결과는 시스템 기록으로 자동 저장됩니다.", 20, y);
  y += 8;

  // ② 출전 불가 케이스
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("② 출전 불가 케이스", 20, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("다음 중 하나라도 해당 시 출전 불가입니다.", 20, y);
  y += 6;
  pdf.text("• QR 미소지", 20, y);
  y += 6;
  pdf.text("• 시스템상 \"미등록 / 자격 없음\"", 20, y);
  y += 6;
  pdf.text("• 해당 경기 검인 미완료", 20, y);
  y += 6;
  pdf.setFont("helvetica", "italic");
  pdf.text("※ 현장 요청·구두 확인·종이 명단은 인정되지 않습니다.", 20, y);
  y += 8;

  // ③ 경고 / 퇴장 기록
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("③ 경고 / 퇴장 기록", 20, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("• 경고·퇴장은 경기 상세 화면에서 즉시 기록합니다.", 20, y);
  y += 6;
  pdf.text("• 기록 시 시간·심판 정보가 자동 저장됩니다.", 20, y);
  y += 6;
  pdf.text("• 기록 후 수정은 제한되며, 필요 시 운영자에게 요청합니다.", 20, y);
  y += 8;

  // ④ 문제 발생 시 원칙
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("④ 문제 발생 시 원칙", 20, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("• 모든 판단 기준은 시스템 표시 상태를 따릅니다.", 20, y);
  y += 6;
  pdf.text("• 시스템 오류 의심 시 운영자에게 즉시 공유합니다.", 20, y);
  y += 6;
  pdf.text("• 심판 개인 판단으로 예외를 허용하지 않습니다.", 20, y);
  y += 6;
  pdf.setFont("helvetica", "bold");
  pdf.text("\"시스템 기준을 따른 판정은 심판 책임이 아닙니다.\"", 20, y);
  y += 10;

  // 하단 안내 문구
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  pdf.setTextColor(128, 128, 128);
  const now = new Date();
  const dateStr = now.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  pdf.text(
    `본 가이드는 시스템 자동 생성 기준입니다. (${dateStr})`,
    105,
    285,
    { align: "center" }
  );

  // 파일명 생성
  const fileName = `${tournamentName}_심판운영가이드_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`;
  pdf.save(fileName);
}

