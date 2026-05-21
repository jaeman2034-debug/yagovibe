import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Volume2, Download, Sparkles, Loader2, Mic } from "lucide-react";
import jsPDF from "jspdf";

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export default function MarketAIReportCardTTS() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);

  const normalizedQuery = query.trim() || "축구화";

  // 🎙️ 음성 인식
  const handleVoiceInput = () => {
    if (typeof window === "undefined" || !window.webkitSpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다 😢");
      return;
    }

    try {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setQuery(text);
      };

      recognition.start();
    } catch (error) {
      console.error("Speech recognition error", error);
      setListening(false);
      alert("음성 인식 중 문제가 발생했습니다.");
    }
  };

  // 🤖 AI 리포트 생성 (mock)
  const handleGenerate = async () => {
    setLoading(true);
    setTimeout(() => {
      setReport(`📊 YAGO SPORTS AI 리포트

상품명: ${normalizedQuery}

상태: 매우 우수함
AI 예측: 3일 내 판매 확률 92%
추천가: 19,800원
AI 의견: 가격을 약간 낮추면 조회수 상승 효과 기대됨.`);
      setLoading(false);
    }, 1300);
  };

  // 📄 PDF 저장
  const handlePDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(report, 180);
    doc.text(lines, 10, 20);
    doc.save(`${normalizedQuery}_AI_Report.pdf`);
  };

  // 🔊 음성 읽기
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
      <Card className="border shadow-md rounded-2xl bg-gradient-to-b from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Sparkles className="text-blue-500 animate-pulse" />
            AI 리포트 & 음성 내보내기
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어나 상품명을 입력하거나 말하세요"
              className="focus:ring-2 focus:ring-blue-400 flex-1"
            />
            <Button
              onClick={handleVoiceInput}
              variant="outline"
              disabled={listening}
              className="w-full sm:w-auto"
            >
              {listening ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : (
                <Mic className="w-4 h-4 text-blue-500" />
              )}
            </Button>
          </div>

          <div className="border rounded-xl p-4 bg-gray-50 text-gray-700 min-h-[120px] whitespace-pre-wrap text-sm">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin w-4 h-4" /> AI 분석 중...
              </div>
            ) : report ? (
              report
            ) : (
              "AI 리포트가 여기에 표시됩니다."
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
