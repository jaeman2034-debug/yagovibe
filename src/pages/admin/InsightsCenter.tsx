import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Mail, MessageSquare, Volume2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isAdminUser } from "@/utils/auditLog";

interface InsightSubscription {
    id: string;
    teamId: string;
    title: string;
    cadence: string;
    windowDays: number;
    channels: {
        slack?: boolean;
        email?: boolean;
        tts?: boolean;
    };
    isEnabled: boolean;
    lastRunAt?: any;
    createdBy?: string;
    emailTo?: string;
}

/**
 * Step 59: Proactive Insights Center
 * 구독 관리 및 수동 실행
 */
export default function InsightsCenter() {
    const [subs, setSubs] = useState<InsightSubscription[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [running, setRunning] = useState<Set<string>>(new Set());

    useEffect(() => {
        setIsAdmin(isAdminUser());
    }, []);

    useEffect(() => {
        if (isAdmin) {
            loadSubs();
        }
    }, [isAdmin]);

    const loadSubs = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/getInsightSubs`);
            if (response.ok) {
                const data = await response.json();
                setSubs(data.items || []);
            }
        } catch (error) {
            console.error("Insight 구독 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunManual = async (subId: string) => {
        try {
            setRunning((prev) => new Set(prev).add(subId));

            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/runProactiveInsightsManual?sub=${subId}`);
            if (response.ok) {
                const data = await response.json();
                alert(`✅ 리포트 생성 완료!\n\n리포트 ID: ${data.reportId}\n\n${data.summary}`);
                loadSubs(); // 새로고침
            } else {
                const error = await response.json();
                alert(`❌ 실행 실패: ${error.error}`);
            }
        } catch (error: any) {
            alert(`❌ 실행 오류: ${error.message}`);
        } finally {
            setRunning((prev) => {
                const next = new Set(prev);
                next.delete(subId);
                return next;
            });
        }
    };

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
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">📬 Proactive Insights</h1>
                <Button onClick={loadSubs} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* 설명 */}
            <Card className="shadow-sm bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                    <h2 className="text-lg font-semibold mb-2">📋 Proactive Insights란?</h2>
                    <p className="text-sm text-muted-foreground">
                        지식 그래프를 활용하여 예약된 그래프 질의를 자동 실행하고, 스토리형 인사이트(요약·하이라이트·경보)를 Slack/Email/TTS로 발행합니다.
                    </p>
                </CardContent>
            </Card>

            {/* 구독 목록 */}
            {loading ? (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            ) : subs.length === 0 ? (
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center text-muted-foreground">
                            구독이 없습니다. 새 구독을 생성하세요.
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {subs.map((s) => (
                        <Card key={s.id} className="shadow-sm">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="font-semibold text-lg">{s.title || "인사이트 리포트"}</div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            팀: <span className="font-medium">{s.teamId}</span>
                                        </div>
                                    </div>
                                    <Badge variant={s.isEnabled ? "default" : "secondary"}>
                                        {s.isEnabled ? "활성" : "비활성"}
                                    </Badge>
                                </div>

                                <div className="text-sm space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">주기:</span>
                                        <span>{s.cadence === "weekly" ? "매주" : s.cadence === "daily" ? "매일" : s.cadence}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">기간:</span>
                                        <span>{s.windowDays}일</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">채널:</span>
                                        <div className="flex gap-1">
                                            {s.channels?.slack && (
                                                <Badge variant="outline" className="text-xs">
                                                    <MessageSquare className="h-3 w-3 inline mr-1" />
                                                    Slack
                                                </Badge>
                                            )}
                                            {s.channels?.email && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Mail className="h-3 w-3 inline mr-1" />
                                                    Email
                                                </Badge>
                                            )}
                                            {s.channels?.tts && (
                                                <Badge variant="outline" className="text-xs">
                                                    <Volume2 className="h-3 w-3 inline mr-1" />
                                                    TTS
                                                </Badge>
                                            )}
                                            {(!s.channels?.slack && !s.channels?.email && !s.channels?.tts) && (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </div>
                                    </div>
                                    {s.lastRunAt && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">마지막 실행:</span>
                                            <span className="text-xs">
                                                {s.lastRunAt.toDate
                                                    ? new Date(s.lastRunAt.toDate()).toLocaleString()
                                                    : new Date(s.lastRunAt).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        onClick={() => handleRunManual(s.id)}
                                        disabled={running.has(s.id)}
                                        className="flex-1"
                                    >
                                        {running.has(s.id) ? (
                                            <>
                                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                실행 중...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="h-3 w-3 mr-1" />
                                                지금 실행
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            // TODO: 구독 편집 모달
                                            alert("구독 편집 기능은 곧 추가될 예정입니다.");
                                        }}
                                    >
                                        <Settings className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* 새 구독 생성 안내 */}
            <Card className="shadow-sm border-dashed">
                <CardContent className="p-4">
                    <div className="text-center text-muted-foreground">
                        <p className="text-sm">
                            새 구독을 생성하려면 Firebase Console에서 <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">insightSubs</code> 컬렉션에 문서를 추가하세요.
                        </p>
                        <p className="text-xs mt-2">
                            예시: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{"{ teamId: 'SOHEUL_FC', title: '주간 품질 인사이트', cadence: 'weekly', windowDays: 7, channels: { slack: true, email: true }, isEnabled: true }"}</code>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

