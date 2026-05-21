import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Volume2, Download, Sparkles, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function MarketAIReportCard() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const normalizedQuery = query.trim() || "축구화";

  // AI 리포트 생성
  const handleGenerate = async () => {
    setLoading(true);
    setTimeout(() => {
      setReport(`📊 YAGO SPORTS AI 상품 리포트


상품명: ${normalizedQuery}
분석 요약: 이 상품은 지역 거래가 활발하며, 가격 대비 상태가 우수합니다.
AI 예측: 3일 내 판매 확률 91%
추천가: 19,800원
AI 의견: 가격을 약간 낮추면 조회수 상승 효과가 기대됩니다.`);
      setLoading(false);
    }, 1200);
  };

  // PDF 저장
  const handlePDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(report, 180);
    doc.text(lines, 10, 20);
    doc.save(`${normalizedQuery}_AI_Report.pdf`);
  };

  // 음성 읽기 (TTS)
  const handleSpeak = () => {
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
    utter.pitch = 1;
    utter.rate = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 w-full">
      <Card className="border shadow-lg rounded-2xl bg-gradient-to-b from-white to-gray-50 hover:shadow-xl transition-all duration-300 w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Sparkles className="text-blue-500 animate-pulse" />
            AI 리포트 생성기
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명을 입력하거나 음성으로 말하세요"
            className="focus:ring-2 focus:ring-blue-400"
          />

          <div className="border rounded-xl p-4 bg-gray-50 text-gray-700 min-h-[120px] text-sm whitespace-pre-wrap">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin w-4 h-4" /> AI 분석 중...
              </div>
            ) : report ? (
              report
            ) : (
              "AI 리포트를 생성하면 여기에 결과가 표시됩니다."
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-end">
          <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
            <FileText className="mr-2 h-4 w-4" />
            {loading ? "분석 중..." : "AI 리포트 생성"}
          </Button>

          <Button
            onClick={handlePDF}
            variant="outline"
            disabled={!report}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF 저장
          </Button>

          <Button
            onClick={handleSpeak}
            variant={speaking ? "destructive" : "secondary"}
            disabled={!report}
            className="w-full sm:w-auto"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {speaking ? "읽는 중..." : "TTS 재생"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
