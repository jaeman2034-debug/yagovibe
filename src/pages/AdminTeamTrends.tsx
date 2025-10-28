import { useEffect, useState, useRef, useMemo } from "react";
import { collection, getDocs, query, orderBy, doc, onSnapshot } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import TrendChart from "@/components/TrendChart";
import TrendScoreCard from "@/components/TrendScoreCard";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type ReportSummary = {
    month: string;
    avgScore: number;
    trend: string;
    diff?: number;
    insight?: string;
    pdfUrl?: string;
    audioUrl?: string;
    participantCount?: number;
    monthlyAverages?: Array<{ month: string; avg: number; count: number }>;
    updatedAt?: any;
    createdAt?: any;
};

/**
 * AI 리포트에서 점수 추출 (간단한 휴리스틱)
 * 리포트 텍스트에서 숫자를 찾아 점수로 사용
 */
const extractScoreFromReport = (report: string): number => {
    if (!report) return 75; // 기본값

    // 패턴 1: "85점", "90점" 형태
    const scoreMatch1 = report.match(/([0-9]{1,3})점/g);
    if (scoreMatch1) {
        const scores = scoreMatch1.map((m) => parseInt(m.replace("점", "")));
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore >= 0 && avgScore <= 100) return Math.round(avgScore);
    }

    // 패턴 2: "85%", "90%" 형태
    const scoreMatch2 = report.match(/([0-9]{1,3})%/g);
    if (scoreMatch2) {
        const scores = scoreMatch2.map((m) => parseInt(m.replace("%", "")));
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore >= 0 && avgScore <= 100) return Math.round(avgScore);
    }

    // 패턴 3: 활동 횟수와 시간 기반 점수 계산
    // 리포트 길이와 긍정 키워드로 추정
    const positiveKeywords = ["좋", "향상", "증가", "개선", "활발", "우수", "훌륭", "성공"];
    const negativeKeywords = ["감소", "부족", "개선 필요", "주의", "낮음"];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveKeywords.forEach((keyword) => {
        const matches = report.match(new RegExp(keyword, "g"));
        if (matches) positiveCount += matches.length;
    });

    negativeKeywords.forEach((keyword) => {
        const matches = report.match(new RegExp(keyword, "g"));
        if (matches) negativeCount += matches.length;
    });

    // 기본 점수 75점에서 키워드 기반 조정
    let score = 75;
    score += positiveCount * 3;
    score -= negativeCount * 5;
    score = Math.max(60, Math.min(95, score)); // 60-95 범위로 제한

    return Math.round(score);
};

