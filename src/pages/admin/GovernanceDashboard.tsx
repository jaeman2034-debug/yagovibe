import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { RefreshCw, TrendingUp, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAdminUser } from "@/utils/auditLog";

interface GovernanceItem {
    date: string;
    passRate: number;
    copilotReliability: number;
    regressionCount: number;
    avgLatency: number;
    topFailCases: string[];
    testCount: number;
    testsPassed: number;
    testsFailed: number;
    lastUpdated: any;
}

/**
 * Step 55: AI Self-QA & Governance Dashboard
 * Copilot, 품질 모델, 재튜닝 시스템 전체의 테스트 결과와 품질 메트릭을 시각화
 */
export default function GovernanceDashboard() {
    const [rows, setRows] = useState<GovernanceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        setIsAdmin(isAdminUser());
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/getGovernance?limit=30`);
            const data = await response.json();
            setRows(data.items || []);
        } catch (error) {
            console.error("Governance 데이터 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // 5분마다 자동 갱신
        const interval = setInterval(loadData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (!isAdmin) {
        return (
            <div className="p-4">
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="text-center text-red-600 dark:text-red-400">
                            관리자 권한이 필요합니다.
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // 최신 데이터 추출
    const latest = rows[0] || null;
    const avgPassRate = rows.length > 0
        ? rows.reduce((sum, r) => sum + r.passRate, 0) / rows.length
        : 0;
    const avgReliability = rows.length > 0
        ? rows.reduce((sum, r) => sum + r.copilotReliability, 0) / rows.length
        : 0;
    const totalRegressions = rows.reduce((sum, r) => sum + r.regressionCount, 0);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">🧩 AI Self-QA & Governance Dashboard</h1>
                <Button onClick={loadData} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* KPI 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">Pass Rate</div>
                                <div className="text-2xl font-bold">
                                    {latest ? (latest.passRate * 100).toFixed(1) : "0.0"}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    평균: {(avgPassRate * 100).toFixed(1)}%
                                </div>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">Copilot Reliability</div>
                                <div className="text-2xl font-bold">
                                    {latest ? (latest.copilotReliability * 100).toFixed(1) : "0.0"}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    평균: {(avgReliability * 100).toFixed(1)}%
                                </div>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">Regressions</div>
                                <div className="text-2xl font-bold">{latest?.regressionCount || 0}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    총: {totalRegressions}건
                                </div>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-muted-foreground">Avg Latency</div>
                                <div className="text-2xl font-bold">{latest?.avgLatency?.toFixed(0) || 0}ms</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    평균 응답 시간
                                </div>
                            </div>
                            <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* QA Stats Table */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <h2 className="text-lg font-semibold mb-4">QA 통계 테이블</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-muted-foreground border-b">
                                    <th className="p-2">Date</th>
                                    <th className="p-2">Pass Rate</th>
                                    <th className="p-2">Reliability</th>
                                    <th className="p-2">Regressions</th>
                                    <th className="p-2">Latency(ms)</th>
                                    <th className="p-2">Tests</th>
                                    <th className="p-2">Top Fail Cases</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-muted-foreground">
                                            {loading ? "로딩 중..." : "데이터가 없습니다."}
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r, i) => (
                                        <tr key={i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <td className="p-2">{r.date}</td>
                                            <td className="p-2">
                                                <span className={`font-medium ${
                                                    r.passRate >= 0.95 ? "text-green-600 dark:text-green-400" :
                                                    r.passRate >= 0.9 ? "text-yellow-600 dark:text-yellow-400" :
                                                    "text-red-600 dark:text-red-400"
                                                }`}>
                                                    {(r.passRate * 100).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <span className={`font-medium ${
                                                    r.copilotReliability >= 0.95 ? "text-green-600 dark:text-green-400" :
                                                    r.copilotReliability >= 0.9 ? "text-yellow-600 dark:text-yellow-400" :
                                                    "text-red-600 dark:text-red-400"
                                                }`}>
                                                    {(r.copilotReliability * 100).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <span className={r.regressionCount > 0 ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                                                    {r.regressionCount}
                                                </span>
                                            </td>
                                            <td className="p-2">{r.avgLatency?.toFixed(0) || 0}</td>
                                            <td className="p-2">
                                                <span className="text-muted-foreground">
                                                    {r.testsPassed || 0} / {r.testCount || 0}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {r.topFailCases?.slice(0, 3).map((fc, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded"
                                                        >
                                                            {fc}
                                                        </span>
                                                    ))}
                                                    {(!r.topFailCases || r.topFailCases.length === 0) && (
                                                        <span className="text-xs text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* QA Trend Chart */}
            {rows.length > 0 && (
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold mb-4">QA 트렌드 차트</h2>
                        <LineChart width={800} height={300} data={rows.map((r) => ({
                            date: r.date,
                            passRate: r.passRate * 100,
                            reliability: r.copilotReliability * 100,
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[80, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="passRate"
                                stroke="#2563eb"
                                name="Pass Rate(%)"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="reliability"
                                stroke="#10b981"
                                name="Copilot Reliability(%)"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </CardContent>
                </Card>
            )}

            {/* 최근 실패 케이스 */}
            {latest && latest.topFailCases && latest.topFailCases.length > 0 && (
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <h2 className="text-lg font-semibold">최근 실패 케이스 ({latest.date})</h2>
                        </div>
                        <div className="space-y-2">
                            {latest.topFailCases.map((fc, idx) => (
                                <div key={idx} className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                    {fc}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

