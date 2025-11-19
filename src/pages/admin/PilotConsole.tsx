import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

/**
 * Step 68: Real-World Pilot Console
 * 파일럿 텔레메트리 대시보드
 * Step 43: Role System 연동 (Owner/SecOps만 접근)
 */
export default function PilotConsole() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    // Step 43: Role System 연동
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
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            const response = await fetch(`${functionsOrigin}/getTelemetryDaily?limit=14`);
            if (response.ok) {
                const data = await response.json();
                setRows(data.items || []);
                
                // 요약 통계 계산
                if (data.items && data.items.length > 0) {
                    const avg = {
                        p95: data.items.reduce((sum: number, r: any) => sum + (r.p95 || 0), 0) / data.items.length,
                        errorRate: data.items.reduce((sum: number, r: any) => sum + (r.errorRate || 0), 0) / data.items.length,
                        approvalRate: data.items.reduce((sum: number, r: any) => sum + (r.approvalRate || 0), 0) / data.items.length,
                        alertPrecision: data.items.reduce((sum: number, r: any) => sum + (r.alertPrecision || 0), 0) / data.items.length,
                        offlineSuccess: data.items.reduce((sum: number, r: any) => sum + (r.offlineSuccess || 0), 0) / data.items.length,
                    };
                    setSummary(avg);
                }
            }
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    function pct(x: number): string {
        return (x * 100).toFixed(1) + "%";
    }

    // 권한 확인
    const hasPermission = () => {
        if (roleLoading) return false;
        const user = getCurrentUser();
        if (!user) return false;

        if (user.email?.includes("admin") || user.email?.includes("@yagovibe.com")) {
            return true;
        }

        return isOwner || role === "owner";
    };

    if (roleLoading) {
        return <div className="p-4 text-center">권한 확인 중...</div>;
    }

    if (!hasPermission()) {
        return (
            <div className="p-4 text-center text-red-500">
                ⚠️ Owner 또는 SecOps만 접근 가능합니다.
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🧪 Real-World Pilot Console</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 68: Real-World Pilot & Telemetry Review
                    </p>
                </div>
                <button
                    onClick={loadData}
                    disabled={loading}
                    className="p-2 rounded hover:bg-muted"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* 요약 통계 */}
            {summary && (
                <Card>
                    <CardContent className="p-4">
                        <h2 className="text-lg font-semibold mb-4">평균 KPI (최근 14일)</h2>
                        <div className="grid md:grid-cols-5 gap-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">P95 Latency</div>
                                <div className="text-2xl font-bold">
                                    {summary.p95.toFixed(0)}ms
                                </div>
                                <Badge
                                    variant={summary.p95 > 900 ? "destructive" : "secondary"}
                                    className="mt-1"
                                >
                                    {summary.p95 > 900 ? "⚠️ 초과" : "✅ 정상"}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Error Rate</div>
                                <div className="text-2xl font-bold">
                                    {pct(summary.errorRate)}
                                </div>
                                <Badge
                                    variant={summary.errorRate > 0.01 ? "destructive" : "secondary"}
                                    className="mt-1"
                                >
                                    {summary.errorRate > 0.01 ? "⚠️ 초과" : "✅ 정상"}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Approval Rate</div>
                                <div className="text-2xl font-bold">
                                    {pct(summary.approvalRate)}
                                </div>
                                <Badge
                                    variant={summary.approvalRate < 0.7 ? "destructive" : "secondary"}
                                    className="mt-1"
                                >
                                    {summary.approvalRate < 0.7 ? "⚠️ 미달" : "✅ 정상"}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Alert Precision</div>
                                <div className="text-2xl font-bold">
                                    {pct(summary.alertPrecision)}
                                </div>
                                <Badge
                                    variant={summary.alertPrecision < 0.8 ? "destructive" : "secondary"}
                                    className="mt-1"
                                >
                                    {summary.alertPrecision < 0.8 ? "⚠️ 미달" : "✅ 정상"}
                                </Badge>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Offline Success</div>
                                <div className="text-2xl font-bold">
                                    {pct(summary.offlineSuccess)}
                                </div>
                                <Badge
                                    variant={summary.offlineSuccess < 0.99 ? "destructive" : "secondary"}
                                    className="mt-1"
                                >
                                    {summary.offlineSuccess < 0.99 ? "⚠️ 미달" : "✅ 정상"}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 팀별 상세 데이터 */}
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-8">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        데이터가 없습니다.
                    </div>
                ) : (
                    rows.map((r: any) => (
                        <Card key={r.id} className="shadow-sm">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="font-semibold">
                                        {r.teamId || "unknown"} · {r.day}
                                    </div>
                                    <Badge
                                        variant={
                                            r.errorRate > 0.01 || r.p95 > 900
                                                ? "destructive"
                                                : "secondary"
                                        }
                                    >
                                        {r.p95 || 0}ms
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                    <div>
                                        <TrendingUp className="w-3 h-3 inline mr-1" />
                                        Errors: {pct(r.errorRate || 0)}
                                    </div>
                                    <div>
                                        <TrendingUp className="w-3 h-3 inline mr-1" />
                                        Approval: {pct(r.approvalRate || 0)}
                                    </div>
                                    <div>
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                        Alert Precision: {pct(r.alertPrecision || 0)}
                                    </div>
                                    <div>
                                        <TrendingUp className="w-3 h-3 inline mr-1" />
                                        Offline OK: {pct(r.offlineSuccess || 0)}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    총 이벤트: {r.count || 0}개
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

