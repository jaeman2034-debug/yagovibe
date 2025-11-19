import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Shield, AlertTriangle } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

/**
 * Step 64: Global Governance Portal
 * Policy-as-Code 통합 관리/배포/감사
 * Step 43: Role System 연동 (Owner/SecOps만 접근)
 */
export default function GovernancePortal() {
    const [policy, setPolicy] = useState<any>(null);
    const [rollout, setRollout] = useState<any>(null);
    const [runtime, setRuntime] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [advancing, setAdvancing] = useState(false);

    // Step 43: Role System 연동
    const getCurrentUser = () => {
        const auth = getAuth();
        return auth.currentUser;
    };

    const user = getCurrentUser();
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

            // Policy 조회
            const policyResponse = await fetch(`${functionsOrigin}/getPolicy?id=default-governance`);
            if (policyResponse.ok) {
                const policyData = await policyResponse.json();
                setPolicy(policyData);
            }

            // Rollout 조회
            const rolloutResponse = await fetch(`${functionsOrigin}/getRollout`);
            if (rolloutResponse.ok) {
                const rolloutData = await rolloutResponse.json();
                setRollout(rolloutData);
            }

            // Runtime Ops 조회
            const runtimeResponse = await fetch(`${functionsOrigin}/getRuntimeOps`);
            if (runtimeResponse.ok) {
                const runtimeData = await runtimeResponse.json();
                setRuntime(runtimeData);
            }
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRolloutAdvance = async () => {
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        if (!confirm("다음 단계로 롤아웃을 진행하시겠습니까?")) {
            return;
        }

        try {
            setAdvancing(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/rolloutAdvance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    approvedBy: user.uid,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                alert(`✅ 롤아웃 진행 완료!\n\n적용 퍼센트: ${data.percent}%\n단계: ${data.idx + 1}/${data.totalStages}`);
                loadData(); // 새로고침
            } else {
                const error = await response.json();
                alert(`❌ 롤아웃 실패: ${error.error}\n\n${error.message || ""}`);
            }
        } catch (error: any) {
            alert(`오류: ${error.message}`);
        } finally {
            setAdvancing(false);
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
                                Global Governance Portal은 Owner 또는 SecOps만 접근 가능합니다.
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

    const currentStage = rollout?.idx !== undefined ? rollout.idx + 1 : 0;
    const totalStages = policy?.rollout?.stages?.length || 0;
    const currentPercent = rollout?.percent || 0;

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🛡️ Global Governance Portal</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 64: Policy-as-Code Engine
                    </p>
                </div>
                <Button onClick={loadData} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* Policy */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Policy</h2>
                        {policy && (
                            <Badge variant="outline">
                                v{policy.version || "unknown"}
                            </Badge>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : policy ? (
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm font-medium mb-2">기본 정보</div>
                                    <div className="text-sm space-y-1">
                                        <div>ID: {policy.id}</div>
                                        <div>Version: {policy.version}</div>
                                        <div>Owners: {policy.owners?.join(", ") || "-"}</div>
                                        {policy.compiledAt && (
                                            <div>
                                                컴파일: {new Date(policy.compiledAt).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium mb-2">범위</div>
                                    <div className="text-sm space-y-1">
                                        <div>팀: {policy.scope?.teams?.join(", ") || "*"}</div>
                                        <div>서비스: {policy.scope?.services?.join(", ") || "-"}</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium mb-2">임계값</div>
                                <div className="bg-muted rounded p-3 text-xs">
                                    <pre>{JSON.stringify(policy.thresholds || {}, null, 2)}</pre>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium mb-2">액션</div>
                                <div className="bg-muted rounded p-3 text-xs">
                                    <pre>{JSON.stringify(policy.actions || {}, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            정책이 없습니다.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Rollout */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Rollout</h2>
                        {rollout && (
                            <Badge variant={currentPercent === 100 ? "default" : "secondary"}>
                                {currentPercent}%
                            </Badge>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : rollout ? (
                        <div className="space-y-4">
                            <div className="text-sm">
                                현재 단계: {currentStage} / {totalStages} · 적용 퍼센트: {currentPercent}%
                            </div>

                            {policy?.rollout?.stages && (
                                <div className="space-y-2">
                                    {policy.rollout.stages.map((stage: any, idx: number) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 p-2 rounded ${
                                                idx === rollout.idx
                                                    ? "bg-blue-50 dark:bg-blue-900/20"
                                                    : idx < rollout.idx
                                                    ? "bg-green-50 dark:bg-green-900/20"
                                                    : "bg-gray-50 dark:bg-gray-900"
                                            }`}
                                        >
                                            <div className="flex-1">
                                                단계 {idx + 1}: {stage.percent}% (최소 {stage.minHours}시간)
                                            </div>
                                            {idx === rollout.idx && (
                                                <Badge variant="default">현재</Badge>
                                            )}
                                            {idx < rollout.idx && (
                                                <Badge variant="secondary">완료</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={handleRolloutAdvance}
                                    disabled={advancing || currentPercent >= 100}
                                >
                                    <Play className="h-4 w-4 mr-1" />
                                    {advancing ? "진행 중..." : "다음 단계로"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            롤아웃 정보가 없습니다.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Runtime Overrides */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Runtime Overrides</h2>
                        {runtime?.disabled && runtime.disabled.length > 0 && (
                            <Badge variant="destructive">
                                {runtime.disabled.length}개 차단
                            </Badge>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : runtime ? (
                        <div className="space-y-2">
                            <div>
                                <div className="text-sm font-medium mb-2">차단된 Ops</div>
                                {runtime.disabled && runtime.disabled.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {runtime.disabled.map((op: string, idx: number) => (
                                            <Badge key={idx} variant="destructive">
                                                {op}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">차단된 Ops 없음</div>
                                )}
                            </div>

                            {runtime.updatedAt && (
                                <div className="text-xs text-muted-foreground">
                                    업데이트: {new Date(runtime.updatedAt).toLocaleString()}
                                </div>
                            )}

                            <div className="bg-muted rounded p-3 text-xs">
                                <pre>{JSON.stringify(runtime, null, 2)}</pre>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            Runtime 정보가 없습니다.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 보안/감사 가드라인 */}
            <Card>
                <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">🔒 보안/감사 가드라인</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        <li>Git-signed 정책만 컴파일 허용 (GPG/Keyless Sigstore)</li>
                        <li>다중 승인(4-eyes) 없이는 rolloutAdvance 불가</li>
                        <li>모든 차단/해제 이벤트는 auditLogs에 기록</li>
                        <li>팀/서비스 스코프 필수 (정책 오남용 방지)</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

