import React, { useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";

interface Step34_EpubSmilButtonProps {
    reportId: string;
    className?: string;
}

/**
 * Step 34: EPUB(SMIL) Read-Aloud 내보내기 버튼 컴포넌트
 * Firebase Functions의 generateReportEpubSmil를 호출하여 EPUB(SMIL) 생성 및 다운로드
 */
export default function Step34_EpubSmilButton({ reportId, className }: Step34_EpubSmilButtonProps) {
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
            
            const url = `${functionsOrigin}/generateReportEpubSmil?reportId=${encodeURIComponent(reportId)}`;
            
            console.log("📚 EPUB(SMIL) 생성 요청:", url);

            const res = await fetch(url);
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error("EPUB(SMIL) 생성 실패:", errorText);
                alert(`EPUB(SMIL) 생성 실패: ${errorText}`);
                return;
            }

            // EPUB Blob로 변환
            const blob = await res.blob();
            
            // 다운로드
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `AIReport_${reportId}_ReadAloud.epub`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 메모리 정리
            URL.revokeObjectURL(a.href);
            
            console.log("✅ EPUB(SMIL) 다운로드 완료");
        } catch (error) {
            console.error("❌ EPUB(SMIL) 생성 오류:", error);
            alert(`EPUB(SMIL) 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "Unknown error"}`);
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
                    <BookOpen className="w-4 h-4" />
                    <span>Read‑Aloud EPUB 만들기</span>
                </>
            )}
        </button>
    );
}
