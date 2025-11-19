import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { withBreaker, retry } from "@/lib/resilience/circuit";
import { Circuit } from "@/lib/resilience/circuit";

/**
 * Step 66: ResilientCall - 회복력 있는 호출 컴포넌트
 * Circuit Breaker + 재시도 + Fallback UX
 */

// 전역 Circuit Breaker 인스턴스 (컴포넌트 간 공유)
const globalBreaker = new Circuit(4, 8000);

export default function ResilientCall() {
    const [state, setState] = useState<"idle" | "loading" | "fallback" | "error" | "success">("idle");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    async function run() {
        setState("loading");
        setError(null);
        setResult(null);

        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            // Circuit Breaker + 재시도로 호출
            const r = await withBreaker(
                globalBreaker,
                () =>
                    retry(
                        () =>
                            fetch(`${functionsOrigin}/chaosDelay?p=0.1&d=200`)
                                .then((r) => {
                                    if (!r.ok) {
                                        throw new Error(`HTTP ${r.status}`);
                                    }
                                    return r.json();
                                }),
                        3
                    )
            );

            setResult(r);
            setState("success");
        } catch (e: any) {
            console.error("❌ 호출 실패:", e);
            setError(e.message || "알 수 없는 오류");

            // Circuit Breaker가 열려있으면 Fallback 모드
            if (e.message === "circuit_open") {
                setState("fallback");
            } else {
                setState("error");
            }
        }
    }

    return (
        <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">회복력 있는 호출 테스트</h3>
                <Button onClick={run} disabled={state === "loading"}>
                    {state === "loading" ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            호출 중...
                        </>
                    ) : (
                        "안정 호출"
                    )}
                </Button>
            </div>

            {state === "fallback" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-3 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4" />
                    <div>
                        <div className="font-semibold">과부하 감지</div>
                        <div className="text-xs mt-1">
                            Circuit Breaker가 열려있습니다. 간략 모드로 전환합니다.
                        </div>
                    </div>
                </div>
            )}

            {state === "error" && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 flex items-center gap-2 text-sm text-red-800 dark:text-red-200">
                    <AlertCircle className="w-4 h-4" />
                    <div>
                        <div className="font-semibold">호출 실패</div>
                        <div className="text-xs mt-1">{error}</div>
                    </div>
                </div>
            )}

            {state === "success" && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <div>
                        <div className="font-semibold">호출 성공</div>
                        {result && (
                            <pre className="text-xs mt-1 overflow-auto">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        )}
                    </div>
                </div>
            )}

            {/* Circuit Breaker 상태 표시 */}
            <div className="text-xs text-muted-foreground">
                <div>Circuit Breaker 상태: {globalBreaker.getState()}</div>
                <div>통계: {JSON.stringify(globalBreaker.getStats())}</div>
            </div>
        </div>
    );
}

