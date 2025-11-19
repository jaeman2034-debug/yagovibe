import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import RootCauseCard from "@/components/RootCauseCard";
import SimulationResultCard from "@/components/SimulationResultCard";

interface TeamInsightsDashboardProps {
    teamId: string;
}

interface TeamMetrics {
    lastScore?: number;
    lastCoverage?: number;
    lastUpdatedAt?: any;
    rollup24h?: {
        avgScore: number;
        avgCoverage: number;
        gaps: number;
        overlaps: number;
        count: number;
    };
}

interface Alert {
    id: string;
    createdAt: any;
    type: string;
    messages: string[];
    snapshot?: any;
    window?: {
        start: string;
        end: string;
        count: number;
        mean?: number;
        stdev?: number;
    };
}

interface TrendDataPoint {
    date: string;
    score: number;
    coverage: number;
}

/**
 * Step 44: 팀별 통합 대시보드
 * 팀 단위 품질 지표 집계 및 실시간 알림 표시
 */
export default function TeamInsightsDashboard({ teamId }: TeamInsightsDashboardProps) {
    const [teamData, setTeamData] = useState<any>(null);
    const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [anomalyAlerts, setAnomalyAlerts] = useState<Alert[]>([]);
    const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [latestRootCause, setLatestRootCause] = useState<any>(null);
    const [latestSimulation, setLatestSimulation] = useState<any>(null);

    // Step 43: 역할 기반 권한 체크
    const { role, loading: roleLoading, canView } = useRoleAccess(teamId);

    // 팀 데이터 로드
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "teams", teamId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setTeamData(data);
                setMetrics(data?.metrics || null);
                // Step 47: 최근 Root Cause 정보
                if (data?.latestRootCause) {
                    setLatestRootCause(data.latestRootCause);
                }
                // Step 49: 최근 시뮬레이션 정보
                if (data?.latestSimulation) {
                    setLatestSimulation(data.latestSimulation);
                }
                setLoading(false);
            }
        });
        return () => unsub();
    }, [teamId]);

    // 최근 알림 로드
    useEffect(() => {
        const loadAlerts = async () => {
            try {
                const alertsRef = collection(db, "teams", teamId, "alerts");
                
                // 전체 알림 (최근 10개)
                const qAll = query(alertsRef, orderBy("createdAt", "desc"), limit(10));
                const snapAll = await getDocs(qAll);
                const alertsData: Alert[] = snapAll.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Alert[];
                setAlerts(alertsData);

                // Step 46: 이상 탐지 알림만 필터링 (최근 5개)
                const qAnomaly = query(
                    alertsRef,
                    where("type", "==", "anomaly"),
                    orderBy("createdAt", "desc"),
                    limit(5)
                );
                const snapAnomaly = await getDocs(qAnomaly);
                const anomalyData: Alert[] = snapAnomaly.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Alert[];
                setAnomalyAlerts(anomalyData);
            } catch (error) {
                console.error("알림 로드 실패:", error);
            }
        };
        loadAlerts();
    }, [teamId]);

    // 트렌드 데이터 로드 (최근 7일)
    useEffect(() => {
        const loadTrend = async () => {
            try {
                const since7d = new Date();
                since7d.setDate(since7d.getDate() - 7);

                const q = query(
                    collection(db, "teams", teamId, "reports"),
                    // orderBy("createdAt", "desc")
                );
                const reportsSnap = await getDocs(q);

                // 각 리포트의 qualityReports 수집
                const byDay: Record<string, { score: number; coverage: number; n: number }> = {};

                for (const reportDoc of reportsSnap.docs) {
                    const qualityReportsRef = collection(
                        db,
                        "teams",
                        teamId,
                        "reports",
                        reportDoc.id,
                        "qualityReports"
                    );
                    const qualitySnap = await getDocs(qualityReportsRef);

                    qualitySnap.forEach((qDoc) => {
                        const data = qDoc.data();
                        const metrics = data.metrics || {};
                        const createdAt = data.createdAt;

                        let dt: string;
                        if (createdAt?.toDate) {
                            dt = createdAt.toDate().toISOString().slice(0, 10);
                        } else if (createdAt?._seconds) {
                            dt = new Date(createdAt._seconds * 1000).toISOString().slice(0, 10);
                        } else {
                            dt = new Date().toISOString().slice(0, 10);
                        }

                        const date = new Date(dt);
                        if (date >= since7d) {
                            byDay[dt] = byDay[dt] || { score: 0, coverage: 0, n: 0 };
                            byDay[dt].score += Number(metrics.overallScore || 0);
                            byDay[dt].coverage += Number(metrics.coverage || 0);
                            byDay[dt].n++;
                        }
                    });
                }

                const trend: TrendDataPoint[] = Object.keys(byDay)
                    .sort()
                    .map((dt) => ({
                        date: new Date(dt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
                        score: byDay[dt].n > 0 ? byDay[dt].score / byDay[dt].n : 0,
                        coverage: byDay[dt].n > 0 ? byDay[dt].coverage / byDay[dt].n : 0,
                    }));

                setTrendData(trend);
            } catch (error) {
                console.error("트렌드 데이터 로드 실패:", error);
            }
        };
        loadTrend();
    }, [teamId]);

    if (loading || roleLoading) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                로딩 중...
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="p-6 text-center text-red-600">
                이 팀에 대한 접근 권한이 없습니다.
            </div>
        );
    }

    const formatDate = (timestamp: any): string => {
        if (!timestamp) return "-";
        let date: Date;
        if (timestamp?.toDate) {
            date = timestamp.toDate();
        } else if (timestamp?._seconds) {
            date = new Date(timestamp._seconds * 1000);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            return "-";
        }
        return date.toLocaleString("ko-KR");
    };

    return (
        <div className="space-y-4 p-4 md:p-6">
            {/* 팀 헤더 */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {teamData?.name || teamId} 팀 대시보드
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    팀 ID: {teamId} | 역할: {role || "viewer"}
                </p>
            </div>

            {/* KPI 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPI
                    title="최근 점수"
                    value={metrics?.lastScore ? metrics.lastScore.toFixed(2) : "N/A"}
                />
                <KPI
                    title="커버리지"
                    value={metrics?.lastCoverage ? `${(metrics.lastCoverage * 100).toFixed(1)}%` : "N/A"}
                />
                <KPI
                    title="24시간 평균 점수"
                    value={metrics?.rollup24h?.avgScore ? metrics.rollup24h.avgScore.toFixed(2) : "N/A"}
                />
                <KPI
                    title="24시간 리포트 수"
                    value={metrics?.rollup24h?.count?.toString() || "0"}
                />
            </div>

            {/* 트렌드 차트 */}
            {trendData.length > 0 && (
                <Card className="shadow-sm">
                    <CardContent className="p-4 md:p-6">
                        <h2 className="text-lg font-semibold mb-4">7일 트렌드 (Score & Coverage)</h2>
                        <LineChart width={800} height={300} data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" domain={[0, 1]} label={{ value: "Score", angle: -90, position: "insideLeft" }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 1]} label={{ value: "Coverage", angle: 90, position: "insideRight" }} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="score" stroke="#1d4ed8" strokeWidth={2} name="Score" />
                            <Line yAxisId="right" type="monotone" dataKey="coverage" stroke="#10b981" strokeWidth={2} name="Coverage" />
                        </LineChart>
                    </CardContent>
                </Card>
            )}

            {/* 24시간 집계 */}
            {metrics?.rollup24h && (
                <Card className="shadow-sm">
                    <CardContent className="p-4 md:p-6">
                        <h2 className="text-lg font-semibold mb-4">24시간 집계</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-muted-foreground">평균 점수</div>
                                <div className="text-xl font-semibold">{metrics.rollup24h.avgScore.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">평균 커버리지</div>
                                <div className="text-xl font-semibold">{(metrics.rollup24h.avgCoverage * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Gaps</div>
                                <div className="text-xl font-semibold">{metrics.rollup24h.gaps}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Overlaps</div>
                                <div className="text-xl font-semibold">{metrics.rollup24h.overlaps}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 47: 최근 Root Cause 분석 */}
            {latestRootCause && (
                <RootCauseCard rc={latestRootCause} />
            )}

            {/* Step 49: 최근 Digital Twin 시뮬레이션 */}
            {latestSimulation && (
                <SimulationResultCard
                    sim={{ predicted: latestSimulation }}
                    baseline={metrics?.lastScore}
                />
            )}

            {/* Step 46: 최근 이상 탐지 알림 */}
            {anomalyAlerts.length > 0 && (
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4 md:p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <h3 className="font-semibold text-lg text-red-600 dark:text-red-400">
                                최근 이상 탐지 알림
                            </h3>
                            <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                                {anomalyAlerts.length}건
                            </Badge>
                        </div>
                        <ul className="space-y-3">
                            {anomalyAlerts.map((a, i) => (
                                <li key={a.id || i} className="text-sm border-l-2 border-red-400 pl-3 py-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-muted-foreground text-xs">
                                            {formatDate(a.createdAt)}
                                        </span>
                                        {a.window && (
                                            <Badge variant="secondary" className="text-xs">
                                                n={a.window.count}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {(a.messages || []).map((msg: string, idx: number) => (
                                            <div key={idx} className="text-red-700 dark:text-red-300">
                                                • {msg}
                                            </div>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {/* 최근 알림 */}
            <Card className="shadow-sm">
                <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold mb-4 text-lg">최근 알림</h3>
                    {alerts.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            최근 알림이 없습니다.
                        </div>
                    ) : (
                        <ul className="space-y-2 list-disc pl-5">
                            {alerts.map((a, i) => (
                                <li key={a.id || i} className="text-sm">
                                    <span className="text-muted-foreground">
                                        {formatDate(a.createdAt)}:
                                    </span>
                                    {" "}
                                    <span className={a.type === "anomaly" ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                                        {(a.messages || []).join("; ")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            {/* 임계치 설정 표시 */}
            {teamData?.thresholds && (
                <Card className="shadow-sm">
                    <CardContent className="p-4 md:p-6">
                        <h3 className="font-semibold mb-4 text-lg">임계치 설정</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-sm text-muted-foreground">점수 급락 임계치</div>
                                <div className="text-lg font-semibold">{teamData.thresholds.scoreDrop}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">커버리지 최소값</div>
                                <div className="text-lg font-semibold">{(teamData.thresholds.coverageMin * 100).toFixed(0)}%</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Gaps 최대값</div>
                                <div className="text-lg font-semibold">{teamData.thresholds.gapMax}</div>
                            </div>
                            <div>
                                <div className="text-sm text-muted-foreground">Overlaps 최대값</div>
                                <div className="text-lg font-semibold">{teamData.thresholds.overlapMax}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/**
 * KPI 카드 컴포넌트
 */
function KPI({ title, value }: { title: string; value: any }) {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">{title}</div>
                <div className="text-2xl font-semibold mt-1">{String(value)}</div>
            </CardContent>
        </Card>
    );
}

