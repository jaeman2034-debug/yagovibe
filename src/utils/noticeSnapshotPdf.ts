/**
 * 🔥 공지 스냅샷 PDF 자동 생성
 * 최종 증빙 완성: 공지 종료 시점 기준 PDF
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export type SnapshotPdfParams = {
  noticeTitle: string;
  publishedAt: string | Date;
  closedAt: string | Date;
  noticeContent: string;
  faqs: Array<{ question: string; answer: string }>;
  stats: {
    totalQuestions: number;
    categoryCounts: Record<string, number>;
  } | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  schedule: "일정",
  fee: "참가비",
  venue: "장소",
  apply: "신청 방법",
  eligibility: "자격/대상",
  other: "기타",
};

/**
 * 날짜 포맷팅 헬퍼
 * Timestamp, Date, string 모두 처리
 */
function formatDate(date: string | Date | any): string {
  let dateObj: Date;
  
  if (typeof date === "string") {
    try {
      dateObj = new Date(date);
    } catch {
      return date;
    }
  } else if (date?.toDate) {
    // Firestore Timestamp
    dateObj = date.toDate();
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return String(date);
  }
  
  try {
    return format(dateObj, "yyyy년 MM월 dd일");
  } catch {
    return dateObj.toLocaleDateString("ko-KR");
  }
}

/**
 * 공지 스냅샷 PDF 생성
 */
export function generateNoticeSnapshotPdf(params: SnapshotPdfParams) {
  const pdf = new jsPDF();

  // ===== Page 1: 공지 기준 정보 =====
  pdf.setFontSize(18);
  pdf.text(params.noticeTitle, 105, 20, { align: "center" });

  pdf.setFontSize(11);
  pdf.text(`게시일: ${formatDate(params.publishedAt)}`, 20, 35);
  pdf.text(`종료일: ${formatDate(params.closedAt)}`, 20, 42);

  pdf.setFontSize(12);
  pdf.text("공지 내용", 20, 55);

  // 공지 본문 (여러 줄 처리)
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(params.noticeContent || "(내용 없음)", 170);
  let yPos = 63;
  for (const line of lines) {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(line, 20, yPos);
    yPos += 7;
  }

  // 푸터
  pdf.setFontSize(9);
  pdf.text(
    "본 문서는 공지 종료 시점 기준으로 자동 생성된 공식 기록입니다.",
    105,
    285,
    { align: "center" }
  );

  // ===== Page 2: FAQ + 통계 =====
  pdf.addPage();

  // FAQ 섹션
  pdf.setFontSize(14);
  pdf.text("FAQ (공식 답변)", 20, 20);

  if (params.faqs && params.faqs.length > 0) {
    autoTable(pdf, {
      startY: 28,
      head: [["질문", "답변"]],
      body: params.faqs.map((f) => [
        f.question || "(질문 없음)",
        f.answer || "(답변 없음)",
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 110 },
      },
      margin: { top: 10 },
    });
  } else {
    pdf.setFontSize(10);
    pdf.text("등록된 FAQ가 없습니다.", 20, 30);
  }

  // 통계 섹션
  let y = (pdf as any).lastAutoTable?.finalY ?? 60;
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  pdf.setFontSize(14);
  pdf.text("문의 통계 요약", 20, y + 15);

  if (params.stats && params.stats.totalQuestions > 0) {
    const statsBody = [
      ["총 질문 수", params.stats.totalQuestions.toString()],
      ...Object.entries(params.stats.categoryCounts)
        .filter(([_, count]) => count > 0)
        .map(([category, count]) => [
          CATEGORY_LABELS[category] || category,
          count.toString(),
        ]),
    ];

    autoTable(pdf, {
      startY: y + 22,
      head: [["구분", "건수"]],
      body: statsBody,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      margin: { top: 10 },
    });
  } else {
    pdf.setFontSize(10);
    pdf.text("문의 통계가 없습니다.", 20, y + 25);
  }

  // 최종 푸터
  const finalY = (pdf as any).lastAutoTable?.finalY ?? y + 30;
  pdf.setFontSize(9);
  pdf.text(
    `본 문서는 시스템 자동 생성본입니다. (${format(new Date(), "yyyy-MM-dd HH:mm:ss")})`,
    105,
    pdf.internal.pageSize.height - 15,
    { align: "center" }
  );

  // 파일명에서 특수문자 제거
  const safeTitle = params.noticeTitle.replace(/[^\w\s-]/g, "").substring(0, 50);
  pdf.save(`${safeTitle}_공지스냅샷.pdf`);
}

