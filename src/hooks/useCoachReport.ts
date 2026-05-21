/**
 * 🔥 useCoachReport - 코치 리포트 생성 훅
 * 
 * 역할:
 * - 경기 전 리포트 생성
 * - 리포트 다운로드
 * 
 * UX 목적:
 * - 코치에게 가치 전달
 */

import { useMemo } from "react";
import { useCoachDashboard } from "./useCoachDashboard";
import {
  generatePreMatchReport,
  formatReportAsText,
  formatReportAsHTML,
  type CoachReport,
} from "@/services/coachReportService";

/**
 * 🔥 코치 리포트 생성 훅
 * 
 * @param playerUids 선수 UID 목록
 * @param teamName 팀 이름
 * @returns 리포트, 리포트 생성 함수
 */
export function useCoachReport(playerUids: string[], teamName: string) {
  const { dashboard, loading } = useCoachDashboard(playerUids, "all");

  const report = useMemo<CoachReport | null>(() => {
    if (!dashboard || loading) {
      return null;
    }

    return generatePreMatchReport(dashboard, teamName);
  }, [dashboard, teamName, loading]);

  const downloadAsText = () => {
    if (!report) return;

    const text = formatReportAsText(report);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${teamName}_경기전리포트_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsHTML = () => {
    if (!report) return;

    const html = formatReportAsHTML(report);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${teamName}_경기전리포트_${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!report) return;

    const html = formatReportAsHTML(report);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return {
    report,
    loading,
    downloadAsText,
    downloadAsHTML,
    printReport,
  };
}
