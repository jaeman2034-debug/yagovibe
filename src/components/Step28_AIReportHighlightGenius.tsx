import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Search, Play, Pause, Volume2, Highlighter, Loader2, Share2, Flame, Repeat } from "lucide-react";
import { db } from "@/lib/firebase";

interface AIReportHighlightGeniusProps {
    reportId: string;
}

type KeywordStat = [string, number]; // [word, frequency]

const SENTENCE_SPLIT_REGEX = /(?<=[.!?！？|\n|。|.|?|.|.|.|.|.|.|.|.|.|.])\s+/g;

const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "if", "while", "to", "of", "in", "on", "for", "with", "at", "by", "from",
    "은", "는", "이", "가", "을", "를", "에서", "으로", "이다", "의", "는", "그리고", "그",
]);

function extractKeywords(text: string, max: number = 12): KeywordStat[] {
    const counts = new Map<string, number>();
    text.toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, " ")
        .split(/\s+/)
        .forEach((t) => {
            if (!STOPWORDS.has(t) && t.length > 1) {
                counts.set(t, (counts.get(t) || 0) + 1);
            }
        });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max);
}

function colorByScore(score: number, max: number): string {
    const ratio = score / max;
    if (ratio > 0.8) return "bg-red-300/70 dark:bg-red-400/40";
    if (ratio > 0.6) return "bg-orange-300/70 dark:bg-orange-400/40";
    if (ratio > 0.4) return "bg-amber-300/70 dark:bg-amber-400/40";
    return "bg-yellow-200/70 dark:bg-yellow-400/30";
}

/**
 * 🧠 천재 모드 최종 (Step 28 + Step 30 통합)
 * 포함 기능:
 *  - 핵심 키워드 Heatmap + 점진적 컬러 표시 (빈도 기반)
 *  - 문장 앵커링 (#s-12) 지점 직접 공유 가능
 *  - 이이름으로 버전관리 (Firestore reports/{id}/versions)
 *  - Step 30: 문장 ↔ 키워드 양방향 하이라이트
 *  - Step 30: 오디오 재생 중 현재 문장 자동 스크롤 및 실시간 하이라이트
 *  - Step 30: A-B Loop 기능 (시작점 A와 끝점 B 지정 후 해당 구간 반복재생)
 */
