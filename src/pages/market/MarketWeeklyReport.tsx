import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Volume2, Send, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function MarketWeeklyReport() {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // 🧠 주간 AI 리포트 생성 (mock)
  const generateWeeklyReport = async () => {
    setLoading(true);
    setTimeout(() => {
      setReport(`📅 YAGO SPORTS 주간 AI 리포트 (11월 6주차)

- 신규 등록 상품: 42건 (+12%)
- 거래 성사 건수: 31건 (+18%)
- 인기 카테고리: 축구 > 러닝 > 골프
- 평균 판매 가격: ₩37,200
- 노쇼 예측 감소율: 8%

AI 요약: 이번 주 거래 활성도는 전주 대비 17% 상승했으며, 특히 스포츠 의류 부문에서 성장이 두드러집니다.`);
      setLoading(false);
    }, 1500);
  };

  // 📄 PDF 내보내기
  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(report, 180);
    doc.text(lines, 10, 20);
    doc.save("Weekly_AI_Report.pdf");
  };

  // 🔊 TTS 읽기
  const speakTTS = () => {
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

  // 🔔 Slack 알림
  const sendToSlack = async () => {
    if (!report) return;
    const webhook = import.meta.env.VITE_SLACK_WEBHOOK_URL;
    if (!webhook) {
      alert("SLACK WEBHOOK URL이 설정되지 않았습니다.");
      return;
    }

    try {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `📢 YAGO SPORTS 주간 AI 리포트\n\n${report}`,
        }),
      });

      if (!response.ok) throw new Error("Slack 전송 실패");
      alert("Slack 채널로 리포트가 전송되었습니다!");
    } catch (error) {
      console.error("Slack webhook error", error);
      alert("Slack 전송 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card className="border shadow-lg rounded-2xl bg-gradient-to-b from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <FileText className="text-blue-500" /> AI 주간 리포트 자동 생성기
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="border rounded-xl p-4 bg-gray-50 text-gray-700 min-h-[160px] whitespace-pre-wrap text-sm">
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin w-4 h-4" /> AI 리포트 작성 중...
              </div>
            ) : report ? (
              report
            ) : (
              "AI 리포트를 생성하면 여기에 자동으로 출력됩니다."
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-end">
          <Button
            onClick={generateWeeklyReport}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <FileText className="mr-2 h-4 w-4" />
            {loading ? "생성 중..." : "AI 리포트 생성"}
          </Button>
          <Button
            onClick={exportPDF}
            variant="outline"
            disabled={!report}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" /> PDF 내보내기
          </Button>
          <Button
            onClick={speakTTS}
            variant={speaking ? "destructive" : "secondary"}
            disabled={!report}
            className="w-full sm:w-auto"
          >
            <Volume2 className="mr-2 h-4 w-4" /> {speaking ? "읽는 중..." : "TTS 재생"}
          </Button>
          <Button
            onClick={sendToSlack}
            variant="outline"
            disabled={!report}
            className="w-full sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" /> Slack 발송
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
