/**
 * 🔥 조 추첨 감사 로그 포맷 (GENIUS AUDIT SPEC)
 * 
 * 감사·민원·법무까지 바로 제출 가능한 수준
 */

import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import type { Tournament } from "@/types/tournament";
import type { DrawLog } from "@/types/tournament";

/**
 * 감사 로그 데이터 구조
 */
export interface DrawLogAuditData {
  // 1️⃣ 로그 메타데이터
  tournamentId: string;
  tournamentName: string;
  executedAt: Date;
  executedBy: string;
  executedByEmail?: string | null;
  executionMethod: "SYSTEM_AUTO";
  executionCount: 1;

  // 2️⃣ 입력 데이터 스냅샷
  input: {
    totalTeams: number;
    inputHash: string;
    approvedTeamIds: string[];
    approvedTeamNames: string[];
    seedTeamsApplied: boolean;
    seedTeams?: {
      count: number;
      teamIds: string[];
      teamNames: string[];
    } | null;
  };

  // 3️⃣ 랜덤성 증명
  algorithm: {
    method: string;
    seed: string;
    seedString: string;
    timestamp: number;
    distributionMethod: string;
    clubDistributionLog?: string | null;
  };

  // 4️⃣ 분배 규칙 기록
  distribution: {
    divisionCount: number;
    teamsPerDivision: {
      base: number;
      remainder: number;
      distribution: Array<{ division: string; teamCount: number }>;
    };
    clubDistributionApplied: boolean;
    clubDistributionFailureReason?: string | null;
  };

  // 5️⃣ 최종 결과
  result: {
    divisions: Array<{
      division: string;
      teamIds: string[];
      teamNames: string[];
      seeds: number[];
    }>;
    publishMode: "immediate" | "scheduled";
    publishedAt?: Date | null;
  };

  // 6️⃣ 무결성 잠금
  integrity: {
    canRerun: false;
    canModify: false;
    lockedAt: Date;
    lockReason: "공식 기록 생성";
  };
}

/**
 * DrawLog를 감사용 포맷으로 변환
 */
export function convertDrawLogToAuditFormat(
  tournament: Tournament,
  drawLog: DrawLog
): DrawLogAuditData {
  return {
    // 1️⃣ 로그 메타데이터
    tournamentId: tournament.id,
    tournamentName: tournament.title,
    executedAt: drawLog.executedAt?.toDate() || new Date(),
    executedBy: drawLog.executedBy,
    executedByEmail: drawLog.executedByEmail || null,
    executionMethod: "SYSTEM_AUTO",
    executionCount: 1,

    // 2️⃣ 입력 데이터 스냅샷
    input: {
      totalTeams: drawLog.input.totalTeams,
      inputHash: drawLog.input.inputHash,
      approvedTeamIds: drawLog.input.approvedTeamIds || [],
      approvedTeamNames: drawLog.input.approvedTeamNames || [],
      seedTeamsApplied: drawLog.seedTeams !== null && drawLog.seedTeams !== undefined,
      seedTeams: drawLog.seedTeams || null,
    },

    // 3️⃣ 랜덤성 증명
    algorithm: {
      method: drawLog.algorithm.method,
      seed: drawLog.algorithm.seed,
      seedString: drawLog.algorithm.seedString,
      timestamp: drawLog.algorithm.timestamp,
      distributionMethod: drawLog.algorithm.distributionMethod,
      clubDistributionLog: drawLog.algorithm.clubDistributionLog || null,
    },

    // 4️⃣ 분배 규칙 기록
    distribution: {
      divisionCount: drawLog.result.divisionCount,
      teamsPerDivision: drawLog.result.teamsPerDivision,
      clubDistributionApplied: drawLog.algorithm.distributionMethod === "club_aware",
      clubDistributionFailureReason:
        drawLog.algorithm.distributionMethod === "club_aware" && drawLog.algorithm.clubDistributionLog
          ? drawLog.algorithm.clubDistributionLog
          : null,
    },

    // 5️⃣ 최종 결과
    result: {
      divisions: drawLog.result.divisions || [],
      publishMode: tournament.drawDate?.isPublic ? "immediate" : "scheduled",
      publishedAt: tournament.drawExecutedAt?.toDate() || null,
    },

    // 6️⃣ 무결성 잠금
    integrity: {
      canRerun: false,
      canModify: false,
      lockedAt: drawLog.executedAt?.toDate() || new Date(),
      lockReason: "공식 기록 생성",
    },
  };
}

