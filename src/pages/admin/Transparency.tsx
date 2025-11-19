import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Eye, Download, Shield, FileText } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

interface AuditLog {
    id: string;
    ts: any;
    actor?: { uid?: string; role?: string; name?: string };
    subject?: { teamId?: string; reportId?: string };
    action: string;
    integrity?: { sha256?: string };
    policy?: { risk?: "low" | "med" | "high" };
    pii?: { redacted?: boolean; fields?: string[] };
    consent?: { basis?: string; scope?: string[] };
}

interface DecisionExplain {
    logId: string;
    action: string;
    actor?: any;
    subject?: any;
    when: any;
    why: string[];
    model?: any;
    modelCard?: any;
    input?: any;
    output?: any;
    policy?: any;
    pii?: any;
    consent?: any;
    integrity?: any;
    links?: any;
}

/**
 * Step 62: AI Ethics & Transparency Dashboard
 * 설명가능성 및 감사 추적 대시보드
 * Step 43: Role System 연동 (Owner/SecOps만 접근)
 */
export default function Transparency() {
    const [items, setItems] = useState<AuditLog[]>([]);
    const [detail, setDetail] = useState<DecisionExplain | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

    // Step 43: Role System 연동
    const getCurrentUser = () => {
        const auth = getAuth();
        return auth.currentUser;
    };

    const user = getCurrentUser();
    const { role, loading: roleLoading, isOwner } = useRoleAccess(user?.uid || "");

    useEffect(() => {
        if (user) {
            loadAuditLogs();
        }
    }, [user]);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/listAudit?limit=100`);
            if (response.ok) {
                const data = await response.json();
                setItems(data.items || []);
            }
        } catch (error) {
            console.error("감사 로그 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const openExplain = async (id: string) => {
        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/getDecisionExplain?logId=${id}`);
            if (response.ok) {
                const data = await response.json();
                setDetail(data);
                setSelectedLogId(id);
            }
        } catch (error) {
            console.error("결정 해석 로드 실패:", error);
        }
    };

    const exportAuditLogs = async (uid: string, format: "json" | "csv" = "json") => {
        try {
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/exportAuditForSubject?uid=${uid}&format=${format}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `audit-export-${uid}-${Date.now()}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error("내보내기 실패:", error);
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
                                AI Ethics & Transparency Dashboard는 Owner 또는 SecOps만 접근 가능합니다.
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

    const riskColors: { [key: string]: string } = {
        low: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300",
        med: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300",
        high: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300",
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🧭 AI Ethics & Transparency</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 62: Explainability & Audit Trail
                    </p>
                </div>
                <Button onClick={loadAuditLogs} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* 감사 로그 테이블 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">감사 로그 (Audit Trail)</h2>
                        <Badge variant="outline">
                            총 {items.length}개
                        </Badge>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            감사 로그가 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="p-2">시간</th>
                                        <th className="p-2">행위</th>
                                        <th className="p-2">팀</th>
                                        <th className="p-2">주체</th>
                                        <th className="p-2">위험도</th>
                                        <th className="p-2">무결성</th>
                                        <th className="p-2">액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((x) => (
                                        <tr
                                            key={x.id}
                                            className="border-t hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                                            onClick={() => openExplain(x.id)}
                                        >
                                            <td className="p-2">
                                                {x.ts ? new Date(x.ts).toLocaleString() : "-"}
                                            </td>
                                            <td className="p-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {x.action}
                                                </Badge>
                                            </td>
                                            <td className="p-2">{x.subject?.teamId || "-"}</td>
                                            <td className="p-2">
                                                <div className="text-xs">
                                                    {x.actor?.name || x.actor?.uid || "-"}
                                                    {x.actor?.role && (
                                                        <Badge variant="secondary" className="ml-1 text-xs">
                                                            {x.actor.role}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                {x.policy?.risk && (
                                                    <Badge className={riskColors[x.policy.risk] || ""}>
                                                        {x.policy.risk}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-2 text-xs text-muted-foreground font-mono">
                                                {x.integrity?.sha256?.slice(0, 12) || "-"}…
                                            </td>
                                            <td className="p-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openExplain(x.id);
                                                    }}
                                                >
                                                    <Eye className="h-3 w-3 mr-1" />
                                                    해석
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 결정 해석 상세 */}
            {detail && (
                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">결정 해석 (Why-Chain)</h3>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    if (detail.actor?.uid) {
                                        exportAuditLogs(detail.actor.uid, "json");
                                    }
                                }}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                내보내기
                            </Button>
                        </div>

                        {/* Why-Chain */}
                        {detail.why && detail.why.length > 0 && (
                            <div>
                                <div className="font-semibold mb-2">왜 (Why)</div>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                    {detail.why.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* 모델 정보 */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <div className="font-semibold mb-2">모델 정보</div>
                                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                    {JSON.stringify(detail.model || {}, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <div className="font-semibold mb-2">Model Card</div>
                                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                    {JSON.stringify(detail.modelCard || {}, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* 입력/출력 */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <div className="font-semibold mb-2">입력 (Input)</div>
                                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                    {JSON.stringify(detail.input || {}, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <div className="font-semibold mb-2">출력 (Output)</div>
                                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                    {JSON.stringify(detail.output || {}, null, 2)}
                                </pre>
                            </div>
                        </div>

                        {/* 보안/규정 준수 정보 */}
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div>
                                <div className="font-semibold mb-1">PII 보호</div>
                                <div className="text-muted-foreground">
                                    {detail.pii?.redacted ? (
                                        <Badge variant="default">
                                            <Shield className="h-3 w-3 mr-1" />
                                            Redacted
                                        </Badge>
                                    ) : (
                                        <span>없음</span>
                                    )}
                                    {detail.pii?.fields && detail.pii.fields.length > 0 && (
                                        <div className="text-xs mt-1">
                                            필드: {detail.pii.fields.join(", ")}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold mb-1">동의 (Consent)</div>
                                <div className="text-muted-foreground">
                                    {detail.consent?.basis || "없음"}
                                    {detail.consent?.scope && (
                                        <div className="text-xs mt-1">
                                            범위: {detail.consent.scope.join(", ")}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold mb-1">무결성 (Integrity)</div>
                                <div className="text-muted-foreground font-mono text-xs">
                                    {detail.integrity?.sha256 || "-"}
                                </div>
                            </div>
                        </div>

                        {/* 정책 정보 */}
                        {detail.policy && (
                            <div>
                                <div className="font-semibold mb-2">정책 정보</div>
                                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                                    {JSON.stringify(detail.policy, null, 2)}
                                </pre>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

