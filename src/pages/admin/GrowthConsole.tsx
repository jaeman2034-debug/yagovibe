import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

/**
 * Step 70: Growth Console
 * Post-Launch SRE & Growth Experiments
 */
export default function GrowthConsole() {
    const [exps, setExps] = useState<any[]>([]);
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
            loadExperiments();
        }
    }, [user]);

    const loadExperiments = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${functionsOrigin}/listExperiments`);
            if (response.ok) {
                const data = await response.json();
                setExps(data.items || []);
            }
        } catch (error) {
            console.error("실험 목록 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const compareResults = (a: number, b: number): "better" | "worse" | "equal" => {
        const diff = ((b - a) / a) * 100;
        if (Math.abs(diff) < 1) return "equal";
        return diff > 0 ? "better" : "worse";
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
                    <h1 className="text-3xl font-bold">🚀 Growth Experiments</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 70: Post-Launch SRE & Growth Experiments
                    </p>
                </div>
                <button
                    onClick={loadExperiments}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">로딩 중...</div>
            ) : exps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">실험 데이터가 없습니다.</div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {exps.map((e: any) => {
                        const results = e.results || {};
                        const groupA = results.A || {};
                        const groupB = results.B || {};

                        // 승자 결정 (간단한 로직: approvalRate가 높은 쪽)
                        const winner = groupA.approvalRate > groupB.approvalRate ? "A" : 
                                      groupB.approvalRate > groupA.approvalRate ? "B" : "Tie";

                        return (
                            <Card key={e.id}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="font-semibold text-lg">{e.id}</div>
                                        <Badge variant={e.status === "active" ? "default" : "secondary"}>
                                            {e.status || "draft"}
                                        </Badge>
                                    </div>

                                    {results.A && results.B ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <div className="font-semibold mb-2">그룹 A</div>
                                                    <div className="space-y-1 text-xs">
                                                        <div>p95: {Math.round(groupA.p95 || 0)}ms</div>
                                                        <div>오류율: {(groupA.errorRate * 100 || 0).toFixed(2)}%</div>
                                                        <div>승인율: {(groupA.approvalRate * 100 || 0).toFixed(2)}%</div>
                                                        <div>오프라인: {(groupA.offlineSuccess * 100 || 0).toFixed(2)}%</div>
                                                        <div className="text-muted-foreground">
                                                            사용자: {groupA.count || 0}명
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="font-semibold mb-2 flex items-center gap-2">
                                                        그룹 B
                                                        {winner === "B" && (
                                                            <TrendingUp className="w-4 h-4 text-green-500" />
                                                        )}
                                                        {winner === "A" && (
                                                            <TrendingDown className="w-4 h-4 text-red-500" />
                                                        )}
                                                        {winner === "Tie" && (
                                                            <Minus className="w-4 h-4 text-gray-500" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1 text-xs">
                                                        <div>p95: {Math.round(groupB.p95 || 0)}ms</div>
                                                        <div>오류율: {(groupB.errorRate * 100 || 0).toFixed(2)}%</div>
                                                        <div>승인율: {(groupB.approvalRate * 100 || 0).toFixed(2)}%</div>
                                                        <div>오프라인: {(groupB.offlineSuccess * 100 || 0).toFixed(2)}%</div>
                                                        <div className="text-muted-foreground">
                                                            사용자: {groupB.count || 0}명
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t">
                                                <div className="text-xs text-muted-foreground">
                                                    승자: 그룹 {winner} 
                                                    {winner !== "Tie" && (
                                                        <span className="ml-2">
                                                            (승인율 {(Math.abs(groupA.approvalRate - groupB.approvalRate) * 100).toFixed(2)}%p 차이)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground">
                                            결과 데이터가 없습니다. A/B 분석이 완료되면 결과가 표시됩니다.
                                        </div>
                                    )}

                                    {e.updatedAt && (
                                        <div className="text-xs text-muted-foreground">
                                            업데이트: {new Date(e.updatedAt).toLocaleString()}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

