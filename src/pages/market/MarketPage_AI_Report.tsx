import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Volume2, Download } from "lucide-react";
import jsPDF from "jspdf";

export default function MarketPageAIReport() {
  const [report, setReport] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 🧠 AI 리포트 생성 (mock 예시)
  const generateReport = () => {
    const text = `
    📊 YAGO SPORTS AI 리포트
    - 상품명: 축구공
    - 분석요약: 품질 양호, 중고 A급 상태. 
    - 판매예측: 85% 확률로 3일 내 거래 성사 예상.
    `;
    setReport(text);
  };

  // 📄 PDF 생성
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(report || "AI 리포트를 먼저 생성해주세요.", 10, 20);
    doc.save("AI_Report.pdf");
  };

  // 🔊 TTS 음성 재생
  const speakTTS = () => {
    if (!report) return;
    const utterance = new SpeechSynthesisUtterance(report);
    utterance.lang = "ko-KR";
    setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="p-4 flex flex-col gap-4 max-w-3xl mx-auto">
      <Card className="shadow-md border rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-primary" /> AI 리포트 생성기
          </CardTitle>
        </CardHeader>

        <CardContent>
          {report ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
              {report}
            </pre>
          ) : (
            <p className="text-gray-400">AI 리포트를 생성하세요.</p>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={generateReport} className="flex items-center gap-2">
            <FileText size={18} /> 리포트 생성
          </Button>
          <Button onClick={exportPDF} variant="outline" className="flex items-center gap-2">
            <Download size={18} /> PDF 내보내기
          </Button>
          <Button
            onClick={speakTTS}
            disabled={isSpeaking || !report}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Volume2 size={18} /> {isSpeaking ? "읽는 중..." : "TTS 읽기"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
