/**
 * 🔥 영수증 PDF 생성 유틸
 */

import jsPDF from "jspdf";
import type { Receipt } from "@/types/tournament";

export interface ReceiptPdfParams {
  receiptNo: string;
  issuedAt: Date;
  payerName: string;
  teamCount: number;
  totalFee: number;
  paidTotal: number;
  methodSummary: string;
  note?: string | null;
}

/**
 * 영수증 PDF 생성
 */
export function generateReceiptPdf(params: ReceiptPdfParams) {
  const pdf = new jsPDF();

  // 제목
  pdf.setFontSize(18);
  pdf.text("영수증", 105, 20, { align: "center" });

  // 영수증 번호
  pdf.setFontSize(12);
  pdf.text(`영수증 번호: ${params.receiptNo}`, 20, 35);
  pdf.text(`발급일: ${params.issuedAt.toLocaleDateString("ko-KR")}`, 20, 42);

  // 납부자 정보
  pdf.setFontSize(14);
  pdf.text("납부자", 20, 55);
  pdf.setFontSize(12);
  pdf.text(`단체명: ${params.payerName}`, 20, 65);

  // 결제 내역
  pdf.setFontSize(14);
  pdf.text("결제 내역", 20, 80);
  pdf.setFontSize(12);
  pdf.text(`참가 팀 수: ${params.teamCount}팀`, 20, 90);
  pdf.text(`총 참가비: ${params.totalFee.toLocaleString()}원`, 20, 97);
  pdf.text(`납부 금액: ${params.paidTotal.toLocaleString()}원`, 20, 104);
  pdf.text(`결제 방법: ${params.methodSummary}`, 20, 111);

  // 비고
  if (params.note) {
    pdf.setFontSize(12);
    pdf.text(`비고: ${params.note}`, 20, 125);
  }

  // 하단 안내
  pdf.setFontSize(9);
  pdf.text(
    "본 영수증은 시스템 자동 생성본입니다.",
    105,
    pdf.internal.pageSize.height - 15,
    { align: "center" }
  );

  // 파일명
  const fileName = `영수증_${params.receiptNo}.pdf`;
  pdf.save(fileName);
}

/**
 * 영수증 번호 생성 (예: R-2026-001)
 */
export function generateReceiptNo(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `R-${year}-${random}`;
}

