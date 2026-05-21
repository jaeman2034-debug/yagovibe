import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, Loader2, Volume2, MicOff } from "lucide-react";
import YagoLayout from "@/layouts/YagoLayout";
import { YagoButton, YagoCard } from "@/components/ui/YagoComponents";

declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

export default function VoiceAssistant_AI() {
    const [listening, setListening] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [lastCommand, setLastCommand] = useState<string>("");
    const [lastResponse, setLastResponse] = useState<string>("");
    const recognitionRef = useRef<any>(null);

    // 🎤 음성 인식 시작
    const startListening = () => {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            alert("이 브라우저는 음성 인식을 지원하지 않습니다.\nChrome, Edge, Safari를 사용해주세요.");
            return;
        }

        // 이전 음성 중단
        speechSynthesis.cancel();
        setSpeaking(false);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = "ko-KR";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognitionRef.current = recognition;

        recognition.onstart = () => {
            console.log("🎤 음성 인식 시작");
            setListening(true);
        };

        recognition.onend = () => {
            console.log("🎤 음성 인식 종료");
            setListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("❌ 음성 인식 오류:", event.error);
            setListening(false);

            let errorMessage = "음성 인식 중 오류가 발생했습니다.";
            switch (event.error) {
                case "no-speech":
                    errorMessage = "음성이 감지되지 않았습니다. 다시 시도해주세요.";
                    break;
                case "audio-capture":
                    errorMessage = "마이크에 접근할 수 없습니다. 마이크 권한을 확인해주세요.";
                    break;
                case "not-allowed":
                    errorMessage = "마이크 사용 권한이 거부되었습니다.";
                    break;
                case "network":
                    errorMessage = "네트워크 오류가 발생했습니다.";
                    break;
            }
            alert(errorMessage);
        };

        recognition.onresult = async (e: any) => {
            const transcript = e.results[0][0].transcript.trim();
            console.log("🎤 음성 입력:", transcript);
            setLastCommand(transcript);

            try {
                // 명령어 전달 - Firebase Functions URL 사용
                const voiceReportUrl = import.meta.env.VITE_VOICE_REPORT_ENDPOINT ||
                    "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/vibeReport";
                
                const res = await fetch(voiceReportUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ command: transcript }),
                });

                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }

                const data = await res.json();
                console.log("✅ GPT 응답:", data.brief);
                setLastResponse(data.brief);

                // 음성으로 응답
                speak(data.brief);

            } catch (error) {
                console.error("❌ 리포트 요청 오류:", error);
                const errorMessage = "리포트 요청 중 오류가 발생했습니다. 다시 시도해주세요.";
                setLastResponse(errorMessage);
                speak(errorMessage);
            }
        };

        recognition.start();
    };

    // 🗣️ 음성 출력
    const speak = (text: string) => {
        setSpeaking(true);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "ko-KR";
        utter.rate = 1.05;
        utter.pitch = 1.0;
        utter.volume = 1.0;

        utter.onstart = () => {
            console.log("🗣️ 음성 출력 시작");
        };

        utter.onend = () => {
            console.log("🗣️ 음성 출력 완료");
            setSpeaking(false);
        };

        utter.onerror = (event) => {
            console.error("❌ 음성 출력 오류:", event.error);
            setSpeaking(false);
            alert("음성 출력에 실패했습니다.");
        };

        speechSynthesis.speak(utter);
    };

    // 음성 중단
    const stopSpeaking = () => {
        speechSynthesis.cancel();
        setSpeaking(false);
    };

    return (
        <YagoLayout title="음성 리포트 어시스턴트">
            <div className="space-y-8">
                {/* 헤더 */}
                <YagoCard title="🎙️ 음성 리포트 어시스턴트" icon="🤖" gradient>
                    <div className="text-white/90 space-y-4">
                        <p className="text-lg font-semibold">YAGO SPORTS AI 음성 명령 시스템</p>
                        <p className="text-sm">자연스러운 음성 명령으로 주간 리포트를 요청하고 음성으로 들을 수 있습니다</p>
                    </div>
                </YagoCard>

                {/* 음성 명령 버튼 */}
                <YagoCard title="🎤 음성 명령" icon="🎙️">
                    <div className="text-center space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800">음성 명령 시작</h3>
                            <p className="text-gray-600">
                                마이크 버튼을 클릭하고 자연스럽게 말해보세요
                            </p>
                        </div>

                        <div className="flex justify-center">
                            <YagoButton
                                text={listening ? "🎙️ 듣는 중..." : speaking ? "🗣️ 읽는 중..." : "🎤 음성 명령 시작"}
                                onClick={startListening}
                                disabled={listening || speaking}
                                loading={listening || speaking}
                                icon={listening ? <Loader2 className="w-6 h-6 animate-spin" /> : speaking ? <Volume2 className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                variant="primary"
                                size="lg"
                            />
                        </div>

                        {speaking && (
                            <div className="mt-4">
                                <YagoButton
                                    text="⏹️ 음성 중단"
                                    onClick={stopSpeaking}
                                    icon={<MicOff className="w-4 h-4" />}
                                    variant="outline"
                                    size="md"
                                />
                            </div>
                        )}
                    </div>
                </YagoCard>

                {/* 명령어 예시 */}
                <YagoCard title="💡 명령어 예시" icon="📝">
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-yago-purple">📅 시간 기반 요청</h4>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    <li>• "야고야, 이번 주 리포트 읽어줘"</li>
                                    <li>• "지난주 리포트 요약해줘"</li>
                                    <li>• "2주 전 인사이트 알려줘"</li>
                                    <li>• "최근 리포트 들려줘"</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold text-yago-purple">📊 내용 기반 요청</h4>
                                <ul className="space-y-1 text-sm text-gray-600">
                                    <li>• "이번 주 주요 인사이트는?"</li>
                                    <li>• "지난주 통계 요약해줘"</li>
                                    <li>• "최근 추천사항 알려줘"</li>
                                    <li>• "주간 활동 요약해줘"</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </YagoCard>

                {/* 최근 대화 기록 */}
                {(lastCommand || lastResponse) && (
                    <YagoCard title="💬 최근 대화" icon="💭">
                        <div className="space-y-4">
                            {lastCommand && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-blue-50 rounded-lg p-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Mic className="w-4 h-4 text-blue-600" />
                                        <span className="font-semibold text-blue-800">사용자 명령</span>
                                    </div>
                                    <p className="text-gray-700">"{lastCommand}"</p>
                                </motion.div>
                            )}

                            {lastResponse && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-green-50 rounded-lg p-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Volume2 className="w-4 h-4 text-green-600" />
                                        <span className="font-semibold text-green-800">AI 응답</span>
                                    </div>
                                    <p className="text-gray-700">{lastResponse}</p>
                                </motion.div>
                            )}
                        </div>
                    </YagoCard>
                )}

                {/* 사용법 안내 */}
                <YagoCard title="ℹ️ 사용법 안내" icon="📖">
                    <div className="space-y-3 text-sm text-gray-600">
                        <p><strong>🎤 음성 인식:</strong> Chrome, Edge, Safari 브라우저에서 최적화되어 있습니다</p>
                        <p><strong>🗣️ 음성 출력:</strong> 브라우저의 SpeechSynthesis API를 사용합니다</p>
                        <p><strong>📅 리포트 선택:</strong> "이번 주", "지난주", "2주 전" 등으로 특정 주를 지정할 수 있습니다</p>
                        <p><strong>🧠 AI 분석:</strong> GPT-4o-mini가 리포트를 분석하여 자연스러운 음성 브리핑을 생성합니다</p>
                        <p><strong>⏹️ 음성 중단:</strong> 재생 중인 음성을 언제든지 중단할 수 있습니다</p>
                        <p className="text-xs text-gray-500 mt-4">
                            * 마이크 권한이 필요합니다. 브라우저에서 마이크 사용을 허용해주세요.
                        </p>
                    </div>
                </YagoCard>
            </div>
        </YagoLayout>
    );
}
