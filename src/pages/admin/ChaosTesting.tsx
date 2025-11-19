import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Play, StopCircle, RefreshCw } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";
import ResilientCall from "@/components/ResilientCall";

/**
 * Step 66: Chaos Testing - 혼돈 실험 대시보드
 * Step 43: Role System 연동 (Owner/SecOps만 접근)
 */
export default function ChaosTesting() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    // Step 43: Role System 연동
    const getCurrentUser = () => {
        const auth = getAuth();
        return auth.currentUser;
    };

    const user = getCurrentUser();
    const { role, loading: roleLoading, isOwner } = useRoleAccess(user?.uid || "");

    const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

    const runChaosTest = async (testName: string, params: any) => {
        setLoading(true);
        try {
            const response = await fetch(`${functionsOrigin}/chaosDelay?${new URLSearchParams(params)}`);
            const data = await response.json();
            
            setResults((prev) => [
                {
                    testName,
                    timestamp: new Date().toISOString(),
                    result: data,
                    status: response.ok ? "success" : "error",
                },
                ...prev,
            ]);
        } catch (error: any) {
            setResults((prev) => [
                {
                    testName,
                    timestamp: new Date().toISOString(),
                    result: { error: error.message },
                    status: "error",
                },
                ...prev,
            ]);
        } finally {
            setLoading(false);
        }
    };

    const runChaosProxy = async (mode: string) => {
        setLoading(true);
        try {
            const response = await fetch(`${functionsOrigin}/chaosProxy?mode=${mode}`);
            const data = await response.json();
            
            setResults((prev) => [
                {
                    testName: `Chaos Proxy (${mode})`,
                    timestamp: new Date().toISOString(),
                    result: data,
                    status: response.ok ? "success" : "error",
                },
                ...prev,
            ]);
        } catch (error: any) {
            setResults((prev) => [
                {
                    testName: `Chaos Proxy (${mode})`,
                    timestamp: new Date().toISOString(),
                    result: { error: error.message },
                    status: "error",
                },
                ...prev,
            ]);
        } finally {
            setLoading(false);
        }
    };

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
                    <h1 className="text-3xl font-bold">🔀 Chaos Testing</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 66: Resilience & Chaos Testing
                    </p>
                </div>
            </div>

            {/* 회복력 테스트 컴포넌트 */}
            <Card>
                <CardContent className="p-4">
                    <h2 className="text-lg font-semibold mb-4">회복력 있는 호출 테스트</h2>
                    <ResilientCall />
                </CardContent>
            </Card>

            {/* Chaos Delay 테스트 */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <h2 className="text-lg font-semibold">랜덤 지연/오류 주입</h2>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            onClick={() => runChaosTest("Delay 20% Error", { p: "0.2", d: "300" })}
                            disabled={loading}
                            variant="outline"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            20% 오류 + 300ms 지연
                        </Button>
                        <Button
                            onClick={() => runChaosTest("Delay 50% Error", { p: "0.5", d: "500" })}
                            disabled={loading}
                            variant="outline"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            50% 오류 + 500ms 지연
                        </Button>
                        <Button
                            onClick={() => runChaosTest("Delay 100% Error", { p: "1.0", d: "1000" })}
                            disabled={loading}
                            variant="destructive"
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            100% 오류 + 1s 지연
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Chaos Proxy 테스트 */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <h2 className="text-lg font-semibold">외부 의존 차단 시뮬레이터</h2>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            onClick={() => runChaosProxy("ok")}
                            disabled={loading}
                            variant="outline"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            정상 응답
                        </Button>
                        <Button
                            onClick={() => runChaosProxy("slow")}
                            disabled={loading}
                            variant="outline"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            느린 응답 (4s)
                        </Button>
                        <Button
                            onClick={() => runChaosProxy("error")}
                            disabled={loading}
                            variant="destructive"
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            오류 응답 (502)
                        </Button>
                        <Button
                            onClick={() => runChaosProxy("drop")}
                            disabled={loading}
                            variant="destructive"
                        >
                            <StopCircle className="w-4 h-4 mr-2" />
                            패킷 드랍
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 테스트 결과 */}
            {results.length > 0 && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">테스트 결과</h2>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setResults([])}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                클리어
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {results.map((result, idx) => (
                                <div
                                    key={idx}
                                    className="border rounded p-3 text-sm"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-medium">{result.testName}</div>
                                        <Badge
                                            variant={
                                                result.status === "success"
                                                    ? "default"
                                                    : "destructive"
                                            }
                                        >
                                            {result.status}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-2">
                                        {new Date(result.timestamp).toLocaleString()}
                                    </div>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                        {JSON.stringify(result.result, null, 2)}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