export default function AdminTeamTrends() {
    const { isAdmin, loading: authLoading } = useAdminGuard();
    const [data, setData] = useState<any[]>([]);
    const [months, setMonths] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [playingTTS, setPlayingTTS] = useState(false);
    const [sharingToSlack, setSharingToSlack] = useState(false);
    const [latestSummary, setLatestSummary] = useState<ReportSummary | null>(null);
    const dashboardRef = useRef<HTMLDivElement>(null);

    // 실시간 요약 스냅샷 구독
    useEffect(() => {
        if (!isAdmin) return;

        const summaryRef = doc(db, "reportSummaries", "latest");
        const unsubscribe = onSnapshot(
            summaryRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data() as ReportSummary;
                    setLatestSummary(data);
                    console.log("📊 최신 리포트 요약 업데이트:", data);
                } else {
                    setLatestSummary(null);
                }
            },
            (error) => {
                console.error("❌ 리포트 요약 구독 오류:", error);
            }
        );

        return () => unsubscribe();
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;

        (async () => {
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                const allData: any[] = [];

                for (const userDoc of usersSnap.docs) {
                    const user = userDoc.data();
                    const uid = userDoc.id;

                    // 월간 리포트 컬렉션 조회
                    const monthlyRef = collection(db, "monthlyReports", uid, "reports");
                    const reportsSnap = await getDocs(query(monthlyRef, orderBy("createdAt", "desc")));

                    for (const rep of reportsSnap.docs) {
                        const r = rep.data();
                        const score = extractScoreFromReport(r.report || "");

                        allData.push({
                            uid,
                            nickname: user.nickname || user.name || "이름 없음",
                            email: user.email || "",
                            month: rep.id,
                            score,
                            report: r.report,
                            weeklyReportsCount: r.weeklyReportsCount,
                            totalActivities: r.totalActivities,
                            totalDuration: r.totalDuration,
                        });
                    }
                }

                // 월 목록 추출 및 정렬
                const uniqueMonths = [...new Set(allData.map((d) => d.month))].sort().reverse();

                setMonths(uniqueMonths);
                setData(allData);
                setSelectedMonth(uniqueMonths[0] || "");
            } catch (error) {
                console.error("트렌드 데이터 로드 실패:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, [isAdmin]);

    // 🔊 AI 음성 요약 재생 (OpenAI TTS 또는 Web Speech API)
    const handlePlaySummary = async () => {
        const monthlyData = data.filter((d) => d.month === selectedMonth);
        if (monthlyData.length === 0) {
            alert("선택한 월의 데이터가 없습니다.");
            return;
        }

        const avgScore = monthlyData.reduce((a: number, b: any) => a + b.score, 0) / monthlyData.length;
        const top3 = [...monthlyData]
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3)
            .map((t: any) => t.nickname);

        const summaryText = `${selectedMonth}월 팀 평균 점수는 ${avgScore.toFixed(1)}점입니다. ${top3.length > 0 ? `상위 3명은 ${top3.join(", ")} 입니다.` : ""
            }`;

        setPlayingTTS(true);

        try {
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

            // OpenAI TTS API 사용 (환경 변수가 있는 경우)
            if (apiKey) {
                const response = await fetch("https://api.openai.com/v1/audio/speech", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: "tts-1", // tts-1 또는 tts-1-hd
                        input: summaryText,
                        voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer
                    }),
                });

                if (!response.ok) {
                    throw new Error(`OpenAI TTS API 오류: ${response.statusText}`);
                }

                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);

                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    setPlayingTTS(false);
                };

                audio.onerror = () => {
                    URL.revokeObjectURL(audioUrl);
                    setPlayingTTS(false);
                    // OpenAI TTS 실패 시 Web Speech API로 대체
                    fallbackToWebSpeechAPI(summaryText);
                };

                await audio.play();
            } else {
                // OpenAI API 키가 없으면 Web Speech API 사용
                fallbackToWebSpeechAPI(summaryText);
            }
        } catch (error) {
            console.error("TTS 재생 오류:", error);
            // OpenAI TTS 실패 시 Web Speech API로 대체
            fallbackToWebSpeechAPI(summaryText);
        }
    };

    // Web Speech API 대체 함수
    const fallbackToWebSpeechAPI = (text: string) => {
        if (!("speechSynthesis" in window)) {
            alert("이 브라우저는 음성 합성을 지원하지 않습니다.");
            setPlayingTTS(false);
            return;
        }

        // 기존 음성 중지
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ko-KR";
        utterance.rate = 1.5; // 최적 속도
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
            setPlayingTTS(false);
        };

        utterance.onerror = () => {
            setPlayingTTS(false);
        };

        window.speechSynthesis.speak(utterance);
    };

    const handleDownloadPDF = async () => {
        if (!dashboardRef.current) {
            alert("대시보드를 불러올 수 없습니다.");
            return;
        }

        setDownloading(true);
        try {
            // 대시보드 영역을 캔버스로 캡처
            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");

            // PDF 생성 (A4 포맷)
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = 210; // A4 폭 (mm)
            const pdfHeight = 297; // A4 높이 (mm)
            const margin = 10;
            const contentWidth = pdfWidth - margin * 2;
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // 헤더 추가
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.text("YAGO VIBE · AI 트렌드 리포트", pdfWidth / 2, margin + 10, { align: "center" });

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            pdf.text(`기간: ${selectedMonth || "전체"}`, pdfWidth / 2, margin + 20, { align: "center" });

            // 통계 정보
            const monthlyData = data.filter((d) => d.month === selectedMonth);
            const avgScore = monthlyData.reduce((a: number, b: any) => a + b.score, 0) / (monthlyData.length || 1);
            const maxScore = monthlyData.length > 0 ? Math.max(...monthlyData.map((d: any) => d.score)) : 0;
            const minScore = monthlyData.length > 0 ? Math.min(...monthlyData.map((d: any) => d.score)) : 0;

            pdf.setFontSize(10);
            const statsText = `평균: ${avgScore.toFixed(1)}점 | 최고: ${maxScore}점 | 최저: ${minScore}점 | 참여: ${monthlyData.length}명`;
            pdf.text(statsText, pdfWidth / 2, margin + 28, { align: "center", maxWidth: contentWidth });

            let y = margin + 35;

            // 이미지 추가 (여러 페이지로 분할)
            const pageHeight = pdfHeight - margin;
            const remainingHeight = pageHeight - y - 20; // 하단 여백 포함
            const totalPages = Math.ceil(imgHeight / remainingHeight);

            for (let i = 0; i < totalPages; i++) {
                if (i > 0) {
                    pdf.addPage();
                    y = margin;
                }

                const pageImgHeight = Math.min(remainingHeight, imgHeight - i * remainingHeight);
                const srcY = i * remainingHeight * (canvas.width / imgWidth);
                const srcHeight = pageImgHeight * (canvas.width / imgWidth);

                // 이미지 추가
                pdf.addImage(
                    imgData,
                    "PNG",
                    margin,
                    y,
                    imgWidth,
                    imgHeight,
                    undefined,
                    "FAST",
                    0,
                    srcY
                );

                // 페이지 번호 (하단)
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "normal");
                pdf.text(
                    `페이지 ${i + 1}/${totalPages}`,
                    pdfWidth / 2,
                    pdfHeight - 5,
                    { align: "center" }
                );
            }

            // 파일 다운로드
            const filename = `YAGO_VIBE_TeamReport_${selectedMonth || "all"}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error("PDF 생성 오류:", error);
            alert("PDF 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setDownloading(false);
        }
    };

    // 🤖 Slack 공유 (n8n Webhook 호출)
    const handleShareToSlack = async () => {
        const monthlyData = data.filter((d) => d.month === selectedMonth);
        if (monthlyData.length === 0) {
            alert("선택한 월의 데이터가 없습니다.");
            return;
        }

        if (!dashboardRef.current) {
            alert("대시보드를 불러올 수 없습니다.");
            return;
        }

        setSharingToSlack(true);
        try {
            // 1️⃣ PDF 생성 (대시보드 캡처)
            const canvas = await html2canvas(dashboardRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true,
            });

            const imgData = canvas.toDataURL("image/png");

            // PDF 생성 (A4 포맷)
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = 210;
            const pdfHeight = 297;
            const margin = 10;
            const contentWidth = pdfWidth - margin * 2;
            const imgWidth = contentWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // 헤더 추가
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.text("YAGO VIBE · AI 트렌드 리포트", pdfWidth / 2, margin + 10, { align: "center" });

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            pdf.text(`기간: ${selectedMonth || "전체"}`, pdfWidth / 2, margin + 20, { align: "center" });

            const avgScore = monthlyData.reduce((a: number, b: any) => a + b.score, 0) / monthlyData.length;
            const maxScore = Math.max(...monthlyData.map((d: any) => d.score));
            const minScore = Math.min(...monthlyData.map((d: any) => d.score));

            pdf.setFontSize(10);
            const statsText = `평균: ${avgScore.toFixed(1)}점 | 최고: ${maxScore}점 | 최저: ${minScore}점 | 참여: ${monthlyData.length}명`;
            pdf.text(statsText, pdfWidth / 2, margin + 28, { align: "center", maxWidth: contentWidth });

            let y = margin + 35;
            const pageHeight = pdfHeight - margin;
            const remainingHeight = pageHeight - y - 20;
            const totalPages = Math.ceil(imgHeight / remainingHeight);

            for (let i = 0; i < totalPages; i++) {
                if (i > 0) {
                    pdf.addPage();
                    y = margin;
                }

                const pageImgHeight = Math.min(remainingHeight, imgHeight - i * remainingHeight);
                const srcY = i * remainingHeight * (canvas.width / imgWidth);

                pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight, undefined, "FAST", 0, srcY);

                pdf.setFontSize(9);
                pdf.setFont("helvetica", "normal");
                pdf.text(`페이지 ${i + 1}/${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: "center" });
            }

            // 2️⃣ Firebase Storage 업로드
            const blob = pdf.output("blob");
            const fileName = `teamReport_${selectedMonth || "all"}_${Date.now()}.pdf`;
            const storageRef = ref(storage, `reportsPDF/${fileName}`);
            await uploadBytes(storageRef, blob);
            const pdfUrl = await getDownloadURL(storageRef);

            // 3️⃣ 상위 3명 추출
            const top3 = [...monthlyData]
                .sort((a: any, b: any) => b.score - a.score)
                .slice(0, 3)
                .map((t: any) => t.nickname);

            // 4️⃣ n8n Webhook 호출
            const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://n8n.yagovibe.ai/webhook/ai-report";
            const payload = {
                month: selectedMonth,
                avgScore: avgScore.toFixed(1),
                top3: top3.join(", "),
                pdfUrl,
                participantCount: monthlyData.length,
                maxScore,
                minScore,
                createdAt: new Date().toISOString(),
            };

            const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Webhook 호출 실패: ${response.statusText}`);
            }

            alert("✅ Slack으로 리포트가 전송되었습니다!");
        } catch (error) {
            console.error("Slack 공유 오류:", error);
            alert(`Slack 전송 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setSharingToSlack(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-2">YAGO VIBE</div>
                    <div className="text-gray-500">로딩 중...</div>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null; // useAdminGuard가 리디렉션 처리
    }

    const monthlyData = data.filter((d) => d.month === selectedMonth);
    const avgScore = monthlyData.reduce((a: number, b: any) => a + b.score, 0) / (monthlyData.length || 1);
    const maxScore = monthlyData.length > 0 ? Math.max(...monthlyData.map((d: any) => d.score)) : 0;
    const minScore = monthlyData.length > 0 ? Math.min(...monthlyData.map((d: any) => d.score)) : 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        📈 팀별 AI 리포트 트렌드 대시보드
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        팀원들의 월간 리포트 데이터를 분석하여 트렌드를 확인하세요
                    </p>
                </div>

                {/* 실시간 최신 리포트 배너 */}
                {latestSummary && (
                    <div className="mb-6 rounded-xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex flex-col md:flex-row md:items-center md:justify-between shadow-md animate-pulse">
                        <div className="space-y-2 flex-1">
                            <div className="font-semibold text-emerald-900 dark:text-emerald-100 text-lg flex items-center gap-2">
                                <span>📊</span>
                                <span>최신 리포트: {latestSummary.month}</span>
                            </div>
                            <div className="text-sm text-emerald-700 dark:text-emerald-300">
                                평균 <b className="font-bold text-lg">{latestSummary.avgScore.toFixed(1)}</b>점 •{" "}
                                <b className="font-semibold">{latestSummary.trend}</b>
                                {latestSummary.diff !== undefined && (
                                    <>
                                        {" "}
                                        ({latestSummary.diff > 0 ? "+" : ""}
                                        {latestSummary.diff.toFixed(1)}점)
                                    </>
                                )}
                                {latestSummary.insight && (
                                    <>
                                        {" "}• <span className="text-emerald-600 dark:text-emerald-400 italic">{latestSummary.insight.substring(0, 80)}...</span>
                                    </>
                                )}
                            </div>
                            {latestSummary.updatedAt && (
                                <div className="text-xs text-emerald-600 dark:text-emerald-400">
                                    업데이트:{" "}
                                    {latestSummary.updatedAt.toDate
                                        ? latestSummary.updatedAt.toDate().toLocaleString("ko-KR")
                                        : new Date().toLocaleString("ko-KR")}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 md:mt-0 flex gap-2">
                            {latestSummary.pdfUrl && (
                                <a
                                    href={latestSummary.pdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
                                >
                                    <span>📄</span>
                                    <span>PDF 보기</span>
                                </a>
                            )}
                            {latestSummary.audioUrl && (
                                <a
                                    href={latestSummary.audioUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-semibold flex items-center gap-2"
                                >
                                    <span>🎧</span>
                                    <span>음성 듣기</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* 필터 및 통계 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                📅 월 선택
                            </label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white"
                            >
                                {months.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 통계 카드 */}
                        <div className="grid grid-cols-3 gap-4 flex-1">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">평균 점수</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {avgScore.toFixed(1)}
                                </p>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">최고 점수</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{maxScore}</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">최저 점수</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{minScore}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handlePlaySummary}
                                disabled={playingTTS || !selectedMonth || monthlyData.length === 0}
                                className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {playingTTS ? (
                                    <>
                                        <span className="animate-pulse">⏳</span>
                                        <span>재생 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🔊</span>
                                        <span>AI 요약 듣기</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={downloading || !selectedMonth}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {downloading ? "⏳ PDF 생성 중..." : "📥 PDF 다운로드"}
                            </button>
                            <button
                                onClick={handleShareToSlack}
                                disabled={sharingToSlack || !selectedMonth || monthlyData.length === 0}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {sharingToSlack ? (
                                    <>
                                        <span className="animate-pulse">⏳</span>
                                        <span>전송 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🤖</span>
                                        <span>Slack 공유</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* PDF 캡처 대상 대시보드 영역 */}
                <div ref={dashboardRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 p-6">
                    {/* 헤더 */}
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            📈 YAGO VIBE AI 트렌드 리포트
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            {selectedMonth || "전체 기간"} · 팀 평균 점수: {avgScore.toFixed(1)}점
                        </p>
                    </div>

                    {/* 차트 섹션 */}
                    {months.length > 0 && <TrendChart data={data} months={months} />}

                    {/* 팀원 리스트 */}
                    {selectedMonth && (
                        <div className="mt-8">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                👥 {selectedMonth} 팀원별 점수
                            </h2>
                            {monthlyData.length === 0 ? (
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-12 text-center">
                                    <p className="text-gray-500 dark:text-gray-400">
                                        선택한 월에 리포트가 없습니다.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {monthlyData
                                        .sort((a: any, b: any) => b.score - a.score)
                                        .map((m: any, index: number) => (
                                            <TrendScoreCard key={`${m.uid}-${m.month}`} data={m} rank={index + 1} />
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 푸터 */}
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
                        <p>© 2025 YAGO VIBE · Powered by AI</p>
                        <p className="mt-1">생성일: {new Date().toLocaleDateString("ko-KR")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

