import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { Highlighter, Loader2, Search, Play, Pause, Volume2 } from "lucide-react";

interface AIReportHighlightPanelProps {
    reportId: string;
    routes?: {
        market?: string;
        team?: string;
        map?: string;
    };
}

interface SentenceTimestamp {
    start: number;
    end: number;
}

interface HighlightSegment {
    text: string;
    key?: boolean;
}

export default function AIReportHighlightPanel({ reportId, routes = {} }: AIReportHighlightPanelProps) {
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<string>("");
    const [keywords, setKeywords] = useState<string[]>([]);
    const [audioUrl, setAudioUrl] = useState<string>("");
    const [sentenceTimestamps, setSentenceTimestamps] = useState<SentenceTimestamp[]>([]);
    const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Firestore 구독
    useEffect(() => {
        const ref = doc(db, "reports", reportId);
        const unsub = onSnapshot(ref, (snap) => {
            const data = snap.data() || {};
            setContent(data.content || data.summary || "");
            setKeywords(data.keywords || []);
            setAudioUrl(data.audioURL || data.audioUrl || "");
            setSentenceTimestamps(data.sentenceTimestamps || []);
            setLoading(false);
        });
        return () => unsub();
    }, [reportId]);

    // 문장 분리 (한국어/영어 문장 구분자)
    const sentences = useMemo(() => {
        if (!content) return [];
        return content
            .split(/([.!?。！？]\s+|[\n\n]+)/)
            .filter((s) => s.trim().length > 0 && !/^[.!?。！？]+$/.test(s.trim()))
            .map((s) => s.trim());
    }, [content]);

    // 키워드 자동 추출 (없으면)
    useEffect(() => {
        if (keywords.length > 0) return;
        if (!content) return;

        // 간단한 키워드 추출 (빈도 기반)
        const words = content
            .toLowerCase()
            .replace(/[^\w\s가-힣]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2);
        const freq: Record<string, number> = {};
        words.forEach((w) => {
            freq[w] = (freq[w] || 0) + 1;
        });
        const sorted = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([k]) => k);
        setKeywords(sorted);
    }, [content, keywords.length]);

    // 하이라이트된 문장 배열 생성
    const highlighted = useMemo(() => {
        return sentences.map((sentence) => {
            const segments: HighlightSegment[] = [];
            let lastIndex = 0;
            const lowerSentence = sentence.toLowerCase();

            keywords.forEach((keyword) => {
                const lowerKey = keyword.toLowerCase();
                const index = lowerSentence.indexOf(lowerKey, lastIndex);
                if (index !== -1) {
                    if (index > lastIndex) {
                        segments.push({ text: sentence.slice(lastIndex, index) });
                    }
                    segments.push({ text: sentence.slice(index, index + keyword.length), key: true });
                    lastIndex = index + keyword.length;
                }
            });

            if (lastIndex < sentence.length) {
                segments.push({ text: sentence.slice(lastIndex) });
            }

            return segments.length > 0 ? segments : [{ text: sentence }];
        });
    }, [sentences, keywords]);

    // 시간 포맷팅
    const fmtTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // 문장 클릭 핸들러
    const handleSentenceClick = (idx: number) => {
        setCurrentSentenceIdx(idx);
        if (audioUrl && audioRef.current && sentenceTimestamps.length > idx) {
            const ts = sentenceTimestamps[idx];
            audioRef.current.currentTime = ts.start;
            audioRef.current.play();
            setIsPlaying(true);
        } else {
            // Web Speech TTS
            const synth = window.speechSynthesis;
            synth.cancel();
            const utter = new SpeechSynthesisUtterance(sentences[idx]);
            utter.lang = "ko-KR";
            utter.onend = () => setIsPlaying(false);
            synth.speak(utter);
            setIsPlaying(true);
        }
    };

    // 재생/일시정지 토글
    const togglePlay = () => {
        if (audioUrl && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        } else if (currentSentenceIdx !== null) {
            handleSentenceClick(currentSentenceIdx);
        }
    };

    // 검색 네비게이션
    const navigateSearch = (type: "market" | "team" | "map", keyword: string) => {
        const path = routes[type] || `/${type}`;
        navigate(`${path}?q=${encodeURIComponent(keyword)}`);
    };

    // 오디오 이벤트 리스너
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateCurrentSentence = () => {
            if (!sentenceTimestamps.length) return;
            const currentTime = audio.currentTime;
            const idx = sentenceTimestamps.findIndex(
                (ts) => currentTime >= ts.start && currentTime <= ts.end
            );
            if (idx !== -1 && idx !== currentSentenceIdx) {
                setCurrentSentenceIdx(idx);
                sentenceRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        };

        const onEnded = () => setIsPlaying(false);
        const onTimeUpdate = () => updateCurrentSentence();

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("ended", onEnded);

        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("ended", onEnded);
        };
    }, [audioUrl, sentenceTimestamps, currentSentenceIdx]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">로딩 중...</span>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
            <div className="flex items-center gap-3 mb-4">
                <Highlighter className="w-5 h-5" />
                <h2 className="text-xl font-semibold">AI 리포트 하이라이트 & 음성 리플레이</h2>
                {loading && (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> 실시간 동기화 중…
                    </span>
                )}
            </div>

            {/* 키워드 칩 영역 */}
            <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4" />
                    <span className="text-sm font-medium">핵심 키워드</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {keywords.map((k) => (
                        <div
                            key={k}
                            className="group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-card hover:bg-accent cursor-pointer"
                        >
                            <button
                                className="font-semibold underline-offset-2 group-hover:underline"
                                onClick={() => handleSentenceClick(findKeywordFirstSentenceIndex(sentences, k))}
                            >
                                {k}
                            </button>
                            <div className="flex items-center gap-1 pl-1 ml-1 border-l">
                                <button
                                    title="마켓 검색"
                                    onClick={() => navigateSearch("market", k)}
                                    className="hover:opacity-80"
                                >
                                    🛒
                                </button>
                                <button
                                    title="팀 검색"
                                    onClick={() => navigateSearch("team", k)}
                                    className="hover:opacity-80"
                                >
                                    👥
                                </button>
                                <button
                                    title="지도 검색"
                                    onClick={() => navigateSearch("map", k)}
                                    className="hover:opacity-80"
                                >
                                    🗺️
                                </button>
                                <button
                                    title="해당 문장 재생"
                                    onClick={() => handleSentenceClick(findKeywordFirstSentenceIndex(sentences, k))}
                                    className="hover:opacity-80"
                                >
                                    <Play className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 컨트롤 바 */}
            <div className="sticky top-2 z-10 mb-4 rounded-xl border bg-background/70 backdrop-blur p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlay}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:bg-accent"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span className="text-sm">{isPlaying ? "일시정지" : "재생"}</span>
                    </button>
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Volume2 className="w-4 h-4" />
                        {audioUrl ? <span>오디오 재생 가능</span> : <span>Web Speech TTS 사용</span>}
                    </div>
                </div>
                {sentenceTimestamps.length > 0 && currentSentenceIdx != null && (
                    <div className="text-xs text-muted-foreground">
                        {fmtTime(sentenceTimestamps[currentSentenceIdx].start)} ~{" "}
                        {fmtTime(sentenceTimestamps[currentSentenceIdx].end)}
                    </div>
                )}
            </div>

            {/* 본문 렌더링 */}
            <div className="prose prose-zinc max-w-none dark:prose-invert">
                {sentences.map((sentence, idx) => (
                    <div
                        key={idx}
                        ref={(el) => (sentenceRefs.current[idx] = el as HTMLDivElement)}
                        onClick={() => handleSentenceClick(idx)}
                        className={`group cursor-pointer rounded-xl px-3 py-2 transition-colors border mb-2 ${
                            currentSentenceIdx === idx
                                ? "bg-primary/5 border-primary/40"
                                : "hover:bg-muted"
                        }`}
                    >
                        <span className="text-sm leading-7">
                            {highlighted[idx].map((seg, i) =>
                                seg.key ? (
                                    <mark
                                        key={i}
                                        className="rounded-md px-1 py-0.5 bg-amber-200/70 dark:bg-yellow-300/30 text-foreground ring-1 ring-yellow-400/40"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSentenceClick(idx);
                                        }}
                                    >
                                        {seg.text}
                                    </mark>
                                ) : (
                                    <span key={i}>{seg.text}</span>
                                )
                            )}
                        </span>
                    </div>
                ))}
            </div>

            {/* 보이지 않는 오디오 엘리먼트 (audioUrl이 있을 때만 생성) */}
            {audioUrl && (
                <audio
                    ref={(el) => {
                        if (el) audioRef.current = el;
                    }}
                    src={audioUrl}
                    hidden
                    preload="auto"
                />
            )}
        </div>
    );
}

// 키워드가 최초로 등장하는 문장의 인덱스 찾기
function findKeywordFirstSentenceIndex(sentences: string[], key: string): number {
    const k = key.toLowerCase();
    for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].toLowerCase().includes(k)) return i;
    }
    return 0;
}

