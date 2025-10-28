/**
 * 📄 AI 리포트를 간단한 텍스트 파일로 저장 (PDF 대체)
 */
export function exportReportPDF(content: string, type: "weekly" | "daily" = "weekly") {
    try {
        const date = new Date().toLocaleDateString("ko-KR");
        const filename = type === "weekly" ? "YAGO_VIBE_Weekly_Report" : "YAGO_VIBE_Daily_Report";

        const fullContent = `🎯 YAGO VIBE AI 리포트
생성일: ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${content}
`;

        // Blob으로 다운로드
        const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);

        console.log("✅ 리포트 저장 완료");
    } catch (error) {
        console.error("❌ 리포트 저장 오류:", error);
        alert("리포트 저장 중 오류가 발생했습니다.");
    }
}

/**
 * 📊 차트 포함 리포트 (향후 확장용)
 */
export function exportReportWithChart(summary: string, chartData?: any) {
    const date = new Date().toLocaleDateString("ko-KR");
    const fullContent = `📊 YAGO VIBE 상세 리포트
생성일: ${date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${summary}

${chartData ? "📈 통계 차트 (향후 구현)" : ""}
`;

    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `YAGO_VIBE_Detailed_Report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
}
