import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import ReportStatsCard from "@/components/ReportStatsCard";
import ReportChart from "@/components/ReportChart";
import YagoLayout from "@/layouts/YagoLayout";
import { YagoButton } from "@/components/ui/YagoComponents";
import { generateAndShareReport } from "@/api/generateReport";
import VoiceSummaryPlayer from "@/components/VoiceSummaryPlayer";

/**
 * 📊 AI 리포트 대시보드
 * 생성된 리포트 히스토리, 통계, 차트 시각화
 */
export default function ReportDashboard() {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            // auto_reports 컬렉션에서 로그 가져오기
            const q = query(collection(db, "auto_reports"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReports(data);
        } catch (error) {
            console.error("리포트 로드 오류:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            await generateAndShareReport();
            alert("✅ 리포트 생성 완료! Firestore에 로그가 기록되었습니다.");
            await loadReports(); // 새로고침
        } catch (error) {
            alert("❌ 리포트 생성 실패: " + (error instanceof Error ? error.message : "알 수 없는 오류"));
        } finally {
            setGenerating(false);
        }
    };

    // 통계 계산
    const total = reports.length;
    const successCount = reports.filter(r => r.success === true).length;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : 0;

    // 차트 데이터 준비
    const chartData = reports.map(r => ({
        date: new Date(r.createdAt?.seconds * 1000).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
        count: 1
    }));

    return (
        <YagoLayout title="📊 AI 리포트 대시보드">
            <div className="space-y-6">
                {/* 액션 버튼 */}
                <div className="flex gap-4">
                    <YagoButton
                        text={generating ? "리포트 생성 중..." : "🔄 리포트 생성"}
                        onClick={handleGenerate}
                        variant="primary"
                        disabled={generating}
                    />
                    <YagoButton
                        text="🔄 새로고침"
                        onClick={loadReports}
                        variant="outline"
                    />
                </div>

                {/* 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ReportStatsCard title="총 리포트 수" value={total} color="blue" />
                    <ReportStatsCard title="성공한 리포트" value={successCount} color="green" />
                    <ReportStatsCard title="성공률 (%)" value={`${successRate}%`} color="yellow" />
                </div>

                {/* 차트 */}
                <div className="bg-white p-6 rounded-2xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">📈 주간 리포트 생성 추이</h2>
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yago-purple"></div>
                        </div>
                    ) : (
                        <ReportChart data={chartData} />
                    )}
                </div>

                {/* 리포트 로그 테이블 */}
                <div className="bg-white p-6 rounded-2xl shadow-md">
                    <h2 className="text-xl font-semibold mb-4">🧾 리포트 로그</h2>
                    {loading ? (
                        <p className="text-gray-500">로딩 중...</p>
                    ) : reports.length === 0 ? (
                        <p className="text-gray-500">아직 생성된 리포트가 없습니다.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left border-b">
                                        <th className="p-3 font-semibold text-yago-purple">날짜</th>
                                        <th className="p-3 font-semibold text-yago-purple">상태</th>
                                        <th className="p-3 font-semibold text-yago-purple">URL</th>
                                        <th className="p-3 font-semibold text-yago-purple">🎧 음성</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((r) => (
                                        <tr key={r.id} className="border-b hover:bg-yago-soft/50">
                                            <td className="p-3 text-gray-700">
                                                {r.createdAt?.seconds
                                                    ? new Date(r.createdAt.seconds * 1000).toLocaleString("ko-KR")
                                                    : "-"}
                                            </td>
                                            <td className="p-3">
                                                {r.success ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                        ✅ 성공
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                        ⚠️ 실패
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {r.url && r.url !== "N/A" ? (
                                                    <a
                                                        href={r.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 underline"
                                                    >
                                                        다운로드
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                {r.audioUrl ? (
                                                    <VoiceSummaryPlayer url={r.audioUrl} />
                                                ) : (
                                                    <span className="text-gray-400">⏳ 생성 중...</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </YagoLayout>
    );
}

