import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Clock,
  Heart,
  MessageCircle,
  FileText,
  Volume2,
  Download,
  Mic,
  Loader2,
  Sparkles,
} from "lucide-react";
import jsPDF from "jspdf";

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface MarketProduct {
  id: string;
  name?: string;
  price?: number;
  createdAt?: { seconds?: number };
  imageUrl?: string;
  location?: string;
  likes?: number;
  comments?: number;
}

export default function MarketPageAIReportFusion() {
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [queryText, setQueryText] = useState("");
  const [report, setReport] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, "marketProducts"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as MarketProduct[];
        setProducts(data);
      } catch (error) {
        console.error("🔥 Firestore fetch error:", error);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!queryText.trim()) return products;
    const lower = queryText.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(lower) ||
        p.location?.toLowerCase().includes(lower)
    );
  }, [products, queryText]);

  // 🎙️ 음성 인식 (STT)
  const handleVoiceSearch = () => {
    if (typeof window === "undefined" || !window.webkitSpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    try {
      const recognition = new window.webkitSpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setQueryText(text);
      };

      recognition.start();
    } catch (error) {
      console.error("Speech recognition error", error);
      setIsListening(false);
      alert("음성 인식 중 문제가 발생했습니다.");
    }
  };

  // 🔹 AI 리포트 생성 (mock)
  const generateReport = () => {
    if (!queryText.trim()) {
      alert("먼저 상품명 또는 검색어를 입력하세요.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setReport(`📊 YAGO SPORTS AI 리포트

상품명: ${queryText}
상품 상태: A급
예측 거래 확률: 92%
추천 판매가: 19,800원
AI 분석: 이 상품은 조회수 대비 전환율이 높으며, 가격을 약간 조정하면 빠른 거래가 예상됩니다.`);
      setIsLoading(false);
    }, 1200);
  };

  // 🔹 PDF 내보내기
  const exportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(report, 180);
    doc.text(lines, 10, 20);
    doc.save(`${(queryText || "AI_Report").replace(/\s+/g, "_")}.pdf`);
  };

  // 🔹 음성 리포트 읽기 (TTS)
  const handleSpeak = () => {
    if (!report) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("이 브라우저는 음성 합성을 지원하지 않습니다.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utter = new SpeechSynthesisUtterance(report);
    utter.lang = "ko-KR";
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleVoiceSearch}
            variant="outline"
            disabled={isListening}
            className="transition-opacity duration-200 hover:opacity-90"
          >
            {isListening ? (
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            ) : (
              <Mic className="w-4 h-4 text-primary" />
            )}
            <span className="ml-2">
              {isListening ? "듣는 중..." : "AI 음성 검색"}
            </span>
          </Button>

          <Button
            onClick={generateReport}
            disabled={isLoading}
            className="transition-opacity duration-200 hover:opacity-90"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isLoading ? "분석 중..." : "AI 리포트 생성"}
          </Button>

          <Button
            onClick={exportPDF}
            variant="outline"
            disabled={!report}
            className="transition-opacity duration-200 hover:opacity-90"
          >
            <Download className="mr-2 h-4 w-4" /> PDF 저장
          </Button>

          <Button
            onClick={handleSpeak}
            variant={isSpeaking ? "destructive" : "secondary"}
            disabled={!report}
            className="transition-opacity duration-200 hover:opacity-90"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {isSpeaking ? "읽는 중..." : "TTS 재생"}
          </Button>
        </div>

        <Input
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="상품명을 입력하거나 말하세요"
          className="w-full sm:w-1/2"
        />
      </div>

      {/* 상품 리스트 */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">검색된 상품이 없습니다.</p>
        ) : (
          filtered.map((p) => (
            <Card
              key={p.id}
              className="border rounded-2xl shadow-sm hover:shadow-xl transition-shadow duration-200"
            >
              <CardContent className="flex flex-row md:flex-col items-center gap-4 p-4">
                <div className="w-[120px] h-[120px] md:w-full md:h-64 overflow-hidden rounded-xl border bg-white">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 text-left gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{p.name}</h2>
                    <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {p.location || "위치정보 없음"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {p.createdAt?.seconds
                          ? new Date(p.createdAt.seconds * 1000).toLocaleDateString("ko-KR")
                          : "날짜 없음"}
                      </span>
                    </div>
                  </div>
                  <div className="text-primary font-semibold text-base">
                    {p.price?.toLocaleString() || 0}원
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {p.likes ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {p.comments ?? 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* AI 리포트 카드 */}
      <Card className="border shadow-lg rounded-2xl bg-gradient-to-b from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <FileText className="text-blue-500" /> AI 리포트 결과
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="min-h-[140px] border rounded-lg p-4 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
            {isLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin w-4 h-4" /> 분석 중...
              </div>
            ) : report ? (
              report
            ) : (
              "아직 리포트가 생성되지 않았습니다."
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-end text-xs text-gray-500">
          YAGO SPORTS AI Engine © 2025
        </CardFooter>
      </Card>
    </div>
  );
}