export default function AIReportHighlightGenius({ reportId }: AIReportHighlightGeniusProps) {
    const navigate = useNavigate();
    const [content, setContent] = useState<string>("");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [keywords, setKeywords] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSentence, setCurrentSentence] = useState<number | null>(null);
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [loopA, setLoopA] = useState<number | null>(null); // A-B Loop 시작점 (초)
    const [loopB, setLoopB] = useState<number | null>(null); // A-B Loop 끝점 (초)
    const [loopActive, setLoopActive] = useState(false); // A-B Loop 활성화 여부
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reports", reportId), (snap) => {
            const d = snap.data();
            setContent(d?.content || d?.summary || "");
            setAudioUrl(d?.audioURL || d?.audioUrl || null);
            setKeywords(d?.keywords || []);
            setLoading(false);
            if (d?.versions) {
                console.log("버전 수:", Object.keys(d.versions).length);
            }
        });
        return () => unsub();
    }, [reportId]);

    const sentences = useMemo(
        () => content.split(SENTENCE_SPLIT_REGEX).filter(Boolean),
        [content]
    );

    const keywordStats = useMemo(() => extractKeywords(content, 15), [content]);
    const maxScore = keywordStats.length ? Math.max(...keywordStats.map((k) => k[1])) : 1;

    // 문장별 키워드 매핑 (키워드가 포함된 문장 인덱스 찾기)
    const keywordToSentences = useMemo(() => {
        const map = new Map<string, number[]>();
        keywordStats.forEach(([keyword]) => {
            const indices: number[] = [];
            sentences.forEach((sentence, idx) => {
                if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                    indices.push(idx);
                }
            });
            map.set(keyword, indices);
        });
        return map;
    }, [keywordStats, sentences]);

    // 문장별 키워드 매핑 (문장에 포함된 키워드 찾기)
    const sentenceToKeywords = useMemo(() => {
        const map = new Map<number, string[]>();
        sentences.forEach((sentence, idx) => {
            const keywordsInSentence: string[] = [];
            keywordStats.forEach(([keyword]) => {
                if (sentence.toLowerCase().includes(keyword.toLowerCase())) {
                    keywordsInSentence.push(keyword);
                }
            });
            map.set(idx, keywordsInSentence);
        });
        return map;
    }, [sentences, keywordStats]);

    // 문장별 재생 시간 계산 (문장 길이 기반 추정)
    const sentenceTimings = useMemo(() => {
        if (!audioRef.current) return [];
        const totalLength = content.length;
        const timings: number[] = [];
        let currentTime = 0;
        sentences.forEach((sentence) => {
            const ratio = sentence.length / totalLength;
            // 평균 읽기 속도: 150자/분 (한국어 기준)
            const duration = (sentence.length / 150) * 60; // 초 단위
            timings.push(currentTime);
            currentTime += duration;
        });
        return timings;
    }, [sentences, content]);

    // 현재 재생 시간에 해당하는 문장 찾기
    useEffect(() => {
        if (!audioRef.current || !playing) return;

        const audio = audioRef.current;
        const updateCurrentSentence = () => {
            const currentTime = audio.currentTime;
            
            // A-B Loop 체크
            if (loopActive && loopA !== null && loopB !== null) {
                if (currentTime >= loopB) {
                    audio.currentTime = loopA;
                    return;
                }
            }

            // 현재 재생 시간에 해당하는 문장 찾기
            for (let i = sentenceTimings.length - 1; i >= 0; i--) {
                if (currentTime >= sentenceTimings[i]) {
                    setCurrentSentence(i);
                    // 스크롤
                    const el = sentenceRefs.current[i];
                    if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    break;
                }
            }
        };

        audio.addEventListener("timeupdate", updateCurrentSentence);
        return () => audio.removeEventListener("timeupdate", updateCurrentSentence);
    }, [playing, sentenceTimings, loopActive, loopA, loopB]);

    // 앵커 처리 (#s-12)
    useEffect(() => {
        if (window.location.hash.startsWith("#s-")) {
            const idx = parseInt(window.location.hash.replace("#s-", ""));
            if (!isNaN(idx) && idx < sentences.length) {
                const el = document.getElementById(`s-${idx}`);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    setCurrentSentence(idx);
                }
            }
        }
    }, [sentences]);

    const handleSentenceClick = (idx: number) => {
        setCurrentSentence(idx);
        window.history.replaceState(null, "", `#s-${idx}`);
        
        // 해당 문장의 키워드들 하이라이트
        const keywordsInSentence = sentenceToKeywords.get(idx) || [];
        if (keywordsInSentence.length > 0) {
            setSelectedKeyword(keywordsInSentence[0]); // 첫 번째 키워드 선택
        }

        // 오디오 시크
        if (audioUrl && audioRef.current) {
            const targetTime = sentenceTimings[idx] || 0;
            audioRef.current.currentTime = targetTime;
            if (!playing) {
                audioRef.current.play();
                setPlaying(true);
            }
        } else {
            // Web Speech TTS
            const synth = window.speechSynthesis;
            synth.cancel();
            const utter = new SpeechSynthesisUtterance(sentences[idx]);
            utter.lang = "ko-KR";
            synth.speak(utter);
        }
    };

    const handleKeywordClick = (keyword: string) => {
        setSelectedKeyword(selectedKeyword === keyword ? null : keyword);
        
        // 해당 키워드가 포함된 문장들 찾기
        const sentenceIndices = keywordToSentences.get(keyword) || [];
        if (sentenceIndices.length > 0) {
            // 첫 번째 문장으로 스크롤
            const firstIdx = sentenceIndices[0];
            const el = sentenceRefs.current[firstIdx];
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            
            // 오디오 시크
            if (audioUrl && audioRef.current) {
                const targetTime = sentenceTimings[firstIdx] || 0;
                audioRef.current.currentTime = targetTime;
                if (!playing) {
                    audioRef.current.play();
                    setPlaying(true);
                }
            }
        }
    };

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
            setPlaying(false);
        } else {
            audioRef.current.play();
            setPlaying(true);
        }
    };

    const handleSetLoopA = () => {
        if (audioRef.current) {
            setLoopA(audioRef.current.currentTime);
            if (loopB === null || audioRef.current.currentTime >= loopB) {
                setLoopB(null);
            }
        }
    };

    const handleSetLoopB = () => {
        if (audioRef.current && loopA !== null) {
            const currentTime = audioRef.current.currentTime;
            if (currentTime > loopA) {
                setLoopB(currentTime);
                setLoopActive(true);
            }
        }
    };

    const handleToggleLoop = () => {
        if (loopA !== null && loopB !== null) {
            setLoopActive(!loopActive);
        }
    };

    const saveVersion = async () => {
        const ts = Date.now();
        await setDoc(
            doc(db, "reports", reportId),
            {
                versions: {
                    [ts]: {
                        content,
                        keywords: keywordStats,
                    },
                },
            },
            { merge: true }
        );
        alert("✅ 버전이 저장되었습니다.");
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert("✅ 링크가 복사되었습니다.");
        } catch (err) {
            console.error("링크 복사 실패:", err);
        }
    };

    return (
        <div ref={containerRef} className="max-w-5xl mx-auto p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5" />
                <h2 className="text-xl font-semibold">AI 리포트 하이라이트 (천재 모드)</h2>
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            </div>

            {/* 키워드 Heatmap */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4" />
                    <span className="text-sm font-medium">핵심 키워드 (빈도 기반 Heatmap)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {keywordStats.map(([word, score], i) => {
                        const isSelected = selectedKeyword === word;
                        const relatedSentences = keywordToSentences.get(word) || [];
                        const isHighlighted = isSelected || (selectedKeyword === null);
                        
                        return (
                            <span
                                key={i}
                                className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-all ${
                                    isSelected 
                                        ? "ring-4 ring-blue-500 scale-110 animate-pulse" 
                                        : isHighlighted 
                                            ? colorByScore(score, maxScore) 
                                            : "opacity-30"
                                }`}
                                onClick={() => handleKeywordClick(word)}
                                title={`${relatedSentences.length}개 문장에 포함됨`}
                            >
                                {word} <small className="opacity-70">({score})</small>
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* 문장 리스트 */}
            <div className="space-y-2">
                {sentences.map((s, i) => {
                    const isCurrent = currentSentence === i;
                    const keywordsInSentence = sentenceToKeywords.get(i) || [];
                    const isHighlighted = selectedKeyword === null || keywordsInSentence.includes(selectedKeyword);
                    const isSelected = selectedKeyword !== null && keywordsInSentence.includes(selectedKeyword);
                    
                    return (
                        <div
                            ref={(el) => { sentenceRefs.current[i] = el; }}
                            id={`s-${i}`}
                            key={i}
                            className={`rounded-lg border p-3 cursor-pointer transition-all ${
                                isCurrent 
                                    ? "bg-blue-500/20 border-blue-500/60 shadow-lg scale-[1.02]" 
                                    : isSelected
                                        ? "bg-yellow-200/50 dark:bg-yellow-900/30 border-yellow-400/50"
                                        : isHighlighted
                                            ? "hover:bg-muted"
                                            : "opacity-40 hover:opacity-60"
                            }`}
                            onClick={() => handleSentenceClick(i)}
                        >
                            <span className="text-sm leading-7">{s}</span>
                            {isCurrent && (
                                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                    🔊 현재 재생 중...
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 컨트롤 */}
            <div className="flex flex-col gap-3 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                {/* 오디오 컨트롤 */}
                {audioUrl && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePlayPause}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                        >
                            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {playing ? "정지" : "재생"}
                        </button>
                        <audio 
                            ref={audioRef} 
                            src={audioUrl} 
                            className="flex-1"
                            onPlay={() => setPlaying(true)}
                            onPause={() => setPlaying(false)}
                            onEnded={() => {
                                setPlaying(false);
                                if (loopActive && loopA !== null) {
                                    audioRef.current!.currentTime = loopA;
                                    audioRef.current!.play();
                                }
                            }}
                        />
                    </div>
                )}

                {/* A-B Loop 컨트롤 */}
                {audioUrl && (
                    <div className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Repeat className="w-4 h-4" />
                        <span className="text-sm font-medium">A-B Loop:</span>
                        <button
                            onClick={handleSetLoopA}
                            className={`px-3 py-1 rounded text-sm ${
                                loopA !== null ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                        >
                            🎧 A {loopA !== null ? `(${loopA.toFixed(1)}s)` : ""}
                        </button>
                        <button
                            onClick={handleSetLoopB}
                            className={`px-3 py-1 rounded text-sm ${
                                loopB !== null ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            disabled={loopA === null}
                        >
                            🎬 B {loopB !== null ? `(${loopB.toFixed(1)}s)` : ""}
                        </button>
                        {loopA !== null && loopB !== null && (
                            <button
                                onClick={handleToggleLoop}
                                className={`px-3 py-1 rounded text-sm ${
                                    loopActive ? "bg-blue-600 text-white" : "bg-gray-300 dark:bg-gray-600"
                                }`}
                            >
                                {loopActive ? "🔄 반복 중" : "반복 시작"}
                            </button>
                        )}
                        {(loopA !== null || loopB !== null) && (
                            <button
                                onClick={() => {
                                    setLoopA(null);
                                    setLoopB(null);
                                    setLoopActive(false);
                                }}
                                className="px-2 py-1 rounded text-sm bg-red-500 text-white"
                            >
                                초기화
                            </button>
                        )}
                    </div>
                )}

                {/* 기타 버튼 */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={saveVersion}
                        className="px-4 py-2 rounded-lg border hover:bg-accent flex items-center gap-2"
                    >
                        <Highlighter className="w-4 h-4" />
                        버전 저장
                    </button>
                    <button
                        onClick={copyLink}
                        className="px-3 py-2 rounded-lg border flex items-center gap-2 hover:bg-accent"
                    >
                        <Share2 className="w-4 h-4" />
                        링크 복사
                    </button>
                </div>
            </div>
        </div>
    );
}