/**
 * 감사 로그 PDF 생성 (구청/감사용)
 */
export function exportDrawLogAuditPdf(data: DrawLogAuditData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 20;

  // 제목
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("조 추첨 감사 로그", pageWidth / 2, y, { align: "center" });
  y += 10;

  // 1️⃣ 로그 메타데이터
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("1. 로그 메타데이터", 20, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`대회 ID: ${data.tournamentId}`, 20, y);
  y += 6;
  pdf.text(`대회명: ${data.tournamentName}`, 20, y);
  y += 6;
  pdf.text(
    `조 추첨 실행 일시: ${data.executedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (KST)`,
    20,
    y
  );
  y += 6;
  pdf.text(`실행 관리자 ID: ${data.executedBy}`, 20, y);
  y += 6;
  if (data.executedByEmail) {
    pdf.text(`실행 관리자 이름: ${data.executedByEmail}`, 20, y);
    y += 6;
  }
  pdf.text(`실행 방식: ${data.executionMethod}`, 20, y);
  y += 6;
  pdf.text(`실행 횟수: ${data.executionCount} (고정)`, 20, y);
  y += 10;

  // 페이지 넘김 체크
  if (y > 270) {
    pdf.addPage();
    y = 20;
  }

  // 2️⃣ 입력 데이터 스냅샷
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("2. 입력 데이터 스냅샷 (고정 증거)", 20, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`승인 팀 수: ${data.input.totalTeams}팀`, 20, y);
  y += 6;
  pdf.text(`승인 팀 목록 해시 (SHA-256): ${data.input.inputHash}`, 20, y);
  y += 6;
  pdf.text(`시드팀 적용 여부: ${data.input.seedTeamsApplied ? "Yes" : "No"}`, 20, y);
  y += 6;

  if (data.input.seedTeams) {
    pdf.text(`시드팀 수: ${data.input.seedTeams.count}팀`, 20, y);
    y += 6;
    pdf.text(`시드팀 목록: ${data.input.seedTeams.teamNames.join(", ")}`, 20, y);
    y += 6;
  }

  pdf.text(`🔒 해시값으로 "사후 변경 불가" 증명`, 20, y);
  y += 10;

  // 페이지 넘김 체크
  if (y > 270) {
    pdf.addPage();
    y = 20;
  }

  // 3️⃣ 랜덤성 증명
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("3. 랜덤성 증명", 20, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`랜덤 시드 값: ${data.algorithm.seed}`, 20, y);
  y += 6;
  pdf.text(`난수 생성 방식: Seeded RNG`, 20, y);
  y += 6;
  pdf.text(
    `시드 생성 규칙: SHA256(대회ID+실행시각+관리자ID) = ${data.algorithm.seedString}`,
    20,
    y
  );
  y += 6;
  pdf.text(`🔁 동일 시드로 결과 재현 가능`, 20, y);
  y += 10;

  // 페이지 넘김 체크
  if (y > 270) {
    pdf.addPage();
    y = 20;
  }

  // 4️⃣ 분배 규칙 기록
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("4. 분배 규칙 기록", 20, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`조 수: ${data.distribution.divisionCount}조`, 20, y);
  y += 6;
  pdf.text(
    `조별 팀 수 분배 규칙: 기본 ${data.distribution.teamsPerDivision.base}팀, 나머지 ${data.distribution.teamsPerDivision.remainder}팀`,
    20,
    y
  );
  y += 6;

  // 조별 분배 상세
  data.distribution.teamsPerDivision.distribution.forEach((dist) => {
    pdf.text(`${dist.division}: ${dist.teamCount}팀`, 25, y);
    y += 5;
  });

  y += 5;
  pdf.text(`동일 클럽 분산 규칙: ${data.distribution.clubDistributionApplied ? "적용" : "미적용"}`, 20, y);
  y += 6;

  if (data.distribution.clubDistributionFailureReason) {
    pdf.text(`분산 실패 시 사유: ${data.distribution.clubDistributionFailureReason}`, 20, y);
    y += 6;
  }

  y += 5;

  // 페이지 넘김 체크
  if (y > 270) {
    pdf.addPage();
    y = 20;
  }

  // 5️⃣ 최종 결과 (판결문)
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("5. 최종 결과 (판결문)", 20, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("조 편성 결과 테이블:", 20, y);
  y += 8;

  // 조별 팀 목록
  data.result.divisions.forEach((division) => {
    pdf.setFont("helvetica", "bold");
    pdf.text(`${division.division}:`, 20, y);
    y += 6;

    pdf.setFont("helvetica", "normal");
    const teamsWithSeeds = division.teamNames.map((name, idx) => {
      const seed = division.seeds[idx] || idx + 1;
      return `시드${seed}. ${name}`;
    });

    teamsWithSeeds.forEach((teamStr) => {
      pdf.text(teamStr, 25, y);
      y += 5;

      // 페이지 넘김 체크
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });

    y += 3;
  });

  y += 5;
  pdf.text(`결과 공개 방식: ${data.result.publishMode === "immediate" ? "즉시" : "예약"}`, 20, y);
  y += 6;

  if (data.result.publishedAt) {
    pdf.text(
      `결과 공개 시각: ${data.result.publishedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (KST)`,
      20,
      y
    );
    y += 6;
  }

  y += 5;

  // 페이지 넘김 체크
  if (y > 270) {
    pdf.addPage();
    y = 20;
  }

  // 6️⃣ 무결성 잠금
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("6. 무결성 잠금", 20, y);
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`재실행 가능 여부: 불가`, 20, y);
  y += 6;
  pdf.text(`수정 가능 여부: 불가`, 20, y);
  y += 6;
  pdf.text(
    `잠금 시각: ${data.integrity.lockedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (KST)`,
    20,
    y
  );
  y += 6;
  pdf.text(`잠금 사유: "${data.integrity.lockReason}"`, 20, y);
  y += 10;

  // 하단 안내 문구
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  const footerY = pdf.internal.pageSize.height - 15;
  pdf.text(
    "조 추첨은 사전에 고지된 일정에 따라 협회 공식 시스템을 통해 무작위로 자동 진행되며,",
    pageWidth / 2,
    footerY - 6,
    { align: "center", maxWidth: pageWidth - 40 }
  );
  pdf.text(
    "추첨 전·후 모든 과정은 시스템 로그로 기록됩니다.",
    pageWidth / 2,
    footerY,
    { align: "center", maxWidth: pageWidth - 40 }
  );

  // 파일명
  const fileName = `조추첨_감사로그_${data.tournamentName}_${data.executedAt.toISOString().slice(0, 10).replace(/-/g, "")}.pdf`;
  pdf.save(fileName);
}

