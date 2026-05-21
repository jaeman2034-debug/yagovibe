/**
 * 🔥 구청 리포트 PDF 생성 유틸
 * Phase 1-4: 구청 리포트 자동화
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TournamentReportData } from "@/lib/tournament/reportRepository";

export type ReportPdfParams = {
  tournamentName: string;
  date: string;
  venue: string;
  organizer: string;
  totalMatches: number;
  totalTeams: number;
  totalPlayers: number;
  totalReferees: number;
  matches: Array<{
    startAt: Date;
    venueName: string;
    courtNo: string | number;
    homeTeam: string;
    awayTeam: string;
    referees: string;
    hasIncident: boolean;
  }>;
};

/**
 * 대회 리포트 PDF 생성
 */
export function generateTournamentReportPdf(params: ReportPdfParams): void {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 제목
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(params.tournamentName, 105, 20, { align: "center" });

  // 기본 정보
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`개최일: ${params.date}`, 20, 35);
  pdf.text(`주관/주최: ${params.organizer}`, 20, 43);
  pdf.text(`경기장: ${params.venue}`, 20, 51);

  // 요약 통계
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("요약 통계", 20, 65);
  
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`총 경기 수: ${params.totalMatches}경기`, 20, 73);
  pdf.text(`참가 팀 수: ${params.totalTeams}팀`, 20, 81);
  pdf.text(`참가 선수 수: ${params.totalPlayers}명`, 20, 89);
  pdf.text(`배정 심판 수: ${params.totalReferees}명`, 20, 97);

  // 경기 운영 결과 표
  autoTable(pdf, {
    startY: 105,
    head: [[
      "시간",
      "경기장/코트",
      "경기",
      "담당 심판",
      "특이사항",
    ]],
    body: params.matches.map((m) => {
      const hours = m.startAt.getHours();
      const minutes = m.startAt.getMinutes();
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      
      const venueCourt = `${m.venueName} ${m.courtNo ? `코트 ${m.courtNo}` : ""}`.trim();
      const matchStr = `${m.homeTeam} vs ${m.awayTeam}`;
      const incidentStr = m.hasIncident ? "경고/퇴장" : "-";

      return [
        timeStr,
        venueCourt,
        matchStr,
        m.referees || "미배정",
        incidentStr,
      ];
    }),
    styles: {
      fontSize: 9,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 20 }, // 시간
      1: { cellWidth: 35 }, // 경기장/코트
      2: { cellWidth: 60 }, // 경기
      3: { cellWidth: 40 }, // 담당 심판
      4: { cellWidth: 25 }, // 특이사항
    },
    margin: { left: 20, right: 20 },
  });

  // 하단 안내 문구
  const finalY = (pdf as any).lastAutoTable.finalY || 250;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(128, 128, 128);
  pdf.text(
    "본 자료는 시스템 자동 생성본입니다.",
    105,
    finalY + 10,
    { align: "center" }
  );
  
  const now = new Date();
  const dateStr = now.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  pdf.text(
    `생성 일시: ${dateStr}`,
    105,
    finalY + 16,
    { align: "center" }
  );

  // 파일명 생성
  const fileName = `${params.tournamentName}_구청제출용_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf`;
  pdf.save(fileName);
}

/**
 * 리포트 데이터를 PDF 파라미터로 변환
 */
export function convertReportDataToPdfParams(
  data: TournamentReportData
): ReportPdfParams {
  // 날짜 포맷팅
  const startDate = new Date(data.tournament.startDate);
  const endDate = new Date(data.tournament.endDate);
  
  let dateStr: string;
  if (startDate.getTime() === endDate.getTime()) {
    // 하루 대회
    dateStr = startDate.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } else {
    // 여러 날짜
    dateStr = `${startDate.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })} ~ ${endDate.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  }

  return {
    tournamentName: data.tournament.name,
    date: dateStr,
    venue: data.venue?.name || data.tournament.location,
    organizer: data.tournament.organizer,
    totalMatches: data.stats.totalMatches,
    totalTeams: data.stats.totalTeams,
    totalPlayers: data.stats.totalPlayers,
    totalReferees: data.stats.totalReferees,
    matches: data.matches,
  };
}

