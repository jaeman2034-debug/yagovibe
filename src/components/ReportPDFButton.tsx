import React, { useState } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PDFDocument, rgb } from "pdf-lib";

/**
 * 📄 AI 리포트 PDF 생성 버튼
 * pdf-lib로 PDF 생성 → Firebase Storage 업로드 → n8n 자동 전송
 */
export default function ReportPDFButton() {
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const handleGeneratePDF = async () => {
        try {
            setLoading(true);

            // ✅ PDF 생성
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([600, 400]);
            const { width, height } = page.getSize();

            page.drawText("📊 YAGO VIBE AI 요약 리포트", {
                x: 50,
                y: height - 80,
                size: 24,
                color: rgb(0.2, 0.2, 0.8),
            });

            page.drawText(`- 신규 가입자: +23% 증가`, { x: 70, y: height - 140, size: 14 });
            page.drawText(`- 경기북부 활동 +15%`, { x: 70, y: height - 160, size: 14 });
            page.drawText(`- 추천 액션: UX 개선 캠페인 제안`, { x: 70, y: height - 180, size: 14 });

            const pdfBytes = await pdfDoc.save();

            // ✅ Firebase Storage 업로드
            const fileRef = ref(storage, `reports/weekly_report_${Date.now()}.pdf`);
            await uploadBytes(fileRef, pdfBytes);
            const url = await getDownloadURL(fileRef);
            setPdfUrl(url);

            console.log("✅ PDF 업로드 완료:", url);

            // ✅ n8n 자동 전송 (이메일 발송 트리거)
            try {
                const response = await fetch("https://n8n.yagovibe.com/webhook/weekly-report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pdfUrl: url,
                        generatedAt: new Date().toISOString(),
                        reportType: "weekly",
                        triggeredBy: "admin_dashboard",
                    }),
                });

                if (response.ok) {
                    console.log("✅ n8n 웹훅 전송 성공");
                } else {
                    console.warn("⚠️ n8n 웹훅 응답 오류:", response.status);
                }
            } catch (webhookError) {
                console.warn("⚠️ n8n 웹훅 전송 실패 (무시 가능):", webhookError);
            }

            alert("✅ 리포트 생성 및 업로드 완료!");
        } catch (err) {
            console.error("❌ PDF 생성 실패:", err);
            alert("PDF 생성 중 오류가 발생했습니다.");
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

            {pdfUrl && (
                <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline hover:text-blue-700"
                >
                    📥 리포트 다운로드
                </a>
            )}
        </div>
    );
}
