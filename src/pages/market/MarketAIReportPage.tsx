import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Volume2, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function MarketAIReportPage() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // 🧠 AI 리포트 생성
  const generateAIReport = async () => {
    if (!query.trim()) {
      setQuery("축구공");
    }

    setLoading(true);
    setTimeout(() => {
      setReport(`📊 YAGO SPORTS AI 상품 분석 리포트


상품명: ${query || "축구공"}
품질 상태: 중고 A급
거래 예측: 3일 내 판매 확률 87%
AI 요약: 이 상품은 상태가 우수하며, 지역 내 거래 가능성이 높습니다.`);
      setLoading(false);
    }, 1200);
  };

  // 📄 PDF 내보내기
  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(report, 180);
    doc.text(lines, 10, 20);
    doc.save("AI_Report.pdf");
  };

  // 🔊 음성 재생
  const speakReport = () => {
    if (!report) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("이 브라우저는 음성 합성을 지원하지 않습니다.");
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utter = new SpeechSynthesisUtterance(report);
    utter.lang = "ko-KR";
    utter.pitch = 1.1;
    utter.rate = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <Card className="shadow-md border rounded-2xl p-4 w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="text-primary" />
            AI 리포트 생성기
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명을 입력하거나 음성으로 말하세요"
            className="w-full"
          />
          <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-700 min-h-[120px]">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin" /> AI 분석 중...
              </div>
            ) : report ? (
              <pre className="whitespace-pre-wrap">{report}</pre>
            ) : (
              "AI 리포트를 생성하면 여기에 결과가 표시됩니다."
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-3 w-full">
          <Button
            onClick={generateAIReport}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <FileText className="mr-2 h-4 w-4" /> {loading ? "생성 중..." : "리포트 생성"}
          </Button>
          <Button
            onClick={exportPDF}
            variant="outline"
            disabled={!report}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" /> PDF 저장
          </Button>
          <Button
            onClick={speakReport}
            variant={speaking ? "destructive" : "secondary"}
            disabled={!report}
            className="w-full sm:w-auto"
          >
            <Volume2 className="mr-2 h-4 w-4" /> {speaking ? "읽는 중..." : "TTS 재생"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
