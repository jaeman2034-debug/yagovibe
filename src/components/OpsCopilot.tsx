import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send } from "lucide-react";

const SPEECH_LANG = "ko-KR";

interface LogEntry {
    role: "user" | "assistant";
    text: string;
    timestamp?: Date;
}

interface OpsCopilotProps {
    teamId?: string;
}

/**
 * Step 52: AI 운영 Copilot
 * 음성/텍스트 명령으로 글로벌 관제를 실행하고 TTS로 결과를 안내하는 운영 보조원
 */
export default function OpsCopilot({ teamId }: OpsCopilotProps) {
    const { user } = useAuth();
    const [sessionId] = useState(() => crypto.randomUUID());
    const [query, setQuery] = useState("");
    const [listening, setListening] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [confirm, setConfirm] = useState<ConfirmState | null>(null);
    const recRef = useRef<any>(null);

    // STT (Web Speech Recognition)
    const startSTT = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const SR = SpeechRecognition;

        if (!SR) {
            alert("브라우저가 음성 인식을 지원하지 않습니다.");
            return;
        }

        const rec = new SR();
        rec.lang = SPEECH_LANG;
        rec.interimResults = true;
        rec.continuous = false;

        rec.onresult = (e: any) => {
            const transcript = Array.from(e.results)
                .map((r: any) => r[0].transcript)
                .join(" ");
            setQuery(transcript);
        };

        rec.onerror = (e: any) => {
            console.error("STT 오류:", e);
            setListening(false);
        };

        rec.onend = () => {
            setListening(false);
            if (query.trim()) {
                onSubmit(query);
            }
        };

        recRef.current = rec;
        setListening(true);
        try {
            rec.start();
        } catch (error) {
            console.error("STT 시작 실패:", error);
            setListening(false);
        }
    };

    const stopSTT = () => {
        try {
            recRef.current?.stop?.();
        } catch (e) {
            console.error("STT 정지 실패:", e);
        }
        setListening(false);
    };

    // TTS (Web Speech Synthesis)
    const speak = (text: string) => {
        if (!window.speechSynthesis) {
            console.warn("브라우저가 음성 합성을 지원하지 않습니다.");
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = SPEECH_LANG;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    // 명령 전송 (Step 53: V2 사용)
    const onSubmit = async (text?: string) => {
        const q = (text ?? query).trim();
        if (!q) return;

        setLogs((l) => [...l, { role: "user", text: q, timestamp: new Date() }]);
        setQuery("");
        stopSTT(); // STT 중이면 정지

        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            // Step 53: opsRouterV2 사용 (멀티턴 메모리 + 승인)
            const response = await fetch(`${functionsOrigin}/opsRouterV2`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: q,
                    sessionId,
                    teamId,
                    uid: user?.uid,
                }),
            });

            const json = await response.json();

            // 승인이 필요한 경우
            if (json.needConfirm) {
                setConfirm({
                    nonce: json.nonce,
                    message: json.message,
                    intent: json.intent,
                    risk: json.risk,
                });
                setLogs((l) => [...l, { role: "assistant", text: json.message, timestamp: new Date() }]);
                speak(json.message);
            } else if (json.blocked) {
                // 쿨다운 등으로 차단된 경우
                setLogs((l) => [...l, { role: "assistant", text: json.message, timestamp: new Date() }]);
                speak(json.message);
            } else if (json.message) {
                // 즉시 처리된 경우
                setLogs((l) => [...l, { role: "assistant", text: json.message, timestamp: new Date() }]);
                speak(json.message);
            }
        } catch (e: any) {
            const msg = `명령 처리 중 오류가 발생했습니다: ${e.message || "알 수 없는 오류"}`;
            setLogs((l) => [...l, { role: "assistant", text: msg, timestamp: new Date() }]);
            speak(msg);
        }
    };

    // 승인/거부 처리
    const sendDecision = async (decision: "approve" | "reject") => {
        if (!confirm) return;

        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/opsConfirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    nonce: confirm.nonce,
                    decision,
                    uid: user?.uid,
                }),
            });

            const json = await response.json();
            const message = json.message || (decision === "approve" ? "실행 시작" : "취소됨");

            setLogs((l) => [...l, { role: "assistant", text: message, timestamp: new Date() }]);
            speak(message);
            setConfirm(null);
        } catch (e: any) {
            const msg = `승인 처리 중 오류가 발생했습니다: ${e.message || "알 수 없는 오류"}`;
            setLogs((l) => [...l, { role: "assistant", text: msg, timestamp: new Date() }]);
            speak(msg);
            setConfirm(null);
        }
    };

    // 퀵 액션
    const quick = (cmd: string) => {
        setQuery(cmd);
        onSubmit(cmd);
    };

    // 컴포넌트 언마운트 시 STT 정리
    useEffect(() => {
        return () => {
            stopSTT();
        };
    }, []);

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">🎙️ AI 운영 Copilot</h2>
                    <div className="flex gap-2">
                        {!listening ? (
                            <Button size="sm" onClick={startSTT} variant="outline">
                                <Mic className="w-4 h-4 mr-1" />
                                듣기
                            </Button>
                        ) : (
                            <Button size="sm" variant="outline" onClick={stopSTT} className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                                <Square className="w-4 h-4 mr-1" />
                                정지
                            </Button>
                        )}
                    </div>
                </div>

                {/* 퀵 액션 버튼 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button variant="outline" onClick={() => quick("팀 요약 알려줘")} size="sm">
                        팀 요약
                    </Button>
                    <Button variant="outline" onClick={() => quick("최근 이상 브리핑 해줘")} size="sm">
                        이상 브리핑
                    </Button>
                    <Button variant="outline" onClick={() => quick("재튜닝 실행해")} size="sm">
                        재튜닝
                    </Button>
                    <Button variant="outline" onClick={() => quick("모델 재학습 상태 알려줘")} size="sm">
                        재학습 상태
                    </Button>
                </div>

                {/* 명령 입력 */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="명령을 입력하세요 (예: 소흘FC 요약, 팀 알람 뭐 있어?)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                onSubmit();
                            }
                        }}
                        className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                    />
                    <Button onClick={() => onSubmit()} size="sm">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>

                {/* 승인 확인 바 (Step 53) */}
                {confirm && (
                    <div className={`rounded-xl border p-3 flex items-center justify-between ${
                        confirm.risk === "high" 
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    }`}>
                        <div className="flex-1">
                            <div className="text-sm font-medium mb-1">
                                {confirm.risk === "high" ? "⚠️ 고위험 작업" : "⚠️ 확인 필요"}
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">{confirm.message}</div>
                        </div>
                        <div className="flex gap-2 ml-4">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendDecision("reject")}
                                className="bg-white dark:bg-gray-800"
                            >
                                <XCircle className="w-4 h-4 mr-1" />
                                취소
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => sendDecision("approve")}
                                className={confirm.risk === "high" ? "bg-red-600 hover:bg-red-700" : ""}
                            >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                확인
                            </Button>
                        </div>
                    </div>
                )}

                {/* 대화 로그 */}
                <div className="h-56 border rounded-md p-3 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <div className="space-y-2">
                        {logs.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-4">
                                명령을 입력하거나 음성으로 말씀해주세요.
                            </div>
                        )}
                        {logs.map((m, i) => (
                            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                                <div
                                    className={`inline-block rounded-2xl px-3 py-2 text-sm max-w-[80%] ${
                                        m.role === "user"
                                            ? "bg-purple-600 text-white"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    }`}
                                >
                                    {m.text}
                                </div>
                                {m.timestamp && (
                                    <div className={`text-xs text-muted-foreground mt-1 ${m.role === "user" ? "text-right" : "text-left"}`}>
                                        {m.timestamp.toLocaleTimeString("ko-KR")}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 상태 표시 */}
                {listening && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        음성 인식 중...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

