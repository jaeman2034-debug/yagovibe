import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { collection, onSnapshot, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAuth } from "@/context/AuthProvider";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { useRoleGate } from "@/hooks/useRoleGate";
import { db, functions } from "@/lib/firebase";
import type { OrgListRow, SubscriptionDoc } from "@/types/billing";
import { getSubscriptionRowBadge } from "@/utils/billingBadge";
import { buildSubscriptionsByOrgId, parseSubscriptionQuerySnapshot } from "@/utils/subscriptionMap";
import { resolveOrgBilling } from "@/utils/resolveOrgBilling";
import { calculateMRR } from "@/utils/mrrFromSubscriptions";
import { calculateOrgListKpi } from "@/utils/orgListBillingKpi";

type Org = OrgListRow;

/**
 * Step 65: Org & Billing Center
 * 다중 조직/테넌트 요금제·쿼터·SLA 관리
 * Step 43: Role System 연동 (Owner/SecOps만 접근)
 */
export default function OrgBillingCenter() {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const { user: authUser, loading: authLoading } = useAuth();
    /** `User` 참조는 토큰 갱신마다 바뀔 수 있으므로 effect deps에는 uid만 쓴다 (loadOrgs 무한 호출 방지) */
    const authUid = authUser?.uid ?? null;
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [subscriptions, setSubscriptions] = useState<SubscriptionDoc[]>([]);
    const [selected, setSelected] = useState<Org | null>(null);
    const [loading, setLoading] = useState(false);
    const [usageStats, setUsageStats] = useState<any>(null);
    const [newOrgName, setNewOrgName] = useState("");
    const [creatingOrg, setCreatingOrg] = useState(false);
    const [stripeBusyOrgId, setStripeBusyOrgId] = useState<string | null>(null);

    /** SecOps 등: `reports/{reportId}/roles/{uid}` — 여기서는 레거시로 uid를 넘겨 대부분 문서 없음 → viewer */
    const { role, loading: roleLoading, isOwner } = useRoleAccess(authUid ?? "");
    const { isPlatformAdmin, loading: platformRoleLoading } = useRoleGate();

    const loadOrgs = useCallback(async () => {
        if (!authUid) {
            setOrgs([]);
            return;
        }
        try {
            setLoading(true);
            const listOrgsFn = httpsCallable(functions, "listOrgs");
            const res = await listOrgsFn({});
            const data = res.data as { items?: Org[]; orgs?: Org[] } | undefined;
            if (!data || typeof data !== "object") {
                console.warn("[OrgBilling] listOrgs: 응답 data 없음", res);
                setOrgs([]);
                return;
            }
            const list = Array.isArray(data.items)
                ? data.items
                : Array.isArray(data.orgs)
                  ? data.orgs
                  : [];
            setOrgs(list);
        } catch (error) {
            console.error("조직 목록 로드 실패:", error);
            setOrgs([]);
        } finally {
            setLoading(false);
        }
    }, [authUid]);

    useEffect(() => {
        if (authUid) {
            void loadOrgs();
        } else {
            setOrgs([]);
        }
    }, [authUid, loadOrgs]);

    useEffect(() => {
        if (!authUid) {
            setSubscriptions([]);
            return;
        }
        const q = query(collection(db, "subscriptions"));
        const unsub = onSnapshot(
            q,
            (snap) => {
                setSubscriptions(parseSubscriptionQuerySnapshot(snap.docs));
            },
            (err) => {
                console.error("[OrgBilling] subscriptions onSnapshot", err);
            }
        );
        return () => unsub();
    }, [authUid]);

    const subscriptionsByOrgId = useMemo(
        () => buildSubscriptionsByOrgId(subscriptions),
        [subscriptions]
    );

    const orgRows = useMemo(
        () =>
            orgs.map((o) => ({
                org: o,
                billing: resolveOrgBilling(o, subscriptionsByOrgId),
            })),
        [orgs, subscriptionsByOrgId]
    );

    const billingKpi = useMemo(
        () => calculateOrgListKpi(orgs, subscriptionsByOrgId),
        [orgs, subscriptionsByOrgId]
    );

    const mrrFromSubscriptions = useMemo(
        () => calculateMRR(subscriptions, { includePastDue: false }),
        [subscriptions]
    );

    /** 동일 return URL에 대해 React Strict/재렌더에서 alert·loadOrgs가 두 번 나가지 않게 */
    const stripeReturnToastRef = useRef<string | null>(null);

    /** Stripe Checkout 복귀 — 쿼리 정리 + 목록 갱신 */
    useEffect(() => {
        const stripe = searchParams.get("stripe");
        if (stripe !== "success" && stripe !== "cancel") {
            stripeReturnToastRef.current = null;
            return;
        }
        const dedupeKey = `${stripe}|${searchParams.get("orgId") || ""}|${searchParams.get("session_id") || ""}`;
        const next = new URLSearchParams(searchParams);
        next.delete("stripe");
        next.delete("orgId");
        next.delete("session_id");
        setSearchParams(next, { replace: true });

        if (stripeReturnToastRef.current === dedupeKey) {
            return;
        }
        stripeReturnToastRef.current = dedupeKey;
        if (stripe === "success") {
            alert(
                "Stripe 결제가 완료되었습니다. `subscriptions` 미러가 반영될 때까지 잠시 걸릴 수 있습니다. 새로고침해 보세요."
            );
        } else {
            alert("Stripe 결제 창을 닫았습니다.");
        }
        void loadOrgs();
    }, [searchParams, setSearchParams, loadOrgs]);

    const handleCreateOrg = async () => {
        const name = newOrgName.trim();
        if (!name) {
            alert("조직 이름을 입력하세요.");
            return;
        }
        setCreatingOrg(true);
        try {
            const createOrgCallable = httpsCallable(functions, "createOrg");
            const res = await createOrgCallable({ name });
            const data = res.data as { orgId?: string };
            setNewOrgName("");
            alert(`조직이 생성되었습니다.\nID: ${data.orgId ?? ""}`);
            await loadOrgs();
        } catch (e: unknown) {
            const msg =
                e && typeof e === "object" && "message" in e
                    ? String((e as { message: string }).message)
                    : String(e);
            alert(`조직 생성 실패: ${msg}`);
        } finally {
            setCreatingOrg(false);
        }
    };

    const openOrgStripeCheckout = async (orgId: string) => {
        const priceId = String(import.meta.env.VITE_STRIPE_PRICE_PRO || "").trim();
        setStripeBusyOrgId(orgId);
        try {
            const fn = httpsCallable(functions, "createOrgStripeCheckoutSession");
            const res = await fn(priceId ? { orgId, priceId } : { orgId });
            const url = (res.data as { url?: string }).url;
            if (url) {
                window.location.href = url;
            } else {
                alert("Checkout URL을 받지 못했습니다.");
            }
        } catch (e: unknown) {
            const msg =
                e && typeof e === "object" && "message" in e
                    ? String((e as { message: string }).message)
                    : String(e);
            alert(`Stripe Checkout 시작 실패: ${msg}`);
        } finally {
            setStripeBusyOrgId(null);
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

            const contextResponse = await fetch(`${functionsOrigin}/getOrgContextAPI?orgId=${encodeURIComponent(orgId)}`);
            if (contextResponse.ok) {
                const context = await contextResponse.json();
                setSelected(context);
            }

            const statsResponse = await fetch(
                `${functionsOrigin}/getUsageStats?orgId=${encodeURIComponent(orgId)}&days=7`
            );
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                setUsageStats(stats);
            }
        } catch (error) {
            console.error("조직 정보 로드 실패:", error);
        }
    };

    // 권한 확인: 플랫폼 운영자(KPI·Rules와 동일) 또는 reports 역할 owner·secops / 운영 이메일
    const hasPermission = () => {
        if (roleLoading || platformRoleLoading) return false;
        if (!authUser) return false;

        if (isPlatformAdmin) return true;

        if (authUser.email?.includes("admin") || authUser.email?.includes("@yagovibe.com")) {
            return true;
        }

        return isOwner || role === "secops";
    };

    if (authLoading) {
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

    if (!authUser) {
        const next = `${location.pathname}${location.search}`;
        return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
    }

    if (roleLoading || platformRoleLoading) {
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
                                현재 SecOps 역할(reports/…/roles): {role || "확인 중…"} — 플랫폼 관리자는 별도(
                                <code className="rounded bg-muted px-1">checkUserRole</code>)입니다.
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
    const totalOrgs = orgs.length;
    const proOrgs = orgs.filter((o) => o.planId === "pro").length;
    const enterpriseOrgs = orgs.filter((o) => o.planId === "enterprise").length;
    const statusCards = [
        { key: "trialing", label: "Trial", value: billingKpi.trial, color: "text-violet-600" },
        { key: "active", label: "Active", value: billingKpi.active, color: "text-emerald-600" },
        { key: "past_due", label: "Past Due", value: billingKpi.past_due, color: "text-amber-600" },
        { key: "incomplete", label: "Failed", value: billingKpi.incomplete, color: "text-rose-600" },
        { key: "canceled", label: "Canceled", value: billingKpi.canceled, color: "text-slate-500" },
    ];
    const planChartData = [
        { name: "Free", value: Math.max(0, totalOrgs - proOrgs - enterpriseOrgs), color: "#94a3b8" },
        { name: "Pro", value: proOrgs, color: "#3b82f6" },
        { name: "Enterprise", value: enterpriseOrgs, color: "#8b5cf6" },
    ];
    const billingStatusChartData = [
        { name: "Trial", count: billingKpi.trial },
        { name: "Active", count: billingKpi.active },
        { name: "Past Due", count: billingKpi.past_due },
        { name: "Failed", count: billingKpi.incomplete },
        { name: "Canceled", count: billingKpi.canceled },
    ];
    const billingCoreCards = [
        { key: "subs", label: "총 구독 수", value: billingKpi.totalSubscriptions },
        { key: "active", label: "활성 구독", value: billingKpi.active },
        { key: "past_due", label: "결제 실패", value: billingKpi.past_due },
        {
            key: "mrr",
            label: "MRR",
            value: mrrFromSubscriptions.toLocaleString("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }),
        },
    ];
    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">YAGO SPORTS 실시간 리포트</h1>
                    <p className="text-sm text-muted-foreground mt-1">{today}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            placeholder="새 조직 이름"
                            value={newOrgName}
                            onChange={(e) => setNewOrgName(e.target.value)}
                            className="w-full min-w-[12rem] max-w-xs"
                            disabled={creatingOrg}
                            maxLength={120}
                        />
                        <Button
                            type="button"
                            onClick={() => void handleCreateOrg()}
                            disabled={creatingOrg || !newOrgName.trim()}
                        >
                            {creatingOrg ? "생성 중…" : "조직 생성"}
                        </Button>
                    </div>
                    <Button onClick={() => void loadOrgs()} disabled={loading} variant="outline">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        새로고침
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {billingCoreCards.map((item) => (
                    <Card key={item.key}>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className="mt-2 text-2xl font-bold">{item.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {statusCards.map((item) => (
                    <Card key={item.key}>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">{item.label}</p>
                            <p className={`mt-2 text-2xl font-bold ${item.color}`}>{item.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <CardContent className="p-4">
                        <div className="mb-3">
                            <h2 className="text-sm font-semibold">플랜 분포</h2>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={planChartData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88}>
                                        {planChartData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="mb-3">
                            <h2 className="text-sm font-semibold">결제 상태 분포</h2>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={billingStatusChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>


            <div className={`grid grid-cols-1 gap-6 ${selected ? "2xl:grid-cols-3" : ""}`}>
            {/* 조직 목록 테이블 */}
            <Card className={selected ? "2xl:col-span-2" : ""}>
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
                        <div className="space-y-2 py-8 text-center text-muted-foreground">
                            <p>조직이 없습니다.</p>
                            <p className="text-xs">
                                상단에서 이름을 입력한 뒤 <strong>조직 생성</strong>을 누르세요. (플랫폼 관리자 전용 Callable)
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="p-2">Org</th>
                                        <th className="p-2">Plan</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Src</th>
                                        <th className="p-2">RPM</th>
                                        <th className="p-2">RPD</th>
                                        <th className="p-2">Priority</th>
                                        <th className="p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgRows.map(({ org: o, billing: r }) => {
                                        const orgKey = String(o.id ?? "").trim();
                                        const statusBadge = getSubscriptionRowBadge(
                                            orgKey ? subscriptionsByOrgId.get(orgKey) : undefined,
                                            r.status
                                        );
                                        return (
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
                                            <td className="p-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <Badge className={statusBadge.className}>
                                                        {statusBadge.text}
                                                    </Badge>
                                                    <span className="text-[10px] text-muted-foreground max-w-[11rem] leading-tight">
                                                        {r.label}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <Badge variant="outline" title={r.source === "subscription" ? "subscriptions 문서" : "orgs.billing (fallback)"}>
                                                    {r.source === "subscription" ? "Live" : "캐시"}
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
                                                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => void openOrgStripeCheckout(o.id)}
                                                        disabled={
                                                            stripeBusyOrgId === o.id ||
                                                            o.planId === "enterprise"
                                                        }
                                                        title="Stripe 구독(Pro) — `subscriptions` 컬렉션(웹훅 미러)에 반영"
                                                    >
                                                        {stripeBusyOrgId === o.id ? "Stripe…" : "Stripe Pro"}
                                                    </Button>
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
                                    );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 선택된 조직 상세 정보 */}
            {selected && (
                <Card className="2xl:col-span-1">
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
            </div>
        </div>
    );
}

