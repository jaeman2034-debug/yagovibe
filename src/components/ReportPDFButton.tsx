import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import jsPDF from "jspdf";

/**
 * 📄 AI 리포트 PDF 생성 버튼
 * Firestore 데이터 로드 → jsPDF로 PDF 생성 → 브라우저 다운로드
 */
export default function ReportPDFButton() {
    const [loading, setLoading] = useState(false);

    const handleGeneratePDF = async () => {
        try {
            setLoading(true);

            // ✅ Firestore에서 주간 데이터 가져오기
            const summaryRef = doc(db, "reports/weekly/data/summary");
            const analyticsRef = doc(db, "reports/weekly/data/analytics");
            
            const summarySnap = await getDoc(summaryRef);
            const analyticsSnap = await getDoc(analyticsRef);

            const summary = summarySnap.exists() ? summarySnap.data() : null;
            const analytics = analyticsSnap.exists() ? analyticsSnap.data() : null;

            // ✅ PDF 생성 (영문만 지원 - 한글은 기본 폰트로 처리)
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            let y = 60;

            // 제목
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(20);
            pdf.text("YAGO VIBE SPORTS - AI Weekly Report", 40, y);
            y += 25;

            // 생성일
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toISOString().split("T")[0]}`, 40, y);
            y += 30;

            // 요약 정보
            if (summary) {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.text("Weekly Summary", 40, y);
                y += 20;

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(11);
                pdf.text(`- New Users: ${summary.newUsers}`, 50, y);
                y += 18;
                pdf.text(`- Active Users: ${summary.activeUsers}`, 50, y);
                y += 18;
                pdf.text(`- Growth Rate: ${summary.growthRate}`, 50, y);
                y += 18;
                
                // 하이라이트
                const highlightText = summary.highlight?.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || "";
                if (highlightText) {
                    const highlightLines = pdf.splitTextToSize(`- Highlight: ${highlightText}`, pageWidth - 100);
                    for (let i = 0; i < highlightLines.length && y < pageHeight - 60; i++) {
                        pdf.text(highlightLines[i], 50, y);
                        y += 18;
                    }
                }
                
                pdf.text(`- Recommendation: ${summary.recommendation}`, 50, y);
                y += 30;
            }

            // 통계 차트 데이터
            if (analytics && analytics.labels && analytics.newUsers && analytics.activeUsers) {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.text("Weekly Statistics", 40, y);
                y += 25;

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                
                // 테이블 헤더
                pdf.text("Week", 50, y);
                pdf.text("New Users", 120, y);
                pdf.text("Active Users", 200, y);
                y += 20;

                // 데이터 행
                for (let i = 0; i < Math.min(analytics.labels.length, analytics.newUsers.length, analytics.activeUsers.length); i++) {
                    pdf.text(`Week ${i + 1}`, 50, y);
                    pdf.text(`${analytics.newUsers[i]}`, 120, y);
                    pdf.text(`${analytics.activeUsers[i]}`, 200, y);
                    y += 18;
                }
            }

            // ✅ 브라우저에서 즉시 다운로드
            pdf.save(`AI_Weekly_Report_${new Date().toISOString().split("T")[0]}.pdf`);

            console.log("✅ PDF 생성 및 다운로드 완료!");
            alert("✅ 리포트 PDF가 다운로드되었습니다!");
        } catch (err) {
            console.error("❌ PDF 생성 실패:", err);
            alert("PDF 생성 중 오류가 발생했습니다: " + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3 mt-4">
            <button
                onClick={handleGeneratePDF}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
                {loading ? "📄 생성 중..." : "📄 AI 리포트 PDF 생성"}
            </button>
        </div>
    );
}