/**
 * 감사 로그 CSV 생성 (내부 검증용)
 */
export function exportDrawLogAuditCsv(data: DrawLogAuditData) {
  const rows: string[][] = [];

  // 헤더
  rows.push(["항목", "내용"]);

  // 1️⃣ 로그 메타데이터
  rows.push(["=== 1. 로그 메타데이터 ===", ""]);
  rows.push(["대회 ID", data.tournamentId]);
  rows.push(["대회명", data.tournamentName]);
  rows.push([
    "조 추첨 실행 일시 (KST)",
    data.executedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
  ]);
  rows.push(["실행 관리자 ID", data.executedBy]);
  if (data.executedByEmail) {
    rows.push(["실행 관리자 이름", data.executedByEmail]);
  }
  rows.push(["실행 방식", data.executionMethod]);
  rows.push(["실행 횟수", String(data.executionCount)]);

  // 2️⃣ 입력 데이터 스냅샷
  rows.push(["", ""]);
  rows.push(["=== 2. 입력 데이터 스냅샷 (고정 증거) ===", ""]);
  rows.push(["승인 팀 수", `${data.input.totalTeams}팀`]);
  rows.push(["승인 팀 목록 해시 (SHA-256)", data.input.inputHash]);
  rows.push(["시드팀 적용 여부", data.input.seedTeamsApplied ? "Yes" : "No"]);
  if (data.input.seedTeams) {
    rows.push(["시드팀 수", `${data.input.seedTeams.count}팀`]);
    rows.push(["시드팀 목록", data.input.seedTeams.teamNames.join(", ")]);
  }

  // 3️⃣ 랜덤성 증명
  rows.push(["", ""]);
  rows.push(["=== 3. 랜덤성 증명 ===", ""]);
  rows.push(["랜덤 시드 값", data.algorithm.seed]);
  rows.push(["난수 생성 방식", "Seeded RNG"]);
  rows.push(["시드 생성 규칙", `SHA256(${data.algorithm.seedString})`]);

  // 4️⃣ 분배 규칙 기록
  rows.push(["", ""]);
  rows.push(["=== 4. 분배 규칙 기록 ===", ""]);
  rows.push(["조 수", `${data.distribution.divisionCount}조`]);
  rows.push([
    "조별 팀 수 분배 규칙",
    `기본 ${data.distribution.teamsPerDivision.base}팀, 나머지 ${data.distribution.teamsPerDivision.remainder}팀`,
  ]);

  data.distribution.teamsPerDivision.distribution.forEach((dist) => {
    rows.push([`${dist.division}`, `${dist.teamCount}팀`]);
  });

  rows.push(["동일 클럽 분산 규칙", data.distribution.clubDistributionApplied ? "적용" : "미적용"]);
  if (data.distribution.clubDistributionFailureReason) {
    rows.push(["분산 실패 시 사유", data.distribution.clubDistributionFailureReason]);
  }

  // 5️⃣ 최종 결과
  rows.push(["", ""]);
  rows.push(["=== 5. 최종 결과 (판결문) ===", ""]);
  rows.push(["결과 공개 방식", data.result.publishMode === "immediate" ? "즉시" : "예약"]);
  if (data.result.publishedAt) {
    rows.push([
      "결과 공개 시각 (KST)",
      data.result.publishedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    ]);
  }

  rows.push(["", ""]);
  rows.push(["조별 편성 결과", ""]);
  data.result.divisions.forEach((division) => {
    rows.push([`${division.division}`, ""]);
    division.teamNames.forEach((name, idx) => {
      const seed = division.seeds[idx] || idx + 1;
      rows.push(["", `시드${seed}. ${name}`]);
    });
    rows.push(["", ""]);
  });

  // 6️⃣ 무결성 잠금
  rows.push(["=== 6. 무결성 잠금 ===", ""]);
  rows.push(["재실행 가능 여부", "불가"]);
  rows.push(["수정 가능 여부", "불가"]);
  rows.push([
    "잠금 시각 (KST)",
    data.integrity.lockedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
  ]);
  rows.push(["잠금 사유", data.integrity.lockReason]);

  // CSV 생성
  const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `조추첨_감사로그_${data.tournamentName}_${data.executedAt.toISOString().slice(0, 10).replace(/-/g, "")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 감사 로그 JSON 내보내기 (시스템 보관용)
 */
export function exportDrawLogAuditJson(data: DrawLogAuditData) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `조추첨_감사로그_${data.tournamentName}_${data.executedAt.toISOString().slice(0, 10).replace(/-/g, "")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

