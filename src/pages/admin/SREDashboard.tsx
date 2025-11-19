import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

/**
 * Step 70: SRE Dashboard
 * Post-Launch SRE & Growth Experiments
 */
export default function SREDashboard() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const getCurrentUser = () => {
        const auth = getAuth();
        return auth.currentUser;
    };

    const user = getCurrentUser();
    const { role, loading: roleLoading, isOwner } = useRoleAccess(user?.uid || "");

    const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

    useEffect(() => {
        if (user) {
            loadSLOs();
        }
    }, [user]);

    const loadSLOs = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${functionsOrigin}/getSLOs`);
            if (response.ok) {
                const data = await response.json();
                setRows(data.items || []);
            }
        } catch (error) {
            console.error("SLO 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatus = (value: number, target: number, metric: string): "ok" | "warning" | "error" => {
        // 메트릭별 판단 로직
        if (metric.includes("Rate") || metric.includes("Error")) {
            // 오류율/에러율은 낮을수록 좋음
            return value <= target ? "ok" : value <= target * 1.2 ? "warning" : "error";
        } else if (metric.includes("P95") || metric.includes("Latency")) {
            // 지연시간은 낮을수록 좋음
            return value <= target ? "ok" : value <= target * 1.1 ? "warning" : "error";
        } else {
            // 가용성/성공률은 높을수록 좋음
            return value >= target ? "ok" : value >= target * 0.95 ? "warning" : "error";
        }
    };

    const formatValue = (value: number, metric: string): string => {
        if (metric.includes("Rate") || metric.includes("Success") || metric.includes("Availability")) {
            return `${(value * 100).toFixed(2)}%`;
        } else if (metric.includes("P95") || metric.includes("Latency")) {
            return `${Math.round(value)}ms`;
        }
        return value.toFixed(3);
    };

    const formatTarget = (target: number, metric: string): string => {
        if (metric.includes("Rate") || metric.includes("Success") || metric.includes("Availability")) {
            return `${(target * 100).toFixed(2)}%`;
        } else if (metric.includes("P95") || metric.includes("Latency")) {
            return `${Math.round(target)}ms`;
        }
        return target.toFixed(3);
    };

    const getProgressValue = (value: number, target: number, metric: string): number => {
        if (metric.includes("Rate") || metric.includes("Error")) {
            // 오류율은 반대로 (100% - 현재값/목표값)
            return Math.min(100, Math.max(0, (1 - value / target) * 100));
        } else if (metric.includes("P95") || metric.includes("Latency")) {
            // 지연시간도 반대로
            return Math.min(100, Math.max(0, (1 - value / target) * 100));
        } else {
            // 성공률/가용성은 정상적으로
            return Math.min(100, Math.max(0, (value / target) * 100));
        }
    };

    if (roleLoading) {
        return <div className="p-4 text-center">권한 확인 중...</div>;
    }

    const hasPermission = isOwner || (user?.email?.includes("admin") || user?.email?.endsWith("@yagovibe.com"));

    if (!hasPermission) {
        return (
            <div className="p-4 text-center text-red-500">
                ⚠️ Owner 또는 Admin만 접근 가능합니다.
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🧩 SRE & SLO Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 70: Post-Launch SRE & Growth Experiments
                    </p>
                </div>
                <button
                    onClick={loadSLOs}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : rows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    SLO 데이터가 없습니다. <code>/initSLOs</code>를 호출하여 기본 SLO를 초기화하세요.
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {rows.map((r: any) => {
                        const status = getStatus(r.value, r.target, r.metric);
                        const progressValue = getProgressValue(r.value, r.target, r.metric);

                        return (
                            <Card key={r.metric}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="font-semibold text-lg">{r.metric}</div>
                                        <Badge
                                            variant={
                                                status === "ok"
                                                    ? "default"
                                                    : status === "warning"
                                                      ? "secondary"
                                                      : "destructive"
                                            }
                                            className="flex items-center gap-1"
                                        >
                                            {status === "ok" ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <AlertTriangle className="w-3 h-3" />
                                            )}
                                            {status === "ok" ? "정상" : status === "warning" ? "경고" : "위반"}
                                        </Badge>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">현재:</span>
                                        <span className="font-semibold">{formatValue(r.value, r.metric)}</span>
                                    </div>

                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">목표:</span>
                                        <span>{formatTarget(r.target, r.metric)}</span>
                                    </div>

                                    <Progress value={progressValue} className="h-2" />

                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <div>기간: {r.window}</div>
                                        <div>소스: {r.source}</div>
                                        {r.lastBreaches && r.lastBreaches.length > 0 && (
                                            <div className="text-red-500">
                                                최근 위반: {r.lastBreaches.length}회
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

