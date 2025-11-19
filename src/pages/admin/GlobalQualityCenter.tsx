import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// UI 컴포넌트는 네이티브 HTML 요소로 구현
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { RefreshCw, Settings, AlertTriangle, TrendingUp, Brain, Zap } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { isAdminUser } from "@/utils/auditLog";

interface TeamSummary {
    teamId: string;
    teamName?: string;
    lastScore: number;
    coverage: number;
    lastUpdatedAt: any;
    rootCause: string;
    tuningCount: number;
    lastPredicted: number | null;
    gaps: number;
    overlaps: number;
    alertCount: number;
    anomalyCount: number;
    lastTunedAt: any;
    modelVersion?: string;
}

interface GlobalKPI {
    avgScore: number;
    avgCoverage: number;
    totalAlerts: number;
    totalAnomalies: number;
    totalTeams: number;
    teamsWithTuning: number;
    avgPredictedScore: number;
}

/**
 * Step 51: Global Quality Command Center
 * 모든 팀의 품질, 튜닝, 예측, 이상 상태를 통합 대시보드에서 실시간 관제
 */
export default function GlobalQualityCenter() {
    const [stats, setStats] = useState<TeamSummary[]>([]);
    const [globalKPI, setGlobalKPI] = useState<GlobalKPI | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTeam, setSelectedTeam] = useState<string>("all");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [modelVersion, setModelVersion] = useState<string>("all");

    // Step 43: 역할 기반 권한 체크
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        setIsAdmin(isAdminUser());
    }, []);

    // 통계 데이터 로드
    const loadStats = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const params = new URLSearchParams();
            if (selectedTeam !== "all") params.append("teamId", selectedTeam);
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            if (modelVersion !== "all") params.append("modelVersion", modelVersion);

            const url = `${functionsOrigin}/getGlobalStats${params.toString() ? `?${params.toString()}` : ""}`;
            const response = await fetch(url);
            const data = await response.json();

            setStats(data.summary || []);
            setGlobalKPI(data.globalKPI || null);
        } catch (error) {
            console.error("통계 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        // 30초마다 자동 갱신
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [selectedTeam, startDate, endDate, modelVersion]);

    // AI Control Actions
    const triggerAction = async (action: string, teamId?: string) => {
        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/triggerActions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, teamId }),
            });

            const data = await response.json();
            if (data.ok) {
                alert(`✅ ${data.message || "액션 실행 완료"}`);
                loadStats(); // 데이터 갱신
            } else {
                alert(`❌ 오류: ${data.error || "액션 실행 실패"}`);
            }
        } catch (error: any) {
            alert(`❌ 오류: ${error.message}`);
        }
    };

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

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">🌍 Global Quality Command Center</h1>
                <Button onClick={loadStats} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* 전역 필터 */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">팀 필터</label>
                            <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-background"
                            >
                                <option value="all">모든 팀</option>
                                {stats.map((s) => (
                                    <option key={s.teamId} value={s.teamId}>
                                        {s.teamName || s.teamId}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">시작일</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">종료일</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-background"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block">모델 버전</label>
                            <select
                                value={modelVersion}
                                onChange={(e) => setModelVersion(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md bg-background"
                            >
                                <option value="all">모든 버전</option>
                                <option value="actual">ML Model</option>
                                <option value="linear">Linear</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Global KPI Summary */}
            {globalKPI && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">평균 품질 점수</div>
                            <div className="text-2xl font-bold">{(globalKPI.avgScore * 100).toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                커버리지: {(globalKPI.avgCoverage * 100).toFixed(1)}%
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">총 알림</div>
                            <div className="text-2xl font-bold">{globalKPI.totalAlerts}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                이상 탐지: {globalKPI.totalAnomalies}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">활성 팀</div>
                            <div className="text-2xl font-bold">{globalKPI.totalTeams}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                튜닝 적용: {globalKPI.teamsWithTuning}팀
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">평균 예측 점수</div>
                            <div className="text-2xl font-bold">
                                {(globalKPI.avgPredictedScore * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                예측 모델 기준
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Team Grid View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((team, i) => (
                    <Card key={i} className="shadow-md hover:shadow-lg transition">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="font-semibold text-lg">{team.teamName || team.teamId}</div>
                                {team.anomalyCount > 0 && (
                                    <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {team.anomalyCount}
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Score:</span>
                                    <span className="font-medium">{(team.lastScore * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Coverage:</span>
                                    <span className="font-medium">{(team.coverage * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">예측:</span>
                                    <span className="font-medium">
                                        {team.lastPredicted ? (team.lastPredicted * 100).toFixed(1) + "%" : "-"}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                <div className="text-xs text-muted-foreground mb-1">Root Cause:</div>
                                <div className="text-xs">{team.rootCause}</div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>튜닝: {team.tuningCount}회</span>
                                <span>•</span>
                                <span>알림: {team.alertCount}개</span>
                            </div>

                            {/* AI Control Actions */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => triggerAction("retuning", team.teamId)}
                                    >
                                        <Settings className="h-3 w-3 mr-1" />
                                        재튜닝
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => triggerAction("runSimulation", team.teamId)}
                                    >
                                        <Brain className="h-3 w-3 mr-1" />
                                        시뮬레이션
                                    </Button>
                                    {team.alertCount > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => triggerAction("clearAlerts", team.teamId)}
                                        >
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            알림 해결
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quality Trend Chart */}
            {stats.length > 0 && (
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold mb-4">품질 트렌드 (팀별)</h2>
                        <LineChart width={800} height={300} data={stats.map((d) => ({
                            team: d.teamName || d.teamId,
                            score: d.lastScore * 100,
                            coverage: d.coverage * 100,
                            predicted: d.lastPredicted ? d.lastPredicted * 100 : null,
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="team" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="score" stroke="#2563eb" name="Score %" strokeWidth={2} />
                            <Line type="monotone" dataKey="coverage" stroke="#10b981" name="Coverage %" strokeWidth={2} />
                            <Line type="monotone" dataKey="predicted" stroke="#a855f7" name="Predicted %" strokeWidth={2} strokeDasharray="5 5" />
                        </LineChart>
                    </CardContent>
                </Card>
            )}

            {/* AI Control Actions Panel */}
            <Card className="shadow-sm border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h2 className="text-lg font-semibold">AI Control Actions</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => triggerAction("reloadModel")}
                            className="w-full"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            최신 모델 재로드
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                stats.forEach((team) => triggerAction("retuning", team.teamId));
                            }}
                            className="w-full"
                        >
                            <Settings className="h-4 w-4 mr-2" />
                            전체 팀 재튜닝
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                stats.forEach((team) => triggerAction("runSimulation", team.teamId));
                            }}
                            className="w-full"
                        >
                            <Brain className="h-4 w-4 mr-2" />
                            전체 시뮬레이션 실행
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

