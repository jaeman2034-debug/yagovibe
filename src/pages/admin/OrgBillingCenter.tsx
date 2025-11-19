import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, DollarSign, Users } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

interface Org {
    id: string;
    name: string;
    planId: "free" | "pro" | "enterprise";
    limits?: {
        rpm?: number;
        rpd?: number;
        storageGb?: number;
        seats?: number;
        priority?: number;
    };
    features?: {
        [key: string]: boolean;
    };
    billing?: {
        customerId?: string;
        defaultPayment?: string;
    };
}

/**
 * Step 65: Org & Billing Center
 * 다중 조직/테넌트 요금제·쿼터·SLA 관리
 * Step 43: Role System 연동 (Owner/SecOps만 접근)
 */
export default function OrgBillingCenter() {
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [selected, setSelected] = useState<Org | null>(null);
    const [loading, setLoading] = useState(false);
    const [usageStats, setUsageStats] = useState<any>(null);

    // Step 43: Role System 연동
    const getCurrentUser = () => {
        const auth = getAuth();
        return auth.currentUser;
    };

    const user = getCurrentUser();
    const { role, loading: roleLoading, isOwner } = useRoleAccess(user?.uid || "");

    useEffect(() => {
        if (user) {
            loadOrgs();
        }
    }, [user]);

    const loadOrgs = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/listOrgs`);
            if (response.ok) {
                const data = await response.json();
                setOrgs(data.items || []);
            }
        } catch (error) {
            console.error("조직 목록 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const setPlan = async (orgId: string, planId: "free" | "pro" | "enterprise") => {
        if (!confirm(`${planId} 요금제로 변경하시겠습니까?`)) {
            return;
        }

        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/setOrgPlan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId, planId }),
            });

            if (response.ok) {
                alert(`✅ 요금제 변경 완료: ${planId}`);
                loadOrgs(); // 새로고침
            } else {
                const error = await response.json();
                alert(`❌ 요금제 변경 실패: ${error.error}`);
            }
        } catch (error: any) {
            alert(`오류: ${error.message}`);
        }
    };

    const loadOrgContext = async (orgId: string) => {
        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const contextResponse = await fetch(`${functionsOrigin}/getOrgContext?orgId=${orgId}`);
            if (contextResponse.ok) {
                const context = await contextResponse.json();
                setSelected(context);
            }

            const statsResponse = await fetch(`${functionsOrigin}/getUsageStats?orgId=${orgId}&days=7`);
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                setUsageStats(stats);
            }
        } catch (error) {
            console.error("조직 정보 로드 실패:", error);
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
                                Org & Billing Center는 Owner 또는 SecOps만 접근 가능합니다.
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

    const planColors: { [key: string]: string } = {
        free: "bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300",
        pro: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300",
        enterprise: "bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300",
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🏢 Org & Billing Center</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 65: Multi-Tenant Org Rollout & Billing Guard
                    </p>
                </div>
                <Button onClick={loadOrgs} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* 조직 목록 테이블 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">조직 목록</h2>
                        <Badge variant="outline">
                            총 {orgs.length}개
                        </Badge>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : orgs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            조직이 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="p-2">Org</th>
                                        <th className="p-2">Plan</th>
                                        <th className="p-2">RPM</th>
                                        <th className="p-2">RPD</th>
                                        <th className="p-2">Priority</th>
                                        <th className="p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgs.map((o) => (
                                        <tr
                                            key={o.id}
                                            className="border-t hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                                            onClick={() => loadOrgContext(o.id)}
                                        >
                                            <td className="p-2 font-medium">{o.name || o.id}</td>
                                            <td className="p-2">
                                                <Badge className={planColors[o.planId] || ""}>
                                                    {o.planId}
                                                </Badge>
                                            </td>
                                            <td className="p-2">{o.limits?.rpm || "-"}</td>
                                            <td className="p-2">{o.limits?.rpd || "-"}</td>
                                            <td className="p-2">
                                                <Badge variant="outline">
                                                    {o.limits?.priority || 3}
                                                </Badge>
                                            </td>
                                            <td className="p-2">
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setPlan(o.id, "pro")}
                                                        disabled={o.planId === "pro"}
                                                    >
                                                        Pro
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setPlan(o.id, "enterprise")}
                                                        disabled={o.planId === "enterprise"}
                                                    >
                                                        Enterprise
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 선택된 조직 상세 정보 */}
            {selected && (
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">조직 상세 정보</h2>
                            <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
                                닫기
                            </Button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm font-medium mb-2">기본 정보</div>
                                <div className="text-sm space-y-1">
                                    <div>ID: {selected.org?.id || selected.org?.name || "-"}</div>
                                    <div>Plan: {selected.org?.planId || "-"}</div>
                                    <div>Name: {selected.org?.name || "-"}</div>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm font-medium mb-2">제한</div>
                                <div className="text-sm space-y-1">
                                    <div>RPM: {selected.limits?.rpm || "-"}</div>
                                    <div>RPD: {selected.limits?.rpd || "-"}</div>
                                    <div>Storage: {selected.limits?.storageGb || "-"} GB</div>
                                    <div>Seats: {selected.limits?.seats || "-"}</div>
                                    <div>Priority: {selected.limits?.priority || "-"}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-medium mb-2">기능</div>
                            <div className="flex flex-wrap gap-2">
                                {selected.features &&
                                    Object.entries(selected.features).map(([key, value]) => (
                                        <Badge
                                            key={key}
                                            variant={value ? "default" : "secondary"}
                                        >
                                            {key}: {value ? "✅" : "❌"}
                                        </Badge>
                                    ))}
                            </div>
                        </div>

                        {/* 사용량 통계 */}
                        {usageStats && usageStats.stats && usageStats.stats.length > 0 && (
                            <div>
                                <div className="text-sm font-medium mb-2">최근 7일 사용량</div>
                                <div className="space-y-2">
                                    {usageStats.stats.map((stat: any, idx: number) => (
                                        <div key={idx} className="text-xs bg-muted p-2 rounded">
                                            <div className="font-medium">{stat.day}</div>
                                            <div className="text-muted-foreground">
                                                RPD: {stat.rpd || 0} · 토큰: {stat.tokens?.toLocaleString() || 0}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-muted rounded p-3 text-xs">
                            <pre>{JSON.stringify(selected, null, 2)}</pre>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

