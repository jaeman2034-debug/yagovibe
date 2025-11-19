import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

interface Step31_PDFExportButtonProps {
    reportId: string;
    className?: string;
}

/**
 * Step 31: PDF 내보내기 버튼 컴포넌트
 * Firebase Functions의 generateReportPdf를 호출하여 PDF 생성 및 다운로드
 */
export default function Step31_PDFExportButton({ reportId, className }: Step31_PDFExportButtonProps) {
    const [loading, setLoading] = useState(false);

    const onClick = async () => {
        if (!reportId) {
            alert("리포트 ID가 필요합니다.");
            return;
        }

        setLoading(true);
        try {
            // Firebase Functions URL (환경에 따라 다름)
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
            
            const url = `${functionsOrigin}/generateReportPdf?reportId=${encodeURIComponent(reportId)}`;
            
            console.log("📄 PDF 생성 요청:", url);

            const res = await fetch(url);
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error("PDF 생성 실패:", errorText);
                alert(`PDF 생성 실패: ${errorText}`);
                return;
            }

            // PDF Blob로 변환
            const blob = await res.blob();
            
            // 다운로드
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `AIReport_${reportId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 메모리 정리
            URL.revokeObjectURL(a.href);
            
            console.log("✅ PDF 다운로드 완료");
        } catch (error) {
            console.error("❌ PDF 생성 오류:", error);
            alert(`PDF 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={onClick}
            disabled={loading || !reportId}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`}
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>생성 중...</span>
                </>
            ) : (
                <>
                    <FileDown className="w-4 h-4" />
                    <span>PDF 내보내기</span>
                </>
            )}
        </button>
    );
}

