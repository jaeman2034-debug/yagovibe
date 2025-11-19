import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from "jspdf";

export default function VoiceAssistantButton() {
    const navigate = useNavigate();
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);
    const [recognizedText, setRecognizedText] = useState("");

    useEffect(() => {
        // 브라우저 음성인식 객체 생성
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("⚠️ 이 브라우저는 STT를 지원하지 않습니다.");
            return;
        }

        const recog = new SpeechRecognition();
        recog.lang = "ko-KR";
        recog.continuous = false;
        recog.interimResults = false;

        recog.onresult = (event: any) => {
            const text = event.results[0][0].transcript.trim();
            console.log("🎙️ 인식된 명령어:", text);
            setRecognizedText(text);
            handleCommand(text);
        };

        recog.onend = () => setIsListening(false);

        recog.onerror = (event: any) => {
            console.error("❌ 음성 인식 오류:", event.error);
            setIsListening(false);
        };

        setRecognition(recog);
    }, []);

    // 음성 명령 처리 로직
    const handleCommand = async (text: string) => {
        const normalized = text.replace(/\s+/g, "").toLowerCase();

        // 라우팅 명령어 매핑
        const routes = [
            { keywords: ["홈", "대시보드", "시작"], path: "/home", name: "홈" },
            { keywords: ["음성", "가입", "시작"], path: "/start", name: "음성 가입" },
            { keywords: ["지도", "맵", "지도"], path: "/voice-map", name: "지도" },
            { keywords: ["마켓", "쇼핑", "구매"], path: "/app/market", name: "마켓" },
            { keywords: ["시설", "체육시설", "운동장", "축구장", "농구장"], path: "/app/facility", name: "시설" },
            { keywords: ["팀", "팀목록"], path: "/app/team", name: "팀" },
            { keywords: ["이벤트", "일정"], path: "/app/event", name: "이벤트" },
            { keywords: ["관리자", "어드민", "관리"], path: "/app/admin", name: "관리자" },
        ];

        for (const r of routes) {
            if (r.keywords.some(k => normalized.includes(k))) {
                console.log(`➡️ '${r.path}' 페이지로 이동`);
                navigate(r.path);
                speak(`${r.name} 페이지로 이동합니다.`);
                return;
            }
        }

        // ✅ 리포트 TTS 읽기 명령
        if (normalized.includes("리포트읽") || normalized.includes("리포트듣") || 
            (normalized.includes("리포트") && (normalized.includes("읽") || normalized.includes("듣") || normalized.includes("말")))) {
            handleReadReport();
            return;
        }

        // ✅ 리포트 PDF 생성 명령
        if (normalized.includes("리포트pdf") || normalized.includes("리포트저장") || 
            (normalized.includes("리포트") && (normalized.includes("pdf") || normalized.includes("저장") || normalized.includes("만들")))) {
            handleGenerateReportPDF();
            return;
        }

        // ✅ NLU 처리 (의도 분류 및 자동 실행)
        if (normalized.includes("리포트") || normalized.includes("레포트") || normalized.includes("보고서")) {
            speak("AI에게 요청을 전달합니다. 잠시만요…");

            // 의도 분류: "보여줘" vs "만들어줘"
            const intent = (normalized.includes("보여") || normalized.includes("불러") || normalized.includes("가져"))
                ? "getReport"
                : "createReport";

            await callNLU(intent, text);
            return;
        }

        // 매칭 안 될 때
        speak("명령을 이해하지 못했어요. 다시 말씀해 주세요.");
    };

    // 📄 리포트 TTS 읽기
    const handleReadReport = async () => {
        try {
            const summaryRef = doc(db, "reports/weekly/data/summary");
            const summarySnap = await getDoc(summaryRef);

            if (summarySnap.exists()) {
                const data = summarySnap.data();
                const summaryText = `신규 가입자: ${data.newUsers}명. 활성 사용자: ${data.activeUsers}명. 성장률: ${data.growthRate}. ${data.highlight}. ${data.recommendation}`;
                speak(summaryText);
            } else {
                speak("리포트 데이터를 불러올 수 없습니다.");
            }
        } catch (err) {
            console.error("리포트 읽기 오류:", err);
            speak("리포트를 읽는 중 오류가 발생했습니다.");
        }
    };

    // 📄 리포트 PDF 생성
    const handleGenerateReportPDF = async () => {
        try {
            speak("PDF를 생성 중입니다.");

            // Firestore에서 주간 데이터 가져오기
            const summaryRef = doc(db, "reports/weekly/data/summary");
            const analyticsRef = doc(db, "reports/weekly/data/analytics");
            
            const summarySnap = await getDoc(summaryRef);
            const analyticsSnap = await getDoc(analyticsRef);

            const summary = summarySnap.exists() ? summarySnap.data() : null;
            const analytics = analyticsSnap.exists() ? analyticsSnap.data() : null;

            // PDF 생성
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            let y = 60;

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(20);
            pdf.text("YAGO VIBE SPORTS - AI Weekly Report", 40, y);
            y += 25;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toISOString().split("T")[0]}`, 40, y);
            y += 30;

            if (summary) {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.text("Weekly Summary", 40, y);
                y += 20;

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(11);
                pdf.text(`- New Users: ${summary.newUsers}`, 50, y);
                y += 18;
                pdf.text(`- Active Users: ${summary.activeUsers}`, 50, y);
                y += 18;
                pdf.text(`- Growth Rate: ${summary.growthRate}`, 50, y);
                y += 18;
                
                const highlightText = summary.highlight?.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || "";
                if (highlightText) {
                    const highlightLines = pdf.splitTextToSize(`- Highlight: ${highlightText}`, pageWidth - 100);
                    for (let i = 0; i < highlightLines.length && y < pageHeight - 60; i++) {
                        pdf.text(highlightLines[i], 50, y);
                        y += 18;
                    }
                }
                
                pdf.text(`- Recommendation: ${summary.recommendation}`, 50, y);
                y += 30;
            }

            if (analytics && analytics.labels && analytics.newUsers && analytics.activeUsers) {
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(14);
                pdf.text("Weekly Statistics", 40, y);
                y += 25;

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(10);
                
                pdf.text("Week", 50, y);
                pdf.text("New Users", 120, y);
                pdf.text("Active Users", 200, y);
                y += 20;

                for (let i = 0; i < Math.min(analytics.labels.length, analytics.newUsers.length, analytics.activeUsers.length); i++) {
                    pdf.text(`Week ${i + 1}`, 50, y);
                    pdf.text(`${analytics.newUsers[i]}`, 120, y);
                    pdf.text(`${analytics.activeUsers[i]}`, 200, y);
                    y += 18;
                }
            }

            pdf.save(`AI_Weekly_Report_${new Date().toISOString().split("T")[0]}.pdf`);
            speak("PDF 리포트가 다운로드되었습니다.");
        } catch (err) {
            console.error("PDF 생성 오류:", err);
            speak("PDF 생성 중 오류가 발생했습니다.");
        }
    };

    // ✅ NLU 호출 → Functions 실행 → Firestore 로그 저장
    const callNLU = async (intent: string, originalText: string) => {
        try {
            const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-ai";

            // 의도에 따라 다른 Functions 호출
            const endpoint = intent === "getReport"
                ? `https://asia-northeast3-${projectId}.cloudfunctions.net/vibeReport?period=thisweek`
                : `https://asia-northeast3-${projectId}.cloudfunctions.net/vibeReport?period=thisweek&create=true`;

            console.log(`📡 NLU 호출: ${intent} → ${endpoint}`);

            const res = await fetch(endpoint);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            console.log("📊 NLU 응답:", data);

            // ✅ Firestore 로그 저장 (선택적)
            try {
                await fetch(`https://asia-northeast3-${projectId}.cloudfunctions.net/vibeLog`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: intent,
                        command: originalText,
                        timestamp: Date.now(),
                        result: data.success || false,
                        message: data.message || "no message",
                    }),
                });
                console.log("💾 로그 저장 완료");
            } catch (logErr) {
                console.warn("⚠️ 로그 저장 실패:", logErr);
                // 로그 저장 실패해도 계속 진행
            }

            // TTS 응답
            if (intent === "getReport") {
                speak("이번 주 리포트를 불러왔습니다. 관리자 페이지에서 확인하세요.");
                // 리포트 조회 후 관리자 페이지로 이동
                setTimeout(() => navigate("/admin"), 1000);
            } else {
                speak("리포트 생성이 완료되었습니다. 데이터를 확인하세요.");
            }
        } catch (err) {
            console.error("❌ NLU 호출 오류:", err);
            speak("AI 서버와의 연결에 문제가 있습니다. 다시 시도해주세요.");
        }
    };

    // 음성 응답 (TTS)
    const speak = (msg: string) => {
        const utter = new SpeechSynthesisUtterance(msg);
        utter.lang = "ko-KR";
        utter.rate = 1.5; // 최적 속도
        window.speechSynthesis.speak(utter);
    };

    // 마이크 버튼 클릭 시
    const toggleListening = () => {
        if (!recognition) return;
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <div className="flex items-center space-x-3">
                <button
                    onClick={toggleListening}
                    className={`w-16 h-16 rounded-full text-2xl shadow-xl transition-all hover:scale-110 ${isListening ? "bg-red-500 animate-pulse" : "bg-blue-500 hover:bg-blue-600"
                        }`}
                >
                    🎤
                </button>
                {isListening && (
                    <span className="bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 animate-pulse">
                        음성 인식 중...
                    </span>
                )}
            </div>
            {recognizedText && !isListening && (
                <div className="mt-3 bg-white px-4 py-2 rounded-lg shadow-lg text-sm text-gray-700 border border-gray-200">
                    🗣️ <span className="font-semibold">{recognizedText}</span>
                </div>
            )}
        </div>
    );
}
