import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Volume2, FileDown, Search, Pause, SkipForward, Radio } from "lucide-react";

interface AIReport {
  id: string;
  createdAt?: any;
  summary?: string;
  totalReports?: number;
  pdfUrl?: string;
  ttsUrl?: string;
  period?: {
    from?: string;
    to?: string;
  };
}

export default function AIReportsDashboard() {
  const [reports, setReports] = useState<AIReport[]>([]);
  const [search, setSearch] = useState("");
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isRadioMode, setIsRadioMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const q = query(collection(db, "aiReports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as AIReport[]);
    });

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return reports.filter((report) => {
      const matchesSearch = report.summary?.toLowerCase().includes(search.toLowerCase()) ?? false;
      const withinDays =
        !filterDays ||
        (report.createdAt?.toDate &&
          now.getTime() - report.createdAt.toDate().getTime() < filterDays * 24 * 60 * 60 * 1000);
      return matchesSearch && withinDays;
    });
  }, [reports, search, filterDays]);

  const playAudio = (url: string | undefined, index: number) => {
    if (!url) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingIndex(index);
    audio.play().catch((error) => {
      console.error("TTS 재생 실패", error);
      setPlayingIndex(null);
    });

    audio.onended = () => {
      if (isRadioMode && index < filtered.length - 1) {
        playAudio(filtered[index + 1].ttsUrl, index + 1);
      } else {
        setPlayingIndex(null);
      }
    };
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingIndex(null);
    }
  };

  const skipNext = () => {
    if (playingIndex !== null && playingIndex < filtered.length - 1) {
      playAudio(filtered[playingIndex + 1].ttsUrl, playingIndex + 1);
    }
  };

  const startRadioMode = () => {
    setIsRadioMode(true);
    if (filtered.length > 0) {
      playAudio(filtered[0].ttsUrl, 0);
    }
  };

  const stopRadioMode = () => {
    setIsRadioMode(false);
    pauseAudio();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Radio className="text-pink-500" /> AI 리포트 라디오 🎧
      </h1>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-gray-500" />
          <Input
            placeholder="요약 내용 검색..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          {[null, 7, 30].map((days) => (
            <Button
              key={days ?? "all"}
              size="sm"
              variant={filterDays === days ? "default" : "outline"}
              onClick={() => setFilterDays(days)}
            >
              {days ? `최근 ${days}일` : "전체"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        {!isRadioMode ? (
          <Button onClick={startRadioMode} className="bg-pink-600 hover:bg-pink-700">
            <Radio className="mr-2 h-4 w-4" /> AI 라디오 시작
          </Button>
        ) : (
          <Button onClick={stopRadioMode} variant="destructive">
            <Pause className="mr-2 h-4 w-4" /> 라디오 중지
          </Button>
        )}
        <Button onClick={skipNext} variant="outline">
          <SkipForward className="mr-2 h-4 w-4" /> 다음
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">검색 결과가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((report, index) => {
            const createdAtText = report.createdAt?.toDate?.()?.toLocaleString?.("ko-KR") ?? "-";
            const periodFrom = report.period?.from ? report.period.from.slice(0, 10) : "-";
            const periodTo = report.period?.to ? report.period.to.slice(0, 10) : "-";

            return (
              <Card
                key={report.id}
                className={`rounded-2xl border ${
                  playingIndex === index ? "border-pink-400 shadow-pink-200 shadow-lg" : "border-gray-200"
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{createdAtText}</span>
                    <span className="text-xs text-gray-400">
                      {periodFrom} ~ {periodTo}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-line mb-3">{report.summary}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => report.pdfUrl && window.open(report.pdfUrl, "_blank")}>
                      <FileDown className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    {playingIndex === index ? (
                      <Button variant="secondary" size="sm" onClick={pauseAudio}>
                        <Pause className="mr-2 h-4 w-4 text-pink-600" /> 일시정지
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => playAudio(report.ttsUrl, index)}>
                        <Volume2 className="mr-2 h-4 w-4" /> 요약 듣기
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
