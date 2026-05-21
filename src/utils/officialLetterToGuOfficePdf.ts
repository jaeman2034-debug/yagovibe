/**
 * 🔥 구청 제출용 공문 PDF 생성
 * 
 * 결재·감사 대응용 정식 공문
 */

import jsPDF from "jspdf";

/**
 * 구청 제출용 공문 PDF 생성
 */
export function generateOfficialLetterToGuOfficePdf() {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = 15;

  // 헤더
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("수신: 노원구청 복지문화국 체육담당", 15, y);
  y += 5;
  pdf.text("발신: 노원구 축구협회", 15, y);
  y += 5;
  pdf.text("제목: 2026년 노원구 구청장기 축구대회 시스템 운영 방식 변경 안내 및 협조 요청", 15, y);
  y += 5;
  pdf.text("관련: 2026년 노원구 구청장기 축구대회 운영 방안", 15, y);
  y += 10;

  // 제목
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("2026년 노원구 구청장기 축구대회", pageWidth / 2, y, { align: "center" });
  y += 6;
  pdf.setFontSize(12);
  pdf.text("시스템 운영 방식 변경 안내 및 협조 요청", pageWidth / 2, y, { align: "center" });
  y += 10;

  // 인사말
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("귀하의 무궁한 발전을 기원합니다.", 15, y);
  y += 7;
  pdf.text(
    "노원구 축구협회에서는 2026년 노원구 구청장기 축구대회의 공정성·투명성·책임성 확보를 위하여",
    15,
    y,
    { maxWidth: pageWidth - 30 }
  );
  y += 5;
  pdf.setFont("helvetica", "bold");
  pdf.text("협회 공식 시스템을 통한 대회 운영 방식으로 전환하고자 합니다.", 15, y, { maxWidth: pageWidth - 30 });
  y += 10;

  // 1. 변경 배경
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("1. 변경 배경", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "기존 대회 운영 과정에서 발생하는 다음과 같은 문제를 개선하고자 합니다:",
    20,
    y,
    { maxWidth: pageWidth - 40 }
  );
  y += 6;
  pdf.text("• 연령·자격 분쟁 발생 시 객관적 증빙 자료 부족", 25, y);
  y += 5;
  pdf.text("• 민원·감사 발생 시 수기 기록 중심의 대응 한계", 25, y);
  y += 5;
  pdf.text("• 조 추첨 과정의 공정성 검증 어려움", 25, y);
  y += 5;
  pdf.text("• 현장 출전 관리의 수기 처리로 인한 오류 가능성", 25, y);
  y += 10;

  // 페이지 넘김 체크
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  // 2. 새로운 운영 방식
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("2. 새로운 운영 방식", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("본 대회는 다음과 같이 협회 공식 시스템을 통해 운영됩니다:", 20, y, { maxWidth: pageWidth - 40 });
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("✅ 참가·검수 관리", 20, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 팀 단위 참가 신청 (온라인)", 25, y);
  y += 4;
  pdf.text("• 선수 명단 수정 기간 별도 운영", 25, y);
  y += 4;
  pdf.text("• 사무국 검수·승인 완료 선수만 출전 가능", 25, y);
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.text("✅ 비대면 조 추첨", 20, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 사전 고지된 일정에 따라 시스템 자동 추첨", 25, y);
  y += 4;
  pdf.text("• 승인된 팀만 대상", 25, y);
  pdf.setFont("helvetica", "bold");
  pdf.text("• 1회 실행 / 재추첨 불가 (시스템 보장)", 25, y);
  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 랜덤 시드·입력 데이터·결과 전부 로그 기록", 25, y);
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.text("✅ 현장 출전 관리", 20, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 승인 선수만 QR 코드 생성 가능", 25, y);
  y += 4;
  pdf.text("• 중복·미승인 자동 차단 (시스템 차단)", 25, y);
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.text("✅ 경기 운영·결과 확정", 20, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 경기 결과 입력 (관리자)", 25, y);
  y += 4;
  pdf.text("• 승자 자동 계산", 25, y);
  y += 4;
  pdf.text("• 모든 과정 시스템 로그 기록", 25, y);
  y += 10;

  // 페이지 넘김 체크
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  // 3. 감사 대응 체계
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("3. 감사 대응 체계", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("본 대회 운영 과정에서 발생하는 모든 기록은 시스템에 자동 저장되며,", 20, y, { maxWidth: pageWidth - 40 });
  y += 5;
  pdf.text("다음과 같이 제출 가능합니다:", 20, y, { maxWidth: pageWidth - 40 });
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("시스템 자동 기록", 20, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("• 승인 로그", 25, y);
  y += 4;
  pdf.text("• 조 추첨 로그 (시드·팀 해시·결과)", 25, y);
  y += 4;
  pdf.text("• 체크인 기록", 25, y);
  y += 4;
  pdf.text("• 대회 결과", 25, y);
  y += 6;

  pdf.setFont("helvetica", "bold");
  pdf.text("제출 가능 산출물", 20, y);
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("• PDF (구청/감사용 완전한 증빙 자료)", 25, y);
  y += 4;
  pdf.text("• CSV (내부 검증용)", 25, y);
  y += 4;
  pdf.text("• JSON (시스템 보관용)", 25, y);
  y += 4;
  pdf.setFont("helvetica", "italic");
  pdf.text("→ \"말\"이 아닌 \"기록\"으로 대응", 20, y);
  y += 10;

  // 페이지 넘김 체크
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  // 4. 행정·감사 핵심 문구
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("4. 행정·감사 핵심 문구", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  pdf.text("본 대회는 협회 공식 시스템을 통해", 20, y, { maxWidth: pageWidth - 40 });
  y += 5;
  pdf.text("참가·검수·조 추첨·출전 관리가 이루어지며,", 20, y, { maxWidth: pageWidth - 40 });
  y += 5;
  pdf.text("모든 과정은 시스템 로그로 기록됩니다.", 20, y, { maxWidth: pageWidth - 40 });
  y += 10;

  // 5. 역할별 책임 분리
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("5. 역할별 책임 분리", 15, y);
  y += 6;
  
  // 테이블
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("역할", 20, y);
  pdf.text("책임", 100, y);
  y += 4;
  pdf.line(20, y - 2, pageWidth - 20, y - 2);
  y += 2;
  
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
  y += 10;

  // 페이지 넘김 체크
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  // 6. 기대 효과
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("6. 기대 효과", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("본 시스템 도입을 통해 다음과 같은 효과를 기대합니다:", 20, y, { maxWidth: pageWidth - 40 });
  y += 6;
  pdf.text("1. 공정성 확보: 시스템 기반 자동 추첨으로 사람 개입 최소화", 25, y);
  y += 5;
  pdf.text("2. 투명성 확보: 모든 과정의 로그 기록으로 추적 가능", 25, y);
  y += 5;
  pdf.text("3. 책임성 확보: 역할별 책임 분리 및 기록 보존", 25, y);
  y += 5;
  pdf.text("4. 민원·감사 대응: 시스템 로그 기반 즉시 증빙 자료 제출", 25, y);
  y += 10;

  // 7. 협조 요청
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("7. 협조 요청", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("귀하께서는 다음과 같은 협조를 부탁드립니다:", 20, y, { maxWidth: pageWidth - 40 });
  y += 6;
  pdf.text("1. 본 시스템 도입에 대한 이해 및 승인", 25, y);
  y += 5;
  pdf.text("2. 필요 시 감사 자료 요청 시 시스템 로그 제출 방식 활용", 25, y);
  y += 5;
  pdf.text("3. 향후 대회 운영 방식 변경 시 사전 협의", 25, y);
  y += 10;

  // 첨부 자료
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("첨부 자료", 15, y);
  y += 7;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("1. 시스템 운영·검증 아키텍처 요약 (1PAGE) (별첨)", 20, y);
  y += 5;
  pdf.text("   - 시스템 전체 구조 및 운영 방식 요약", 25, y);
  y += 4;
  pdf.text("   - 감사 대응 체계 명시", 25, y);
  y += 6;
  pdf.text("2. 감사 로그 샘플 (PDF) (대회 종료 후 제출)", 20, y);
  y += 5;
  pdf.text("   - 조 추첨 로그 (시드·팀 해시·결과)", 25, y);
  y += 4;
  pdf.text("   - 승인 로그", 25, y);
  y += 4;
  pdf.text("   - 체크인 기록", 25, y);
  y += 15;

  // 하단 정보
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const footerY = pageHeight - 15;
  pdf.text("작성일: 2026년 ○월 ○일", 15, footerY);
  pdf.text("작성자: 노원구 축구협회 사무국", 15, footerY + 5);
  pdf.text("연락처: [협회 연락처]", 15, footerY + 10);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "italic");
  pdf.text(
    "본 공문은 결재·감사 대응용 정식 문서입니다.",
    pageWidth / 2,
    footerY + 10,
    { align: "center" }
  );

  // 파일명
  const fileName = `2026_노원구_구청장기축구대회_시스템운영방식변경안내_공문.pdf`;
  pdf.save(fileName);
}

