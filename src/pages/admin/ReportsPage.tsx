import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { FileText, Download, RefreshCcw, Volume2, Calendar, BarChart3, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import YagoLayout from "@/layouts/YagoLayout";
import { YagoButton, YagoCard } from "@/components/ui/YagoComponents";
import dayjs from "dayjs";

interface WeeklyReport {
    id: string;
    date: string;
    summary: string;
    insights: string[];
    recommendations: string[];
    metrics: {
        totalLogs: number;
        geoCount: number;
        deviceTypes: number;
        actionTypes: number;
    };
    pdfUrl: string;
    createdAt: any;
    totalLogs: number;
    geoCount: number;
    deviceTypes: number;
    actionTypes: number;
    slackSent: boolean;
    status: string;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<WeeklyReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [speakingId, setSpeakingId] = useState<string | null>(null);

    const loadReports = async () => {
        setLoading(true);
        try {
            console.log("📊 주간 리포트 목록 로딩 시작...");

            const q = query(
                collection(db, "weekly_reports"),
                orderBy("createdAt", "desc"),
                limit(8)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as WeeklyReport[];

            console.log("✅ 주간 리포트 목록 로딩 완료:", data.length, "개");
            setReports(data);

        } catch (err) {
            console.error("❌ 리포트 목록 로딩 오류:", err);
            alert("리포트 목록을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async (report: WeeklyReport) => {
        setDownloading(report.id);
        try {
            console.log("📄 리포트 다운로드 시작:", report.id);

            // PDF 다운로드
            const response = await fetch('/api/generateWeeklyReport', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `YAGO_VIBE_Weekly_Report_${dayjs(report.date).format("YYYY-MM-DD")}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            console.log("✅ 리포트 다운로드 완료");

        } catch (error) {
            console.error("❌ 리포트 다운로드 오류:", error);
            alert(`리포트 다운로드에 실패했습니다:\n${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setDownloading(null);
        }
    };

    // GPT 요약 요청 + 음성 출력
    const speakSummary = async (report: WeeklyReport) => {
        try {
            console.log("🎧 음성 요약 시작:", report.id);
            setSpeakingId(report.id);

            // 이전 음성 중단
            speechSynthesis.cancel();

            const res = await fetch("/api/summarizeReport", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    summary: report.summary,
                    insights: report.insights,
                    recommendations: report.recommendations,
                    metrics: report.metrics,
                    totalLogs: report.totalLogs,
                    geoCount: report.geoCount,
                    deviceTypes: report.deviceTypes,
                    actionTypes: report.actionTypes,
                }),
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            console.log("✅ GPT 요약 생성 완료:", data.brief);

            const utter = new SpeechSynthesisUtterance(data.brief);
            utter.lang = "ko-KR";
            utter.rate = 1.05; // 적당한 속도로 설정
            utter.pitch = 1.0;
            utter.volume = 1.0;

            utter.onstart = () => {
                console.log("🎙️ 음성 재생 시작");
            };

            utter.onend = () => {
                console.log("🎙️ 음성 재생 완료");
                setSpeakingId(null);
            };

            utter.onerror = (event) => {
                console.error("❌ 음성 재생 오류:", event.error);
                setSpeakingId(null);
                alert("음성 재생에 실패했습니다. 브라우저 설정을 확인해주세요.");
            };

            speechSynthesis.speak(utter);

        } catch (e) {
            console.error("❌ 음성 요약 실패:", e);
            setSpeakingId(null);
            alert(`음성 요약에 실패했습니다:\n${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    return (
        <YagoLayout title="주간 리포트 히스토리">
            <div className="space-y-6">
                {/* 헤더 */}
                <YagoCard title="📅 주간 리포트 히스토리" icon="📊" gradient>
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="text-white/90">
                            <p className="text-lg font-semibold">최근 생성된 AI 리포트</p>
                            <p className="text-sm">총 {reports.length}개의 주간 리포트가 있습니다</p>
                        </div>
                        <YagoButton
                            text="🔄 새로고침"
                            onClick={loadReports}
                            disabled={loading}
                            loading={loading}
                            icon={<RefreshCcw className="w-4 h-4" />}
                            variant="secondary"
                        />
                    </div>
                </YagoCard>

                {/* 리포트 목록 */}
                <div className="space-y-4">
                    {loading && (
                        <YagoCard>
                            <div className="text-center py-8">
                                <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-4 text-yago-purple" />
                                <p className="text-gray-600">리포트 목록을 불러오는 중...</p>
                            </div>
                        </YagoCard>
                    )}

                    {!loading && reports.length === 0 && (
                        <YagoCard>
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-xl font-semibold text-gray-600 mb-2">아직 생성된 리포트가 없습니다</h3>
                                <p className="text-gray-500 mb-4">관리자 대시보드에서 "주간 리포트 생성" 버튼을 눌러 첫 번째 리포트를 만들어보세요!</p>
                                <YagoButton
                                    text="📊 관리자 대시보드로 이동"
                                    onClick={() => window.location.href = '/admin'}
                                    variant="primary"
                                    icon="📊"
                                />
                            </div>
                        </YagoCard>
                    )}

                    {reports.map((report, index) => (
                        <motion.div
                            key={report.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <YagoCard className="hover:shadow-yago-lg transition-shadow duration-200">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    {/* 리포트 정보 */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-6 h-6 text-yago-purple" />
                                            <h3 className="text-xl font-semibold text-gray-800">
                                                {dayjs(report.date).format("YYYY년 MM월 DD일")} 주간 리포트
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {report.slackSent ? (
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-xs">Slack 전송됨</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <XCircle className="w-4 h-4" />
                                                        <span className="text-xs">Slack 미전송</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-gray-600 leading-relaxed">
                                            {report.summary || "주간 활동 요약이 없습니다."}
                                        </p>

                                        {/* 통계 정보 */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                            <div className="bg-yago-soft rounded-lg p-3 text-center">
                                                <BarChart3 className="w-5 h-5 text-yago-purple mx-auto mb-1" />
                                                <div className="text-sm font-semibold text-gray-800">{report.totalLogs || 0}</div>
                                                <div className="text-xs text-gray-600">총 로그</div>
                                            </div>
                                            <div className="bg-yago-soft rounded-lg p-3 text-center">
                                                <Calendar className="w-5 h-5 text-yago-purple mx-auto mb-1" />
                                                <div className="text-sm font-semibold text-gray-800">{report.geoCount || 0}</div>
                                                <div className="text-xs text-gray-600">지역 샘플</div>
                                            </div>
                                            <div className="bg-yago-soft rounded-lg p-3 text-center">
                                                <MessageSquare className="w-5 h-5 text-yago-purple mx-auto mb-1" />
                                                <div className="text-sm font-semibold text-gray-800">{report.deviceTypes || 0}</div>
                                                <div className="text-xs text-gray-600">디바이스 유형</div>
                                            </div>
                                            <div className="bg-yago-soft rounded-lg p-3 text-center">
                                                <BarChart3 className="w-5 h-5 text-yago-purple mx-auto mb-1" />
                                                <div className="text-sm font-semibold text-gray-800">{report.actionTypes || 0}</div>
                                                <div className="text-xs text-gray-600">액션 유형</div>
                                            </div>
                                        </div>

                                        {/* 인사이트 미리보기 */}
                                        {report.insights && report.insights.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-2">🔍 주요 인사이트</h4>
                                                <ul className="space-y-1">
                                                    {report.insights.slice(0, 2).map((insight, i) => (
                                                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                            <span className="text-yago-purple">•</span>
                                                            <span>{insight}</span>
                                                        </li>
                                                    ))}
                                                    {report.insights.length > 2 && (
                                                        <li className="text-xs text-gray-500">
                                                            + {report.insights.length - 2}개 더...
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* 액션 버튼 */}
                                    <div className="flex flex-col gap-2 lg:min-w-48">
                                        <YagoButton
                                            text="📄 PDF 다운로드"
                                            onClick={() => downloadReport(report)}
                                            disabled={downloading === report.id}
                                            loading={downloading === report.id}
                                            icon={<Download className="w-4 h-4" />}
                                            variant="primary"
                                            size="lg"
                                        />
                                        <YagoButton
                                            text={speakingId === report.id ? "🎙️ 읽는 중..." : "🎧 요약 듣기"}
                                            onClick={() => speakSummary(report)}
                                            disabled={speakingId === report.id}
                                            loading={speakingId === report.id}
                                            icon={<Volume2 className="w-4 h-4" />}
                                            variant="accent"
                                            size="lg"
                                        />
                                        <div className="text-xs text-gray-500 text-center">
                                            생성일: {dayjs(report.createdAt?.seconds ? report.createdAt.seconds * 1000 : report.createdAt).format("MM/DD HH:mm")}
                                        </div>
                                    </div>
                                </div>
                            </YagoCard>
                        </motion.div>
                    ))}
                </div>

                {/* 추가 정보 */}
                <YagoCard title="ℹ️ 사용법 안내" icon="📖">
                    <div className="space-y-3 text-sm text-gray-600">
                        <p><strong>📅 자동 생성:</strong> 매주 월요일 오전 9시에 자동으로 새로운 주간 리포트가 생성됩니다</p>
                        <p><strong>📄 PDF 다운로드:</strong> 각 리포트의 "PDF 다운로드" 버튼을 클릭하여 리포트를 다운로드할 수 있습니다</p>
                        <p><strong>🎧 요약 듣기:</strong> GPT가 리포트를 분석하여 음성으로 요약을 읽어줍니다</p>
                        <p><strong>📱 Slack 전송:</strong> 리포트 생성 시 Slack 채널로 자동 전송됩니다</p>
                        <p><strong>🔄 새로고침:</strong> 최신 리포트 목록을 확인하려면 "새로고침" 버튼을 클릭하세요</p>
                        <p className="text-xs text-gray-500 mt-4">
                            * 최근 8개의 주간 리포트가 표시됩니다. 더 오래된 리포트는 관리자에게 문의하세요.
                        </p>
                    </div>
                </YagoCard>
            </div>
        </YagoLayout>
    );
}
