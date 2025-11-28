import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Volume2, Search, Share2, Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";

interface Report {
  id: string;
  name: string;
  analysis?: { summary?: string; category?: string };
  pdfUrl?: string;
  audioUrl?: string;
  createdAt?: any;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"latest" | "oldest">("latest");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const apiBase = import.meta.env.VITE_API_BASE_URL || "https://aianalyze-2q3hdcfwca-uc.a.run.app";
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const functions = getFunctions();

  const handleExportPDF = async (reportId: string) => {
    try {
      const generate = httpsCallable(functions, "generateReportPdf");
      const result: any = await generate({ reportId });
      const url = result?.data?.url;
      if (url) {
        toast.success("📄 PDF 리포트가 생성되었습니다!");
        window.open(url, "_blank");
      } else {
        toast.error("PDF URL을 가져오지 못했습니다.");
      }
    } catch (error) {
      console.error(error);
      toast.error("PDF 생성 중 오류 발생");
    }
  };

  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Report[];
      setReports(data);
    });
    return () => unsub();
  }, []);

  const startVoiceSearch = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognitionConstructor =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = async (event: any) => {
      const transcript: string = event.results[0][0].transcript;
      console.log("🎙️ 음성 입력:", transcript);

      // Firebase Functions NLU 엔드포인트 사용
      const nluEndpoint = import.meta.env.VITE_NLU_ENDPOINT || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/nluHandler";

      try {
        const res = await fetch(nluEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcript }),
        });
        const nluData = await res.json();
        const intent = nluData.intent || "unknown";
        const category = nluData.category;

        if (intent.includes("all") || transcript.includes("모든")) {
          setSearch("");
          setFilterCategory("all");
          toast.success("📄 전체 리포트 표시");
        } else if (intent.includes("search") || transcript.includes("리포트")) {
          if (category) {
            setFilterCategory(category);
            toast.success(`📁 ${category} 리포트 필터 적용`);
          } else {
            setSearch(transcript);
            toast.success("🔍 음성 검색 적용");
          }
        }

        if (intent.includes("read") || transcript.includes("읽어")) {
          const summaryToRead = filteredReports[0]?.analysis?.summary || "리포트 요약이 없습니다.";
          const utterance = new SpeechSynthesisUtterance(summaryToRead);
          utterance.lang = "ko-KR";
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
      } catch (error) {
        console.error("NLU 요청 실패", error);
        toast.error("음성 명령 처리 중 오류");
      }
    };

    recognition.start();
  };

  const filteredReports = useMemo(() => {
    let list = [...reports];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.name?.toLowerCase().includes(term) || r.analysis?.summary?.toLowerCase().includes(term),
      );
    }

    if (filterCategory !== "all") {
      list = list.filter((r) => r.analysis?.category === filterCategory);
    }

    list.sort((a, b) => {
      const t1 = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const t2 = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return sort === "latest" ? t2 - t1 : t1 - t2;
    });

    return list;
  }, [reports, search, sort, filterCategory]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">📊 AI 리포트 대시보드</h1>

      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-gray-50 p-4 rounded-lg">
        <div className="relative w-full md:w-1/3">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="상품명 또는 요약으로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex gap-3 flex-wrap justify-end w-full md:w-auto">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 카테고리</SelectItem>
              <SelectItem value="축구">⚽ 축구</SelectItem>
              <SelectItem value="야구">⚾ 야구</SelectItem>
              <SelectItem value="테니스">🎾 테니스</SelectItem>
              <SelectItem value="골프">⛳ 골프</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value: "latest" | "oldest") => setSort(value)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">최신 순</SelectItem>
              <SelectItem value="oldest">오래된 순</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={isListening ? "destructive" : "default"} size="sm" onClick={startVoiceSearch}>
            {isListening ? (
              <>
                <MicOff className="w-4 h-4 mr-1 animate-pulse" /> 듣는 중…
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-1" /> 음성 명령
              </>
            )}
          </Button>
        </div>
      </div>

      {filteredReports.length === 0 && <p className="text-center text-gray-500 mt-4">리포트가 없습니다 😅</p>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((r) => (
          <Card key={r.id} className="shadow-sm hover:shadow-lg transition">
            <CardHeader>
              <CardTitle className="truncate">{r.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-700 line-clamp-3">
                {r.analysis?.summary || "요약 정보 없음"}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {r.pdfUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(r.pdfUrl, "_blank")}
                  >
                    <FileText className="w-4 h-4 mr-1" /> PDF 보기
                  </Button>
                )}
                {r.audioUrl && (
                  <Button variant="default" size="sm" onClick={() => new Audio(r.audioUrl).play()}>
                    <Volume2 className="w-4 h-4 mr-1" /> 음성 듣기
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => handleExportPDF(r.id)}>
                  📄 PDF 내보내기
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    toast("AI PDF/TTS 생성 중입니다…", { duration: 2000 });
                    try {
                      const res = await fetch(`${apiBase}/ai/report/generate`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reportId: r.id, name: r.name }),
                      });
                      const data = await res.json();
                      if (data.ok) {
                        toast.success("✅ AI 리포트 생성 완료!");
                      } else {
                        toast.error("생성 실패 ❌");
                      }
                    } catch (err) {
                      console.error(err);
                      toast.error("AI 리포트 생성 중 오류 발생");
                    }
                  }}
                >
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" /> AI 리포트 생성
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${apiBase}/ai/slack/share`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          text: `📢 ${r.name} 리포트 공유됨!\n${r.analysis?.summary}`,
                          pdfUrl: r.pdfUrl,
                          audioUrl: r.audioUrl,
                        }),
                      });
                      if (res.ok) {
                        toast.success("💬 Slack으로 전송 완료!");
                      } else {
                        toast.error("Slack 전송 실패 ❌");
                      }
                    } catch (error) {
                      console.error(error);
                      toast.error("Slack 전송 중 오류 발생");
                    }
                  }}
                >
                  <Share2 className="w-4 h-4 mr-1" /> Slack 공유
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {r.createdAt?.toDate
                  ? r.createdAt.toDate().toLocaleString("ko-KR")
                  : "날짜 없음"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
