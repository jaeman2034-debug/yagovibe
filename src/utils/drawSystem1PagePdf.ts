/**
 * 🔥 구청·협회 제출용 1페이지 요약 아키텍처 PDF 생성
 * 
 * 결재·감사용 판결 요약서
 */

import jsPDF from "jspdf";
import type { Tournament } from "@/types/tournament";

/**
 * 1페이지 요약 PDF 생성
 */
export function generateDrawSystem1PagePdf() {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 15;

  // 제목
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("📄 2026 노원구 구청장기 축구대회", pageWidth / 2, y, { align: "center" });
  y += 7;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("시스템 운영·검증 아키텍처 요약 (1PAGE)", pageWidth / 2, y, { align: "center" });
  y += 10;

  // 1️⃣ 시스템 도입 목적
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("1️⃣ 시스템 도입 목적 (Why)", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("대회 운영의 공정성·투명성·책임성 확보", 20, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 연령·자격 분쟁 사전 차단", 20, y);
  y += 4;
  pdf.text("• 민원·감사 발생 시 시스템 로그 기반 대응", 20, y);
  y += 4;
  pdf.setFont("helvetica", "italic");
  pdf.text("→ 사람 판단 ❌ / 시스템 기준 ⭕", 20, y);
  y += 8;

  // 2️⃣ 전체 운영 구조
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("2️⃣ 전체 운영 구조 (End-to-End)", 15, y);
  y += 7;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  const flowSteps = [
    "정식 공지",
    "참가 신청 (팀 단위)",
    "선수 명단 수정 기간",
    "사무국 검수·승인",
    "비대면 시스템 조 추첨 ⭐",
    "현장 QR 체크인",
    "경기 운영·결과 확정",
    "행정 보고·감사 대응",
  ];
  flowSteps.forEach((step, idx) => {
    pdf.text(`${step}${idx < flowSteps.length - 1 ? " ↓" : ""}`, 20, y);
    y += 4;
  });
  y += 5;

  // 3️⃣ 역할별 책임 분리
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("3️⃣ 역할별 책임 분리 (Who)", 15, y);
  y += 6;
  
  // 테이블 헤더
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("역할", 20, y);
  pdf.text("책임", 100, y);
  y += 5;
  
  // 구분선
  pdf.line(20, y - 2, pageWidth - 20, y - 2);
  y += 2;
  
  // 테이블 데이터
  pdf.setFont("helvetica", "normal");
  const roles = [
    { role: "팀 총무", responsibility: "신청 정보 입력" },
    { role: "협회 사무국", responsibility: "검수·승인·추첨 실행" },
    { role: "시스템", responsibility: "연령 판정·조 추첨·로그" },
    { role: "현장 운영", responsibility: "QR 체크인" },
    { role: "외부 기관", responsibility: "사후 검증" },
  ];
  
  roles.forEach((r) => {
    pdf.text(`• ${r.role}`, 20, y);
    pdf.text(r.responsibility, 100, y);
    y += 4;
  });
  
  y += 2;
  pdf.setFont("helvetica", "italic");
  pdf.text("→ 책임 주체 명확 → 분쟁 최소화", 20, y);
  y += 8;

  // 4️⃣ 핵심 운영 기준
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("4️⃣ 핵심 운영 기준 (What)", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("✅ 참가·선수 관리", 20, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("• 팀 단위 참가 신청", 25, y);
  y += 4;
  pdf.text("• 선수 명단 수정 기간 별도 운영", 25, y);
  y += 4;
  pdf.text("• 사무국 승인 완료 선수만 출전 가능", 25, y);
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("✅ 현장 출전", 20, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("• 승인 선수만 QR 생성 가능", 25, y);
  y += 4;
  pdf.text("• 중복·미승인 자동 차단", 25, y);
  y += 8;

  // 5️⃣ 비대면 조 추첨 시스템
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("5️⃣ 비대면 조 추첨 시스템 (Key Point)", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("사전 고지된 일정에 따라 시스템 자동 추첨", 20, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("• 승인된 팀만 대상", 20, y);
  y += 4;
  pdf.setFont("helvetica", "bold");
  pdf.text("• 1회 실행 / 재추첨 불가", 20, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 랜덤 시드·입력 데이터·결과 전부 로그 기록", 20, y);
  y += 4;
  pdf.setFont("helvetica", "italic");
  pdf.text("→ 대면 불필요 / 조작 불가", 20, y);
  y += 8;

  // 6️⃣ 감사 대응 체계
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("6️⃣ 감사 대응 체계 (Proof)", 15, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("시스템 자동 기록", 20, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("• 승인 로그", 25, y);
  y += 4;
  pdf.text("• 조 추첨 로그 (시드·팀 해시·결과)", 25, y);
  y += 4;
  pdf.text("• 체크인 기록", 25, y);
  y += 4;
  pdf.text("• 대회 결과", 25, y);
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("제출 가능 산출물", 20, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("• PDF (구청/감사)", 25, y);
  y += 4;
  pdf.text("• CSV (내부 검증)", 25, y);
  y += 4;
  pdf.setFont("helvetica", "italic");
  pdf.text("→ \"말\"이 아닌 \"기록\"으로 대응", 20, y);
  y += 8;

  // 7️⃣ 행정·감사 핵심 문구
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("7️⃣ 행정·감사 핵심 문구 (공식)", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "본 대회는 협회 공식 시스템을 통해",
    20,
    y,
    { maxWidth: pageWidth - 40 }
  );
  y += 5;
  pdf.text(
    "참가·검수·조 추첨·출전 관리가 이루어지며,",
    20,
    y,
    { maxWidth: pageWidth - 40 }
  );
  y += 5;
  pdf.text(
    "모든 과정은 시스템 로그로 기록됩니다.",
    20,
    y,
    { maxWidth: pageWidth - 40 }
  );
  y += 10;

  // 최종 결론
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("🎯 최종 결론", 15, y);
  y += 6;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.text("이 대회 운영 시스템은", 20, y);
  y += 5;
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.text("✅ 현장 운영 가능", 25, y);
  y += 4;
  pdf.text("✅ 행정 보고 가능", 25, y);
  y += 4;
  pdf.text("✅ 감사·민원 대응 가능", 25, y);
  y += 4;
  pdf.setFont("helvetica", "italic");
  pdf.text("→ 실전 운영 시스템이다.", 20, y);
  y += 8;

  // 상태 선언 (테이블)
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("📊 상태 선언", 15, y);
  y += 6;
  
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("항목", 20, y);
  pdf.text("상태", 100, y);
  y += 4;
  pdf.line(20, y - 2, pageWidth - 20, y - 2);
  y += 2;
  
  pdf.setFont("helvetica", "normal");
  const statuses = [
    { item: "설계", status: "✅ 완료" },
    { item: "UX/UI", status: "✅ 완료" },
    { item: "감사 대응", status: "✅ 완료" },
    { item: "확장성", status: "전국 단위 적용 가능" },
  ];
  
  statuses.forEach((s) => {
    pdf.text(`• ${s.item}`, 20, y);
    pdf.text(s.status, 100, y);
    y += 4;
  });

  // 하단 정보
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "italic");
  const footerY = pageHeight - 10;
  pdf.text("문서 생성일: 2026년", 15, footerY);
  pdf.text("문서 버전: 1.0", pageWidth / 2, footerY, { align: "center" });
  pdf.text("문서 유형: 결재·감사용 판결 요약서", pageWidth - 15, footerY, { align: "right" });

  // 파일명
  const fileName = `2026_노원구_구청장기축구대회_시스템아키텍처요약.pdf`;
  pdf.save(fileName);
}

