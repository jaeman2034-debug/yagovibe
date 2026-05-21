import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { sendSlackMessage, sendTelegramMessage } from "@/lib/notify";

export default function ReportExport() {
    const [isExporting, setIsExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // 🔊 브라우저 TTS → Blob 추출 (실험적, 브라우저 제한 시 업로드 생략)
    const generateTTSBlob = async (text: string): Promise<Blob | null> => {
        try {
            if (!("MediaRecorder" in window)) return null;
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const dest = audioContext.createMediaStreamDestination();
            const mediaRecorder = new MediaRecorder(dest.stream);
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            const endPromise = new Promise<Blob>((resolve) => {
                mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "audio/webm" }));
            });

            mediaRecorder.start();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang = "ko-KR";
            utter.pitch = 1;
            utter.rate = 1;
            // 주의: speechSynthesis 오디오는 WebAudio로 라우팅 보장이 안되며, 일부 브라우저에서 녹음이 되지 않을 수 있음
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utter);
            utter.onend = () => mediaRecorder.stop();

            const blob = await endPromise;
            return blob;
        } catch {
            return null;
        }
    };

    // 💾 PDF + 음성 자동 업로드
    const handleExportAndUpload = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        try {
            // 1) PDF 생성
            const canvas = await html2canvas(reportRef.current, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pageWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
            const pdfBlob = pdf.output("blob");

            // 2) 경로 준비
            const today = new Date().toISOString().slice(0, 10);
            const pdfPath = `reports/${today}/YAGO_Report.pdf`;
            const ttsPath = `reports/${today}/YAGO_Report_TTS.webm`;
            const pdfStorageRef = ref(storage, pdfPath);
            const ttsStorageRef = ref(storage, ttsPath);

            // 3) PDF 업로드
            await uploadBytes(pdfStorageRef, pdfBlob);
            const pdfURL = await getDownloadURL(pdfStorageRef);

            // 4) TTS 생성 및 업로드(가능한 경우)
            const reportText = document.querySelector("#report-summary")?.textContent || "";
            const ttsBlob = await generateTTSBlob(reportText);
            let ttsURL: string | null = null;
            if (ttsBlob) {
                await uploadBytes(ttsStorageRef, ttsBlob);
                ttsURL = await getDownloadURL(ttsStorageRef);
            }

            // 5) 알림 전송 (둘 중 환경변수 설정된 채널로 전송)
            const msg = `📊 YAGO SPORTS 주간 리포트 업로드 완료\n\n📄 PDF: ${pdfURL}\n${ttsURL ? `🔊 오디오: ${ttsURL}` : ""}`.trim();
            await Promise.all([
                sendSlackMessage(msg),
                sendTelegramMessage(msg),
            ]);

            alert("✅ 업로드 및 공유 완료");
            // 필요 시 Firestore 업데이트 로직 추가 가능
        } catch (err) {
            console.error("업로드 중 오류:", err);
            alert("업로드 실패: 콘솔을 확인하세요.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex flex-col items-center space-y-3 mt-6">
            <div className="flex space-x-3">
                <Button onClick={handleExportAndUpload} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isExporting}>
                    {isExporting ? "📤 업로드 중..." : "💾 PDF + 음성 자동 저장"}
                </Button>
            </div>

            {/* 리포트 미리보기 대상 */}
            <div ref={reportRef} id="report-summary" className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                <h2 className="text-lg font-bold mb-2">🧠 이번 주 AI 리포트 요약</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    이번 주 YAGO SPORTS 활동량은 지난 주 대비 22% 증가했습니다. 주요 인기 종목은 축구와 배드민턴이며, 신규 사용자 참여율이 꾸준히 상승 중입니다.
                </p>
            </div>
        </div>
    );
}


