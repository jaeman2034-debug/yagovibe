import React, { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Music, Music2, ShoppingCart, Users, MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

interface Step30_ABLoopHighlightProps {
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

type KeywordStat = [string, number]; // [word, frequency]

const SENTENCE_SPLIT_REGEX = /(?<=[.!?。！？\n|。|\.|?|!|？|！|。])\s+/g;

const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "if", "while", "to", "of", "in", "on", "for", "with", "at", "by", "from",
    "은", "는", "이", "가", "을", "를", "에서", "으로", "이다", "의", "는", "그리고", "또는",
]);

function extractKeywords(text: string, max: number = 15): KeywordStat[] {
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
 * Step 30: AI 리포트 양방향 하이라이트 + A-B Loop 재생
 * 기능:
 * 1. 문장 ↔ 키워드 양방향 하이라이트
 * 2. 오디오 재생 중 현재 문장 자동 스크롤 및 실시간 하이라이트
 * 3. A-B Loop 기능 (시작점 A와 끝점 B 지정 후 해당 구간 반복재생)
 */
export default function Step30_ABLoopHighlight({ reportId, routes = {} }: Step30_ABLoopHighlightProps) {
    const navigate = useNavigate();
    const [content, setContent] = useState<string>("");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSentence, setCurrentSentence] = useState<number | null>(null);
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loopPointA, setLoopPointA] = useState<number | null>(null);
    const [loopPointB, setLoopPointB] = useState<number | null>(null);
    const [isLooping, setIsLooping] = useState(false);
    const [sentenceTimestamps, setSentenceTimestamps] = useState<SentenceTimestamp[]>([]);
    const [keywords, setKeywords] = useState<string[]>([]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);
    const timeUpdateIntervalRef = useRef<number | null>(null);
    const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reports", reportId), (snap) => {
            const d = snap.data();
            setContent(d?.content || d?.summary || "");
            setAudioUrl(d?.audioURL || d?.audioUrl || null);
            setSentenceTimestamps(d?.sentenceTimestamps || []);
            setKeywords(d?.keywords || []);
            setLoading(false);
        });
        return () => unsub();
    }, [reportId]);

    const sentences = useMemo(
        () => content.split(SENTENCE_SPLIT_REGEX).filter(Boolean),
        [content]
    );

    // Firestore keywords가 있으면 우선 사용, 없으면 자동 추출
    const keywordStats = useMemo(() => {
        if (keywords.length > 0) {
            // Firestore keywords를 빈도수 1로 변환
            return keywords.map(k => [k, 1] as KeywordStat);
        }
        return extractKeywords(content, 15);
    }, [content, keywords]);
    const maxScore = keywordStats.length ? Math.max(...keywordStats.map((k) => k[1])) : 1;

    // 문장에 키워드 포함 여부 확인
    const getSentenceKeywords = (sentence: string): string[] => {
        return keywordStats
            .map(([word]) => word)
            .filter(word => sentence.toLowerCase().includes(word.toLowerCase()));
    };

    // 키워드가 포함된 문장 인덱스 찾기
    const getSentencesWithKeyword = (keyword: string): number[] => {
        return sentences
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => s.toLowerCase().includes(keyword.toLowerCase()))
            .map(({ i }) => i);
    };

    // 문장 클릭 시 키워드 하이라이트 + TTS/오디오 재생
    const handleSentenceClick = (idx: number) => {
        setCurrentSentence(idx);
        const sentence = sentences[idx];
        const sentenceKeywords = getSentenceKeywords(sentence);
        if (sentenceKeywords.length > 0) {
            setSelectedKeyword(sentenceKeywords[0]); // 첫 번째 키워드 선택
        }

        // 타임스탬프가 있으면 정확한 시간으로, 없으면 대략 계산
        if (audioUrl && audioRef.current) {
            if (sentenceTimestamps.length > idx && sentenceTimestamps[idx]) {
                audioRef.current.currentTime = sentenceTimestamps[idx].start;
            } else {
                const sentenceDuration = audioRef.current.duration / sentences.length;
                audioRef.current.currentTime = idx * sentenceDuration;
            }
        }

        // TTS 재생 (오디오가 없거나 선택된 경우)
        if (!audioUrl || !audioRef.current) {
            speakSentence(sentence);
        }
    };

    // 키워드 클릭 시 첫 등장 문장 포커스 + 재생
    const handleKeywordClick = (keyword: string) => {
        setSelectedKeyword(keyword);
        const sentenceIndices = getSentencesWithKeyword(keyword);
        if (sentenceIndices.length > 0) {
            const firstIdx = sentenceIndices[0];
            setCurrentSentence(firstIdx);
            
            // 해당 문장으로 스크롤
            const el = sentenceRefs.current[firstIdx];
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            // 오디오 재생 (타임스탬프 기반)
            if (audioUrl && audioRef.current) {
                if (sentenceTimestamps.length > firstIdx && sentenceTimestamps[firstIdx]) {
                    audioRef.current.currentTime = sentenceTimestamps[firstIdx].start;
                } else {
                    const sentenceDuration = audioRef.current.duration / sentences.length;
                    audioRef.current.currentTime = firstIdx * sentenceDuration;
                }
                if (!isPlaying) {
                    handlePlayPause();
                }
            }
        }
    };

    // 검색 연동: 키워드에서 마켓/팀/지도로 이동
    const handleKeywordSearch = (keyword: string, type: "market" | "team" | "map") => {
        const routeMap = {
            market: routes.market || "/app/market",
            team: routes.team || "/app/teams",
            map: routes.map || "/voice-map"
        };
        const route = routeMap[type];
        navigate(`${route}?q=${encodeURIComponent(keyword)}`);
    };

    // TTS 재생 (localStorage["tts.voice"] 사용)
    const speakSentence = (text: string) => {
        if (!text) return;
        
        // 기존 TTS 중지
        window.speechSynthesis.cancel();
        
        const savedVoice = localStorage.getItem("tts.voice");
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ko-KR";
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // 저장된 음성 설정 적용
        if (savedVoice) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === savedVoice || v.lang === savedVoice);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        ttsRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    // 오디오 재생/일시정지
    const handlePlayPause = () => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
                timeUpdateIntervalRef.current = null;
            }
        } else {
            audioRef.current.play();
            setIsPlaying(true);
            startTimeTracking();
        }
    };

    // 현재 재생 위치 추적 및 문장 하이라이트 (타임스탬프 기반)
    const startTimeTracking = () => {
        if (timeUpdateIntervalRef.current) {
            clearInterval(timeUpdateIntervalRef.current);
        }

        timeUpdateIntervalRef.current = window.setInterval(() => {
            if (!audioRef.current || !isPlaying) return;

            const currentTime = audioRef.current.currentTime;
            let currentIdx = 0;

            // 타임스탬프가 있으면 정확한 문장 찾기
            if (sentenceTimestamps.length > 0) {
                currentIdx = sentenceTimestamps.findIndex(
                    (ts, idx) => currentTime >= ts.start && currentTime <= ts.end
                );
                if (currentIdx === -1) {
                    // 범위를 벗어난 경우 가장 가까운 문장 찾기
                    currentIdx = sentenceTimestamps.findIndex(ts => currentTime < ts.start);
                    if (currentIdx === -1) currentIdx = sentences.length - 1;
                    else currentIdx = Math.max(0, currentIdx - 1);
                }
            } else {
                // 타임스탬프가 없으면 균등 분할
                const duration = audioRef.current.duration;
                const sentenceDuration = duration / sentences.length;
                currentIdx = Math.min(
                    Math.floor(currentTime / sentenceDuration),
                    sentences.length - 1
                );
            }

            setCurrentSentence(currentIdx);

            // 현재 문장으로 스크롤
            const el = sentenceRefs.current[currentIdx];
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }

            // A-B Loop 체크 (타임스탬프 기반)
            if (isLooping && loopPointA !== null && loopPointB !== null) {
                let loopStartTime: number;
                let loopEndTime: number;

                if (sentenceTimestamps.length > 0 && sentenceTimestamps[loopPointA] && sentenceTimestamps[loopPointB]) {
                    loopStartTime = sentenceTimestamps[loopPointA].start;
                    loopEndTime = sentenceTimestamps[loopPointB].end;
                } else {
                    const duration = audioRef.current.duration;
                    const sentenceDuration = duration / sentences.length;
                    loopStartTime = loopPointA * sentenceDuration;
                    loopEndTime = loopPointB * sentenceDuration;
                }

                if (currentTime >= loopEndTime) {
                    // Loop B 지점 도달 시 A로 돌아가기
                    audioRef.current.currentTime = loopStartTime;
                }
            }
        }, 100); // 100ms마다 업데이트
    };

    // A-B Loop 설정
    const handleSetLoopPointA = () => {
        if (currentSentence === null) return;
        setLoopPointA(currentSentence);
        alert(`🎧 Loop 시작점 A 설정: 문장 ${currentSentence + 1}`);
    };

    const handleSetLoopPointB = () => {
        if (currentSentence === null) return;
        setLoopPointB(currentSentence);
        alert(`🎬 Loop 끝점 B 설정: 문장 ${currentSentence + 1}`);
    };

    const handleToggleLoop = () => {
        if (loopPointA === null || loopPointB === null) {
            alert("먼저 A와 B 지점을 설정해주세요.");
            return;
        }

        setIsLooping(!isLooping);
        if (!isLooping && audioRef.current) {
            // 타임스탬프 기반으로 시작 시간 설정
            let startTime: number;
            if (sentenceTimestamps.length > 0 && sentenceTimestamps[loopPointA]) {
                startTime = sentenceTimestamps[loopPointA].start;
            } else {
                const sentenceDuration = audioRef.current.duration / sentences.length;
                startTime = loopPointA * sentenceDuration;
            }
            audioRef.current.currentTime = startTime;
            if (!isPlaying) {
                handlePlayPause();
            }
        }
    };

    const handleResetLoop = () => {
        setLoopPointA(null);
        setLoopPointB(null);
        setIsLooping(false);
    };

    // 오디오 종료 시 정리
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => {
            setIsPlaying(false);
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
                timeUpdateIntervalRef.current = null;
            }
        };

        audio.addEventListener("ended", handleEnded);
        return () => {
            audio.removeEventListener("ended", handleEnded);
        };
    }, [audioUrl]);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (timeUpdateIntervalRef.current) {
                clearInterval(timeUpdateIntervalRef.current);
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto p-4 text-center text-gray-500">
                로딩 중...
            </div>
        );
    }

    return (
        <div ref={containerRef} className="max-w-5xl mx-auto p-4 space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5" />
                <h2 className="text-xl font-semibold">AI 리포트 양방향 하이라이트 + A-B Loop</h2>
            </div>

            {/* 키워드 Heatmap */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">핵심 키워드 (빈도 기반 Heatmap)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {keywordStats.map(([word, score], i) => {
                        const isSelected = selectedKeyword === word;
                        const relatedSentences = getSentencesWithKeyword(word);
                        const isActive = currentSentence !== null && relatedSentences.includes(currentSentence);

                        return (
                            <div key={i} className="flex items-center gap-1">
                                <span
                                    className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-all ${
                                        isSelected || isActive
                                            ? "ring-2 ring-blue-500 ring-offset-2 scale-110"
                                            : ""
                                    } ${colorByScore(score, maxScore)}`}
                                    onClick={() => handleKeywordClick(word)}
                                    style={{
                                        animation: isSelected || isActive ? "pulse 1s infinite" : undefined,
                                    }}
                                >
                                    {word} <small className="opacity-70">({score})</small>
                                </span>
                                {/* 검색 연동 버튼 */}
                                <div className="flex gap-1">
                                    {routes.market && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleKeywordSearch(word, "market");
                                            }}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                            title="마켓에서 검색"
                                        >
                                            <ShoppingCart className="w-3 h-3" />
                                        </button>
                                    )}
                                    {routes.team && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleKeywordSearch(word, "team");
                                            }}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                            title="팀에서 검색"
                                        >
                                            <Users className="w-3 h-3" />
                                        </button>
                                    )}
                                    {routes.map && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleKeywordSearch(word, "map");
                                            }}
                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                            title="지도에서 검색"
                                        >
                                            <MapPin className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* A-B Loop 컨트롤 */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <button
                    onClick={handleSetLoopPointA}
                    className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                        loopPointA !== null ? "bg-blue-500 text-white" : "hover:bg-accent"
                    }`}
                    title="현재 문장을 Loop 시작점 A로 설정"
                >
                    <Music2 className="w-4 h-4" />
                    🎧 A
                </button>
                <button
                    onClick={handleSetLoopPointB}
                    className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                        loopPointB !== null ? "bg-green-500 text-white" : "hover:bg-accent"
                    }`}
                    title="현재 문장을 Loop 끝점 B로 설정"
                >
                    <Music2 className="w-4 h-4" />
                    🎬 B
                </button>
                {loopPointA !== null && loopPointB !== null && (
                    <>
                        <span className="text-sm text-gray-500">
                            A: {loopPointA + 1} | B: {loopPointB + 1}
                        </span>
                        <button
                            onClick={handleToggleLoop}
                            className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                                isLooping ? "bg-purple-500 text-white" : "hover:bg-accent"
                            }`}
                        >
                            {isLooping ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {isLooping ? "반복 중지" : "반복 재생"}
                        </button>
                        <button
                            onClick={handleResetLoop}
                            className="px-3 py-2 rounded-lg border flex items-center gap-2 hover:bg-accent"
                        >
                            <RotateCcw className="w-4 h-4" />
                            리셋
                        </button>
                    </>
                )}
            </div>

            {/* 오디오 컨트롤 */}
            {audioUrl && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <button
                        onClick={handlePlayPause}
                        className="px-4 py-2 rounded-lg border hover:bg-accent flex items-center gap-2"
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? "일시정지" : "재생"}
                    </button>
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        className="flex-1"
                        style={{ display: "none" }}
                    />
                    <div className="flex-1 text-sm text-gray-500">
                        {currentSentence !== null && (
                            <span>현재 문장: {currentSentence + 1} / {sentences.length}</span>
                        )}
                    </div>
                </div>
            )}

            {/* 문장 리스트 */}
            <div className="space-y-2">
                {sentences.map((s, idx) => {
                    const sentenceKeywords = getSentenceKeywords(s);
                    const isHighlighted = selectedKeyword && sentenceKeywords.includes(selectedKeyword);
                    const isCurrent = currentSentence === idx;
                    
                    // A-B Loop 범위 내에 있는지 확인
                    const inLoop = (loopPointA !== null && loopPointB !== null) 
                        ? (idx >= loopPointA && idx <= loopPointB)
                        : false;
                    
                    // 문장 내 활성 키워드 (최대 4개만 표시)
                    const activeKeys = sentenceKeywords.slice(0, 4);

                    return (
                        <div
                            key={idx}
                            ref={(el) => {
                                sentenceRefs.current[idx] = el;
                            }}
                            id={`s-${idx}`}
                            onClick={() => handleSentenceClick(idx)}
                            className={`group cursor-pointer rounded-xl px-3 py-2 transition-colors border mb-2 ${
                                isCurrent
                                    ? "bg-primary/5 border-primary/40"
                                    : "hover:bg-muted"
                            } ${
                                inLoop ? "ring-2 ring-primary/40" : ""
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {inLoop && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30">
                                        A–B
                                    </span>
                                )}
                                {activeKeys.map((k) => (
                                    <span
                                        key={k}
                                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 dark:bg-yellow-300/30 border border-yellow-400/40"
                                    >
                                        {k}
                                    </span>
                                ))}
                            </div>
                            <span className="text-sm leading-7 whitespace-pre-wrap">{s}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
