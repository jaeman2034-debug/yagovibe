import React, { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Download,
  Link as LinkIcon,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";

interface Report {
  id: string;
  title?: string;
  ttsUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  notionUrl?: string;
  date?: any;
  summary?: string;
  [key: string]: any;
}

export default function TTSAudioPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [current, setCurrent] = useState<Report | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const audioRef = useRef<HTMLAudioElement>(null);

  // Firestore에서 reports 실시간 구독
  useEffect(() => {
    const q = query(collection(db, "reports"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Report[];
        setReports(data);
        setLoading(false);

        // 첫 번째 리포트를 기본 선택
        if (!current && data.length > 0) {
          setCurrent(data[0]);
        }
      },
      (error) => {
        console.error("Firestore 구독 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [current]);

  // 현재 리포트의 TTS URL (audioUrl 우선, 없으면 ttsUrl)
  const currentTtsUrl = useMemo(() => {
    return current?.audioUrl || current?.ttsUrl || null;
  }, [current]);

  // 검색 필터링된 리포트 목록
  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    return reports.filter(
      (r) =>
        r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [reports, searchTerm]);

  // 오디오 메타데이터 로드
  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  // 재생 시간 업데이트
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  // 재생/정지 토글
  const togglePlay = () => {
    if (!audioRef.current || !currentTtsUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error("오디오 재생 오류:", error);
      });
    }
  };

  // 탐색 (초 단위)
  const seekTo = (seconds: number) => {
    if (!audioRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    audioRef.current.currentTime = clamped;
    setProgress(clamped);
  };

  // 탐색 슬라이더 변경
  const onSeekSlider = (values: number[]) => {
    const newTime = values[0];
    seekTo(newTime);
  };

  // 볼륨 슬라이더 변경
  const onVolumeSlider = (values: number[]) => {
    const newVolume = values[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setMuted(false);
    }
  };

  // 음소거 토글
  const toggleMute = () => {
    if (!audioRef.current) return;
    if (muted) {
      audioRef.current.volume = volume;
      setMuted(false);
    } else {
      audioRef.current.volume = 0;
      setMuted(true);
    }
  };

  // 링크 복사
  const copyLink = (url: string | null | undefined) => {
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert("링크가 클립보드에 복사되었습니다.");
      })
      .catch((error) => {
        console.error("링크 복사 실패:", error);
        alert("링크 복사에 실패했습니다.");
      });
  };

  // 시간 포맷 (초 → MM:SS)
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // 리포트 선택
  const selectReport = (report: Report) => {
    setCurrent(report);
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
    }
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 중이면 제외
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.target && (e.target as HTMLElement).tagName === "TEXTAREA") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(progress + 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(progress - 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          onVolumeSlider([Math.min(1, volume + 0.05)]);
          break;
        case "ArrowDown":
          e.preventDefault();
          onVolumeSlider([Math.max(0, volume - 0.05)]);
          break;
        case "KeyC":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            copyLink(currentTtsUrl);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [progress, volume, currentTtsUrl, isPlaying, duration]);

  // 볼륨 변경 시 오디오 요소 업데이트
  useEffect(() => {
    if (audioRef.current && !muted) {
      audioRef.current.volume = volume;
    }
  }, [volume, muted]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="animate-spin w-8 h-8 text-indigo-600" />
        <p className="ml-3 text-gray-600 dark:text-gray-400">리포트 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          🔊 TTS 음성 리포트 플레이어
        </h1>
      </div>

      {/* 리포트 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>리포트 목록</CardTitle>
          <Input
            placeholder="검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-2"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredReports.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                리포트가 없습니다.
              </p>
            ) : (
              filteredReports.map((report) => {
                const dateStr = report.date?.toDate
                  ? report.date.toDate().toISOString().slice(0, 10)
                  : report.date
                  ? new Date(report.date).toISOString().slice(0, 10)
                  : "날짜 미상";

                return (
                  <div
                    key={report.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      current?.id === report.id
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => selectReport(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          {report.title || `리포트 ${report.id}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{dateStr}</p>
                        {report.summary && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                            {report.summary}
                          </p>
                        )}
                      </div>
                      {report.audioUrl || report.ttsUrl ? (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">🎧</span>
                      ) : (
                        <span className="ml-2 text-xs text-gray-400">⏳</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 하단 고정 오디오 플레이어 */}
      <Card className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-lg border-t-2 border-indigo-500 bg-white dark:bg-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">오디오 플레이어</CardTitle>
        </CardHeader>
        <CardContent>
          {current ? (
            <div className="space-y-4">
              {/* 리포트 정보 */}
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {current.title || `리포트 ${current.id}`}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {current.summary ? (
                    <span className="line-clamp-2">{current.summary}</span>
                  ) : (
                    "요약 정보가 없습니다."
                  )}
                </p>
              </div>

              {/* 재생 컨트롤 */}
              <div className="space-y-3">
                {/* 재생 버튼 및 시간 */}
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => seekTo(progress - 5)}
                    disabled={!currentTtsUrl}
                    title="5초 뒤로"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="default"
                    onClick={togglePlay}
                    disabled={!currentTtsUrl}
                    className="w-12 h-12"
                    title={isPlaying ? "정지" : "재생"}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>

                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => seekTo(progress + 5)}
                    disabled={!currentTtsUrl}
                    title="5초 앞으로"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>

                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                      {formatTime(progress)}
                    </span>
                    <Slider
                      value={[progress]}
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={onSeekSlider}
                      disabled={!currentTtsUrl}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* 다운로드 및 링크 복사 */}
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" disabled={!currentTtsUrl} asChild size="sm">
                      <a href={currentTtsUrl || "#"} download target="_blank" rel="noreferrer">
                        <Download className="h-4 w-4 mr-1" /> 다운로드
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!currentTtsUrl}
                      onClick={() => copyLink(currentTtsUrl)}
                      size="sm"
                    >
                      <LinkIcon className="h-4 w-4 mr-1" /> 링크 복사
                    </Button>
                    {current.pdfUrl && (
                      <Button variant="secondary" asChild size="sm">
                        <a href={current.pdfUrl} target="_blank" rel="noreferrer">
                          <FileText className="h-4 w-4 mr-1" /> PDF 보기
                        </a>
                      </Button>
                    )}
                    {current.notionUrl && (
                      <Button variant="secondary" asChild size="sm">
                        <a href={current.notionUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" /> Notion 보기
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* 볼륨 컨트롤 */}
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:min-w-[260px]">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleMute}
                      title={muted ? "음소거 해제" : "음소거"}
                      className="h-8 w-8"
                    >
                      {muted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <Slider
                        value={[muted ? 0 : volume]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={onVolumeSlider}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 실제 오디오 엘리먼트 */}
              <audio
                ref={audioRef}
                src={currentTtsUrl || undefined}
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                preload="none"
                className="hidden"
              />
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              선택된 리포트가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 접근성 & 단축키 안내 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-2 z-30" style={{ marginTop: "auto" }}>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
          ⌨️ <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">Space</kbd>: 재생/정지 · 
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 mx-1">←</kbd>/<kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">→</kbd>: 5초 탐색 · 
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 mx-1">↑</kbd>/<kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">↓</kbd>: 볼륨 · 
          <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 mx-1">Ctrl/Cmd</kbd>+<kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">C</kbd>: 링크 복사
        </p>
      </div>
    </div>
  );
}

