import { useState, useEffect } from "react";
import OpsCopilot from "@/components/OpsCopilot";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isAdminUser } from "@/utils/auditLog";
import GovernancePanel from "@/components/GovernancePanel";

/**
 * Step 52: AI Ops Center (Step 56 확장)
 * AI 운영 Copilot을 통합한 운영 센터 페이지 + Governance Panel
 */
export default function OpsCenter() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [teamId, setTeamId] = useState<string>("");
    const [governance, setGovernance] = useState<any>(null);

    useEffect(() => {
        setIsAdmin(isAdminUser());
    }, []);

    useEffect(() => {
        // Governance 데이터 로드
        const loadGovernance = async () => {
            try {
                const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                    "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

                const response = await fetch(`${functionsOrigin}/getGovernance?limit=1`);
                if (response.ok) {
                    const data = await response.json();
                    setGovernance(data.items?.[0] || null);
                }
            } catch (error) {
                console.error("Governance 데이터 로드 실패:", error);
            }
        };

        if (isAdmin) {
            loadGovernance();
            // 1분마다 갱신
            const interval = setInterval(loadGovernance, 60000);
            return () => clearInterval(interval);
        }
    }, [isAdmin]);

    if (!isAdmin) {
        return (
            <div className="p-4">
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="text-center text-red-600 dark:text-red-400">
                            관리자 권한이 필요합니다.
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl md:text-3xl font-bold">🎙️ AI Ops Center</h1>
                <div className="text-sm text-muted-foreground">
                    음성/텍스트 명령으로 글로벌 관제 실행
                </div>
            </div>

            {/* Step 56: Governance Panel */}
            {isAdmin && <GovernancePanel governance={governance} />}

            {/* 팀 선택 */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium">팀 필터 (선택사항):</label>
                        <input
                            type="text"
                            placeholder="팀 ID (예: SOHEUL_FC)"
                            value={teamId}
                            onChange={(e) => setTeamId(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md bg-background text-sm max-w-xs"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTeamId("")}
                        >
                            초기화
                        </Button>
                    </div>
                    {teamId && (
                        <div className="mt-2 text-sm text-muted-foreground">
                            현재 필터: <span className="font-semibold">{teamId}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Ops Copilot */}
            <OpsCopilot teamId={teamId || undefined} />

            {/* 사용 가이드 */}
            <Card className="shadow-sm bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                    <h2 className="text-lg font-semibold mb-3">📖 사용 가이드</h2>
                    <div className="space-y-2 text-sm">
                        <div>
                            <strong>음성 명령:</strong> "듣기" 버튼을 누르고 명령을 말하세요.
                        </div>
                        <div>
                            <strong>텍스트 명령:</strong> 입력창에 명령을 입력하고 Enter를 누르세요.
                        </div>
                        <div className="mt-3">
                            <strong>지원 명령 예시:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                                <li>"팀 요약 알려줘" - 팀별 품질 요약</li>
                                <li>"최근 이상 브리핑 해줘" - 이상 탐지 로그 확인</li>
                                <li>"재튜닝 실행해" - 팀 재튜닝 시작</li>
                                <li>"모델 재학습 상태 알려줘" - 모델 상태 확인</li>
                                <li>"모델 재로드" - 최신 모델 재로드</li>
                                <li>"전체 통계" - 글로벌 KPI 요약</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

