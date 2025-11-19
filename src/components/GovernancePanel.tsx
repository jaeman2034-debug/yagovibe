import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, TrendingDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GovernanceData {
    date: string;
    passRate: number;
    copilotReliability: number;
    regressionCount: number;
    avgLatency: number;
    topFailCases?: string[];
    testCount?: number;
    testsPassed?: number;
    testsFailed?: number;
    lastUpdated?: any;
}

interface RuntimeOps {
    disabled?: string[];
    updatedAt?: any;
    reason?: string;
}

/**
 * Step 56: Governance Panel
 * 실시간 정책 상태 및 차단된 명령 표시
 */
export default function GovernancePanel({ governance }: { governance?: GovernanceData | null }) {
    const [runtimeOps, setRuntimeOps] = useState<RuntimeOps | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRuntimeOps = async () => {
            try {
                const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                    "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

                const response = await fetch(`${functionsOrigin}/getRuntimeOps`);
                if (response.ok) {
                    const data = await response.json();
                    setRuntimeOps(data);
                }
            } catch (error) {
                console.error("RuntimeOps 조회 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        loadRuntimeOps();
        // 30초마다 갱신
        const interval = setInterval(loadRuntimeOps, 30000);
        return () => clearInterval(interval);
    }, []);

    if (!governance) {
        return (
            <Card className="shadow-md">
                <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Governance 데이터 없음</div>
                </CardContent>
            </Card>
        );
    }

    const isAlert = governance.passRate < 0.9 || governance.copilotReliability < 0.85;
    const isCritical = governance.regressionCount > 3 || governance.passRate < 0.8;
    const isBlocked = runtimeOps?.disabled && runtimeOps.disabled.length > 0;

    return (
        <div className="space-y-4">
            <Card className={`shadow-md ${isCritical ? "border-red-500" : isAlert ? "border-yellow-500" : ""}`}>
                <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold">Governance Policy</h2>
                        <Badge 
                            variant={isCritical ? "destructive" : isAlert ? "default" : "secondary"}
                            className="flex items-center gap-1"
                        >
                            {isCritical ? (
                                <>
                                    <AlertTriangle className="h-3 w-3" />
                                    CRITICAL
                                </>
                            ) : isAlert ? (
                                <>
                                    <TrendingDown className="h-3 w-3" />
                                    ALERT
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-3 w-3" />
                                    STABLE
                                </>
                            )}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="text-muted-foreground">Pass Rate</div>
                            <div className={`text-lg font-semibold ${
                                governance.passRate < 0.9 ? "text-red-600 dark:text-red-400" :
                                governance.passRate < 0.95 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-green-600 dark:text-green-400"
                            }`}>
                                {(governance.passRate * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Reliability</div>
                            <div className={`text-lg font-semibold ${
                                governance.copilotReliability < 0.85 ? "text-red-600 dark:text-red-400" :
                                governance.copilotReliability < 0.9 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-green-600 dark:text-green-400"
                            }`}>
                                {(governance.copilotReliability * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Regressions</div>
                            <div className={`text-lg font-semibold ${
                                governance.regressionCount > 3 ? "text-red-600 dark:text-red-400" :
                                governance.regressionCount > 0 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-green-600 dark:text-green-400"
                            }`}>
                                {governance.regressionCount}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground">Avg Latency</div>
                            <div className={`text-lg font-semibold ${
                                governance.avgLatency > 500 ? "text-red-600 dark:text-red-400" :
                                governance.avgLatency > 300 ? "text-yellow-600 dark:text-yellow-400" :
                                "text-green-600 dark:text-green-400"
                            }`}>
                                {governance.avgLatency?.toFixed(0) || 0}ms
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        <p>Last Updated: {governance.date}</p>
                        {governance.testCount && (
                            <p>Tests: {governance.testsPassed || 0} / {governance.testCount}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 차단된 명령 표시 */}
            {isBlocked && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>⚠️ 제한 명령 (Disabled Ops)</AlertTitle>
                    <AlertDescription>
                        <div className="mt-2">
                            <p className="font-medium">다음 명령이 자동으로 차단되었습니다:</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {runtimeOps?.disabled?.map((intent, idx) => (
                                    <Badge key={idx} variant="destructive">
                                        {intent === "*" ? "모든 명령" : intent}
                                    </Badge>
                                ))}
                            </div>
                            {runtimeOps?.reason && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    사유: {runtimeOps.reason}
                                </p>
                            )}
                            {runtimeOps?.updatedAt && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    차단 시간: {new Date(runtimeOps.updatedAt.seconds * 1000).toLocaleString()}
                                </p>
                            )}
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {/* 최근 실패 케이스 */}
            {governance.topFailCases && governance.topFailCases.length > 0 && (
                <Card className="shadow-sm border-yellow-200 dark:border-yellow-800">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <h3 className="text-sm font-semibold">최근 실패 케이스</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {governance.topFailCases.slice(0, 5).map((fc, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                    {fc}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

