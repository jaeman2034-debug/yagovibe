import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

interface ModelInsight {
    id: string;
    createdAt: any;
    improvementNotes: string;
    improvementRules: string[];
    stats: {
        total: number;
        positives: number;
        negatives: number;
        approvalRate: number;
        improvementRate: number;
        embeddingDrift: number;
    };
}

interface FeedbackStats {
    total: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    feedbackDensity: number;
}

/**
 * Step 61: Feedback Learning Center
 * 운영자 피드백 기반 학습 루프 대시보드
 * Step 43: Role System 연동 (Owner/Admin만 접근)
 */
export default function FeedbackCenter() {
    const [insights, setInsights] = useState<ModelInsight[]>([]);
    const [stats, setStats] = useState<FeedbackStats | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Step 43: Role System 연동
    const getCurrentUser = () => {
        const auth = getAuth();
        const user = auth.currentUser;
        return user;
    };

    const user = getCurrentUser();
    // 임시로 첫 번째 insight의 teamId를 사용 (실제로는 사용자 팀 조회 필요)
    const { role, loading: roleLoading, isOwner } = useRoleAccess(user?.uid || "");

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            // 모델 인사이트 조회
            const insightsResponse = await fetch(`${functionsOrigin}/getModelInsights?limit=20`);
            if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                setInsights(insightsData.items || []);
            }

            // 피드백 통계 조회
            const statsResponse = await fetch(`${functionsOrigin}/getFeedbackStats`);
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    // 권한 확인 (Owner 또는 Admin)
    const hasPermission = () => {
        if (roleLoading) return false;
        const user = getCurrentUser();
        if (!user) return false;
        
        // Admin 체크
        if (user.email?.includes("admin") || user.email?.includes("@yagovibe.com")) {
            return true;
        }
        
        // Owner 체크
        return isOwner || role === "owner";
    };

    if (roleLoading) {
        return (
            <div className="p-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!hasPermission()) {
        return (
            <div className="p-4">
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="text-center text-red-600 dark:text-red-400">
                            <p className="font-semibold mb-2">접근 권한이 없습니다</p>
                            <p className="text-sm">
                                Feedback Learning Center는 Owner 또는 Admin만 접근 가능합니다.
                            </p>
                            <p className="text-xs mt-2 text-muted-foreground">
                                현재 역할: {role || "확인 중..."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🧩 Feedback Learning Center</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 61: Continuous Feedback Learning Loop
                    </p>
                </div>
                <Button onClick={loadData} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* 주요 지표 카드 */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground mb-1">Approval Rate</div>
                            <div className="text-2xl font-bold">
                                {(stats.approvalRate * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                승인: {stats.approved} / 반려: {stats.rejected}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground mb-1">Feedback Density</div>
                            <div className="text-2xl font-bold">{stats.feedbackDensity}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                최근 7일 피드백 건수
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground mb-1">Total Feedback</div>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                전체 피드백 데이터
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground mb-1">Improvement Rate</div>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                {insights.length > 0 && insights[0].stats?.improvementRate ? (
                                    <>
                                        {insights[0].stats.improvementRate > 0 ? (
                                            <TrendingUp className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <TrendingDown className="h-5 w-5 text-red-600" />
                                        )}
                                        {(insights[0].stats.improvementRate * 100).toFixed(1)}%
                                    </>
                                ) : (
                                    "-"
                                )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                모델 개선률
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 모델 인사이트 테이블 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">모델 인사이트 기록</h2>
                        <Badge variant="outline">
                            총 {insights.length}개
                        </Badge>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : insights.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            모델 인사이트가 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="p-2">날짜</th>
                                        <th className="p-2">승인율</th>
                                        <th className="p-2">개선률</th>
                                        <th className="p-2">샘플 수</th>
                                        <th className="p-2">학습결과 요약</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {insights.map((insight, idx) => (
                                        <tr key={insight.id || idx} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <td className="p-2">
                                                {insight.createdAt
                                                    ? new Date(insight.createdAt).toLocaleDateString("ko-KR")
                                                    : "-"}
                                            </td>
                                            <td className="p-2">
                                                <Badge
                                                    variant={
                                                        (insight.stats?.approvalRate || 0) > 0.8
                                                            ? "default"
                                                            : (insight.stats?.approvalRate || 0) > 0.5
                                                            ? "secondary"
                                                            : "destructive"
                                                    }
                                                >
                                                    {((insight.stats?.approvalRate || 0) * 100).toFixed(1)}%
                                                </Badge>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex items-center gap-1">
                                                    {insight.stats?.improvementRate && insight.stats.improvementRate > 0 ? (
                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                    ) : insight.stats?.improvementRate && insight.stats.improvementRate < 0 ? (
                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                    ) : null}
                                                    <span>
                                                        {insight.stats?.improvementRate
                                                            ? (insight.stats.improvementRate * 100).toFixed(1) + "%"
                                                            : "-"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                {insight.stats?.total || 0}
                                            </td>
                                            <td className="p-2 text-xs text-muted-foreground max-w-md">
                                                <div className="truncate">
                                                    {insight.improvementNotes?.slice(0, 120) || "요약 없음"}
                                                    {insight.improvementNotes && insight.improvementNotes.length > 120 && "..."}
                                                </div>
                                                {insight.improvementRules && insight.improvementRules.length > 0 && (
                                                    <div className="mt-1 text-xs">
                                                        <Badge variant="outline" className="text-xs">
                                                            규칙 {insight.improvementRules.length}개
                                                        </Badge>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Self-Improving Loop 설명 */}
            <Card>
                <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">🔄 Self-Improving Loop</h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        <li>feedbackCollector가 승인/반려 데이터를 기록</li>
                        <li>feedbackTrainer가 매주 패턴을 분석 → 개선 규칙 생성</li>
                        <li>insightGenerator-v2가 다음 주 리포트 생성 시 규칙 반영</li>
                        <li>승인율 상승 → 모델 자동 튜닝 루프 강화</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    );
}

