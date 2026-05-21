import { useEffect, useMemo, useState, useRef } from "react";
import { collection, onSnapshot, orderBy, query, where, limit, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import YagoLayout from "@/layouts/YagoLayout";
import { YagoButton, YagoCard, YagoStatCard } from "@/components/ui/YagoComponents";
import dayjs from "dayjs";
import { aggregateLogs } from "@/utils/aggregateLogs";
import AIWeeklySummary from "@/components/AIWeeklySummary";
import AdminSummaryChart from "@/components/AdminSummaryChart";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Insight = {
    headline: string;
    bullets: string[];
    action: string;
};

export default function Insights() {
    const [raw, setRaw] = useState<any[]>([]);
    const [agg, setAgg] = useState<any>(null);
    const [insight, setInsight] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(false);
    const [slackLoading, setSlackLoading] = useState(false);
    const [weeklyReport, setWeeklyReport] = useState<any>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);
    const todayStart = dayjs().startOf("day").toDate();

    // 1) 오늘 로그 실시간 구독
    useEffect(() => {
        const q = query(
            collection(db, "voice_logs"),
            where("ts", ">=", todayStart),
            orderBy("ts", "desc"),
            limit(1000)
        );
        const unsub = onSnapshot(q, (snap) => {
            const arr: any[] = [];
            snap.forEach((d) => arr.push(d.data()));
            setRaw(arr);
        });
        return () => unsub();
    }, []);

    // 2) 집계
    useEffect(() => {
        const loadAggregation = async () => {
            const result = await aggregateLogs();
            setAgg(result);
        };
        loadAggregation();
    }, []);

    // 3) AI 주간 리포트 구독
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reports", "weekly", "data", "summary"), (snap) => {
            if (snap.exists()) {
                setWeeklyReport(snap.data());
            }
        });
        return () => unsub();
    }, []);

    // 4) GPT 호출 → 인사이트 생성
    const generateInsight = async () => {
        if (!agg) return;
        setLoading(true);
        try {
            const key = import.meta.env.VITE_OPENAI_API_KEY;
            if (!key) {
                alert("OpenAI 키가 없습니다. VITE_OPENAI_API_KEY 설정을 확인하세요.");
                setLoading(false);
                return;
            }

            const payload = {
                date: agg.date,
                total: agg.total,
                intents: agg.intents,
                keywords: agg.keywords,
                hours: agg.hours,
                // 지오샘플은 토큰 절약을 위해 30개만 전송
                geoSample: agg.geoSample.slice(0, 30),
            };

            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content:
                                "너는 데이터 분석 인사이트 생성기야. 주어진 로그 요약에서 비즈니스/운영 측면의 통찰 3~5개와 실행 액션 1개를 한국어로 간결하게 만들어줘. 형식은 JSON으로만 출력해: {\"headline\":\"...\",\"bullets\":[\"...\",\"...\"],\"action\":\"...\"}",
                        },
                        { role: "user", content: JSON.stringify(payload) },
                    ],
                    temperature: 0.3,
                }),
            });

            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content ?? "";

            // 모델이 JSON만 내도록 요청했지만 혹시 대비
            const parsed = JSON.parse(
                text.trim().replace(/```json/g, "").replace(/```/g, "")
            ) as Insight;

            setInsight(parsed);
        } catch (e) {
            console.error(e);
            alert("인사이트 생성 실패: " + (e instanceof Error ? e.message : "알 수 없는 오류"));
        } finally {
            setLoading(false);
        }
    };

    // 5) Slack 공유 (옵션)
    const shareToSlack = async () => {
        if (!insight || !agg) return;
        setSlackLoading(true);
        try {
            const topIntent = Object.entries(agg.intents).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";
            const topKeyword = Object.entries(agg.keywords).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "-";

            const text =
                `🧠 *YAGO AI 인사이트* (${agg.date})\n` +
                `📊 총 ${agg.total}건 | 상위 의도: ${topIntent} | 상위 키워드: ${topKeyword}\n\n` +
                `*${insight.headline}*\n` +
                insight.bullets.map((b) => `• ${b}`).join("\n") +
                `\n\n➡️ *Action:* ${insight.action}\n\n` +
                `_Generated by YAGO SPORTS AI System_`;

            // 간단: Incoming Webhook 사용
            const webhook = import.meta.env.VITE_SLACK_WEBHOOK_URL || "";
            if (!webhook) {
                alert("Slack Webhook이 설정되지 않았습니다.\n환경 변수 VITE_SLACK_WEBHOOK_URL을 설정하세요.");
                return;
            }

            await fetch(webhook, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            alert("✅ Slack 공유 완료!");
        } catch (e) {
            console.error(e);
            alert("❌ Slack 공유 실패: " + (e instanceof Error ? e.message : "알 수 없는 오류"));
        } finally {
            setSlackLoading(false);
        }
    };

    // AI 주간 리포트 계산
    const weeklyStats = useMemo(() => {
        if (!weeklyReport) return null;
        return {
            newUsers: weeklyReport.newUsers || 0,
            activeUsers: weeklyReport.activeUsers || 0,
            growthRate: weeklyReport.growthRate || "0%",
        };
    }, [weeklyReport]);

    // 통계 계산
    const stats = useMemo(() => {
        if (!agg) return null;

        const topIntent = Object.entries(agg.intents).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        const topKeyword = Object.entries(agg.keywords).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        const peakHour = Object.entries(agg.hours).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

        return {
            topIntent: topIntent ? topIntent[0] : "없음",
            topIntentCount: topIntent ? topIntent[1] : 0,
            topKeyword: topKeyword ? topKeyword[0] : "없음",
            topKeywordCount: topKeyword ? topKeyword[1] : 0,
            peakHour: peakHour ? peakHour[0] : "없음",
            peakHourCount: peakHour ? peakHour[1] : 0,
        };
    }, [agg]);

    // PDF 내보내기 함수
    const handleExportPDF = async () => {
        if (!pdfRef.current) return;

        setPdfLoading(true);
        try {
            const canvas = await html2canvas(pdfRef.current, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF("p", "mm", "a4");
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

            const pdfBlob = pdf.output("blob");
            const timestamp = Date.now();
            const storageRef = ref(storage, `reports/admin_insights_${timestamp}.pdf`);
            await uploadBytes(storageRef, pdfBlob);

            const downloadURL = await getDownloadURL(storageRef);
            pdf.save(`admin_insights_${timestamp}.pdf`);
            
            // Firestore에 PDF URL 업데이트 (ZIP 트리거용)
            try {
                const weeklyRef = doc(db, "reports", "weekly");
                await updateDoc(weeklyRef, { pdfURL: downloadURL });
                console.log("✅ Firestore 업데이트 완료, ZIP 생성 트리거");
            } catch (firestoreErr) {
                console.warn("⚠️ Firestore 업데이트 실패 (ZIP 트리거 건너뜀):", firestoreErr);
            }
            
            alert("✅ PDF 저장 완료!");
            console.log("PDF URL:", downloadURL);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("⚠️ PDF 저장 중 오류 발생");
        } finally {
            setPdfLoading(false);
        }
    };

    return (
        <YagoLayout title="AI Insight Generator">
            <div className="space-y-6">
                {/* 📊 헤더 섹션 */}
                <div className="text-center">
                    <h1 className="text-4xl font-display font-bold text-yago-purple mb-2">
                        🧠 AI Insight Generator
                    </h1>
                    <p className="text-lg text-yago-gray">
                        GPT-4o-mini가 분석하는 실시간 비즈니스 인사이트
                    </p>
                </div>

                {/* PDF 내보내기 버튼 */}
                <div className="text-center">
                    <button
                        onClick={handleExportPDF}
                        disabled={pdfLoading}
                        className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        {pdfLoading ? "📦 PDF 저장 중..." : "💾 PDF 리포트 저장"}
                    </button>
                </div>

                <div ref={pdfRef} className="space-y-6">
                    {/* 🧠 AI 주간 리포트 */}
                    <AIWeeklySummary />

                    {/* 📊 AI 주간 통계 그래프 */}
                    <YagoCard title="📊 AI 주간 활동 통계" icon="📈">
                        <div className="h-[400px]">
                            <AdminSummaryChart />
                        </div>
                    </YagoCard>

                {/* 📈 통계 카드 그리드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <YagoStatCard
                        title="신규 가입자"
                        value={weeklyStats?.newUsers || 0}
                        change="이번 주"
                        trend="up"
                        icon="👥"
                    />
                    <YagoStatCard
                        title="활성 사용자"
                        value={weeklyStats?.activeUsers || 0}
                        change="이번 주"
                        trend="up"
                        icon="✅"
                    />
                    <YagoStatCard
                        title="성장률"
                        value={weeklyStats?.growthRate || "0%"}
                        change="주간 변화"
                        trend="neutral"
                        icon="📈"
                    />
                    <YagoStatCard
                        title="오늘 총 로그"
                        value={agg?.total || 0}
                        change="실시간 업데이트"
                        trend="up"
                        icon="📝"
                    />
                </div>

                {/* 추가 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <YagoStatCard
                        title="인기 의도"
                        value={stats?.topIntent || "없음"}
                        change={`${stats?.topIntentCount || 0}회`}
                        trend="neutral"
                        icon="🎯"
                    />
                    <YagoStatCard
                        title="인기 키워드"
                        value={stats?.topKeyword || "없음"}
                        change={`${stats?.topKeywordCount || 0}회`}
                        trend="neutral"
                        icon="🔥"
                    />
                    <YagoStatCard
                        title="피크 시간대"
                        value={stats?.peakHour ? `${stats.peakHour}:00` : "없음"}
                        change={`${stats?.peakHourCount || 0}회`}
                        trend="neutral"
                        icon="⏰"
                    />
                </div>

                {/* 🎮 액션 버튼들 */}
                <YagoCard title="🎮 AI 인사이트 생성" icon="⚙️">
                    <div className="flex flex-wrap gap-4">
                        <YagoButton
                            text={loading ? "🧠 AI 분석 중..." : "🧠 오늘의 인사이트 생성"}
                            onClick={generateInsight}
                            variant="primary"
                            icon="🧠"
                            loading={loading}
                            disabled={loading || !agg || agg.total === 0}
                        />
                        <YagoButton
                            text={slackLoading ? "📱 공유 중..." : "📱 Slack 공유"}
                            onClick={shareToSlack}
                            variant="accent"
                            icon="📱"
                            loading={slackLoading}
                            disabled={slackLoading || !insight}
                        />
                        <YagoButton
                            text="🔄 새로고침"
                            onClick={() => window.location.reload()}
                            variant="outline"
                            icon="🔄"
                        />
                    </div>
                    <div className="mt-4 text-sm text-yago-gray">
                        {agg && agg.total === 0 ? (
                            <span className="text-orange-600">⚠️ 오늘 로그가 없습니다. 음성 명령을 사용해보세요.</span>
                        ) : (
                            <span>✅ {agg?.total || 0}건의 로그 데이터로 인사이트를 생성할 수 있습니다.</span>
                        )}
                    </div>
                </YagoCard>

                {/* 🧠 AI 인사이트 카드 */}
                <YagoCard title="🧠 AI 생성 인사이트" icon="🤖" gradient>
                    {insight ? (
                        <div className="space-y-4">
                            <div className="bg-white/20 rounded-xl p-4">
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    {insight.headline}
                                </h3>
                                <ul className="space-y-2 text-white/90">
                                    {insight.bullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-yago-pink mt-1">•</span>
                                            <span>{bullet}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-yago-pink">➡️</span>
                                    <span className="font-semibold text-white">Action</span>
                                </div>
                                <p className="text-white/90">{insight.action}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-6xl mb-4">🤖</div>
                            <p className="text-white/80 text-lg mb-2">
                                AI 인사이트를 생성하려면 버튼을 클릭하세요
                            </p>
                            <p className="text-white/60 text-sm">
                                GPT-4o-mini가 오늘의 로그 데이터를 분석하여 비즈니스 인사이트를 제공합니다
                            </p>
                        </div>
                    )}
                </YagoCard>

                {/* 📊 상세 집계 뷰 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 의도별 통계 */}
                    <YagoCard title="📊 의도별 분포" icon="🎯">
                        <div className="space-y-3">
                            {Object.entries(agg?.intents || {})
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .slice(0, 8)
                                .map(([intent, count]) => (
                                    <div key={intent} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-1 bg-yago-purple text-white text-xs font-semibold rounded-full">
                                                {intent}
                                            </span>
                                        </div>
                                        <span className="px-3 py-1 bg-yago-purple text-white text-sm font-semibold rounded-full">
                                            {count as number}회
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </YagoCard>

                    {/* 키워드별 통계 */}
                    <YagoCard title="🔥 키워드별 분포" icon="🔥">
                        <div className="space-y-3">
                            {Object.entries(agg?.keywords || {})
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .slice(0, 8)
                                .map(([keyword, count]) => (
                                    <div key={keyword} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-1 bg-yago-pink text-white text-xs font-semibold rounded-full">
                                                {keyword}
                                            </span>
                                        </div>
                                        <span className="px-3 py-1 bg-yago-pink text-white text-sm font-semibold rounded-full">
                                            {count as number}회
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </YagoCard>

                    {/* 시간대별 통계 */}
                    <YagoCard title="⏰ 시간대별 분포" icon="⏰">
                        <div className="space-y-3">
                            {Object.entries(agg?.hours || {})
                                .sort((a, b) => (b[1] as number) - (a[1] as number))
                                .slice(0, 8)
                                .map(([hour, count]) => (
                                    <div key={hour} className="flex items-center justify-between p-3 bg-yago-soft rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="px-2 py-1 bg-yago-blue text-white text-xs font-semibold rounded-full">
                                                {hour}:00
                                            </span>
                                        </div>
                                        <span className="px-3 py-1 bg-yago-blue text-white text-sm font-semibold rounded-full">
                                            {count as number}회
                                        </span>
                                    </div>
                                ))}
                        </div>
                    </YagoCard>
                </div>

                {/* 🚀 빠른 링크 */}
                <YagoCard title="🚀 빠른 링크" icon="🔗" gradient>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <a
                            href="/admin"
                            className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
                        >
                            <div className="text-2xl mb-2">📊</div>
                            <div className="text-sm font-medium">관리자 대시보드</div>
                        </a>
                        <a
                            href="/admin/geo"
                            className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
                        >
                            <div className="text-2xl mb-2">📍</div>
                            <div className="text-sm font-medium">Geo Analytics</div>
                        </a>
                        <a
                            href="/voice-map-dashboard"
                            className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
                        >
                            <div className="text-2xl mb-2">📝</div>
                            <div className="text-sm font-medium">로그 대시보드</div>
                        </a>
                        <a
                            href="/voice"
                            className="p-4 bg-white/20 rounded-xl text-center hover:bg-white/30 transition-colors"
                        >
                            <div className="text-2xl mb-2">🗺️</div>
                            <div className="text-sm font-medium">음성 지도</div>
                        </a>
                    </div>
                </YagoCard>
                </div>
            </div>
        </YagoLayout>
    );
}
