import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Check, X, Edit } from "lucide-react";
import { getAuth } from "firebase/auth";
import { useRoleAccess } from "@/hooks/useRoleAccess";

interface InsightReport {
    id: string;
    teamId: string;
    status: "draft" | "approved" | "rejected" | "published";
    summary: string;
    highlights: any[];
    alerts: any[];
    metrics: any;
    reviewHistory: any[];
    comments: any[];
    createdAt: any;
    publishedAt?: any;
    revision?: number;
    subscription?: any;
}

/**
 * Step 60: Insight Review - Human-In-The-Loop Approval Workflow
 * 인사이트 리포트 검토 및 승인/반려
 * Step 43: Role System 연동 (Owner/Admin만 승인 가능)
 */
export default function InsightReview() {
    const [reports, setReports] = useState<InsightReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"draft" | "all">("draft");
    const [selectedReport, setSelectedReport] = useState<InsightReport | null>(null);
    const [comment, setComment] = useState("");
    const [processing, setProcessing] = useState<Set<string>>(new Set());
    
    // Step 43: Role System 연동 - 첫 번째 리포트의 teamId로 권한 확인
    const firstReportTeamId = reports.length > 0 ? reports[0].teamId : null;
    const { role, loading: roleLoading, isOwner, canEdit } = useRoleAccess(firstReportTeamId || "");

    const getCurrentUser = () => {
        const auth = getAuth();
        const user = auth.currentUser;
        return user ? {
            uid: user.uid,
            name: user.displayName || user.email || "운영자",
        } : null;
    };

    // Step 43: 권한 확인 - Owner 또는 Admin만 접근 가능
    const hasReviewPermission = () => {
        if (roleLoading) return false;
        // Admin 체크 (이메일 기반)
        const user = getCurrentUser();
        if (user?.name?.includes("admin") || user?.name?.includes("@yagovibe.com")) {
            return true;
        }
        // Owner 체크
        return isOwner || role === "owner";
    };

    useEffect(() => {
        if (hasReviewPermission()) {
            loadReports();
        }
    }, [statusFilter, hasReviewPermission]);

    const loadReports = async () => {
        try {
            setLoading(true);
            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const params = new URLSearchParams();
            if (statusFilter !== "all") {
                params.append("status", statusFilter);
            }
            params.append("limit", "50");

            const response = await fetch(`${functionsOrigin}/getInsightReports?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setReports(data.items || []);
            }
        } catch (error) {
            console.error("리포트 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (id: string, decision: "approve" | "reject") => {
        const user = getCurrentUser();
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        // Step 43: 권한 확인
        if (!hasReviewPermission()) {
            alert("승인/반려 권한이 없습니다. Owner 또는 Admin만 가능합니다.");
            return;
        }

        if (decision === "reject" && !comment.trim()) {
            alert("반려 시 코멘트를 입력해주세요.");
            return;
        }

        try {
            setProcessing((prev) => new Set(prev).add(id));

            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/publishInsight`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    decision,
                    reviewer: user,
                    comment: decision === "reject" ? comment : undefined,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                alert(decision === "approve" ? "✅ 승인 완료" : "❌ 반려 완료");
                setComment("");
                setSelectedReport(null);
                loadReports(); // 새로고침
            } else {
                const error = await response.json();
                alert(`오류: ${error.error}`);
            }
        } catch (error: any) {
            alert(`오류: ${error.message}`);
        } finally {
            setProcessing((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const handleUpdate = async (id: string, summary: string, highlights: any[]) => {
        const user = getCurrentUser();
        if (!user) {
            alert("로그인이 필요합니다.");
            return;
        }

        // Step 43: 권한 확인
        if (!hasReviewPermission()) {
            alert("수정 권한이 없습니다. Owner 또는 Editor만 가능합니다.");
            return;
        }

        try {
            setProcessing((prev) => new Set(prev).add(id));

            const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
                "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

            const response = await fetch(`${functionsOrigin}/updateInsight`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id,
                    summary,
                    highlights,
                    reviewer: user,
                }),
            });

            if (response.ok) {
                alert("✅ 수정 완료 (리비전 생성)");
                setSelectedReport(null);
                loadReports();
            } else {
                const error = await response.json();
                alert(`오류: ${error.error}`);
            }
        } catch (error: any) {
            alert(`오류: ${error.message}`);
        } finally {
            setProcessing((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    // 권한 없음 UI
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

    if (!hasReviewPermission()) {
        return (
            <div className="p-4">
                <Card className="shadow-sm border-red-200 dark:border-red-800">
                    <CardContent className="p-4">
                        <div className="text-center text-red-600 dark:text-red-400">
                            <p className="font-semibold mb-2">접근 권한이 없습니다</p>
                            <p className="text-sm">
                                인사이트 승인/반려는 Owner 또는 Admin만 가능합니다.
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

    const statusColors: { [key: string]: string } = {
        draft: "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300",
        approved: "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300",
        rejected: "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300",
        published: "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300",
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🧩 인사이트 승인 센터</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 43: {role ? `역할: ${role}` : "권한 확인 중..."} {isOwner && "✅ Owner"}
                    </p>
                </div>
                <Button onClick={loadReports} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* 필터 */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="flex gap-2">
                        <Button
                            variant={statusFilter === "draft" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("draft")}
                        >
                            검토 대기 (draft)
                        </Button>
                        <Button
                            variant={statusFilter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("all")}
                        >
                            전체
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 리포트 목록 */}
            {loading ? (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            ) : reports.length === 0 ? (
                <Card>
                    <CardContent className="p-4">
                        <div className="text-center text-muted-foreground">
                            {statusFilter === "draft" ? "검토 대기 중인 리포트가 없습니다." : "리포트가 없습니다."}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {reports.map((r) => (
                        <Card key={r.id} className="shadow-sm">
                            <CardContent className="p-4 space-y-4">
                                {/* 헤더 */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-lg">{r.teamId}</h3>
                                            <Badge className={statusColors[r.status] || ""}>
                                                {r.status === "draft" ? "검토 대기" :
                                                 r.status === "approved" ? "승인됨" :
                                                 r.status === "rejected" ? "반려됨" :
                                                 "배포됨"}
                                            </Badge>
                                            {r.revision && r.revision > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    리비전 {r.revision}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            생성일: {r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}
                                            {r.publishedAt && (
                                                <> • 배포일: {new Date(r.publishedAt).toLocaleString()}</>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 요약 */}
                                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                                    <div className="text-sm whitespace-pre-wrap">{r.summary}</div>
                                </div>

                                {/* 하이라이트 */}
                                {r.highlights && r.highlights.length > 0 && (
                                    <div>
                                        <div className="text-sm font-medium mb-2">하이라이트</div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                            {r.highlights.map((h, idx) => (
                                                <div key={idx} className="text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                                    <div className="font-medium">{h.label}</div>
                                                    <div className="text-muted-foreground">{h.value}</div>
                                                    {h.trend && (
                                                        <div className={`text-xs mt-1 ${
                                                            h.trend === "up" ? "text-green-600" :
                                                            h.trend === "down" ? "text-red-600" :
                                                            "text-gray-600"
                                                        }`}>
                                                            {h.trend === "up" ? "📈" : h.trend === "down" ? "📉" : "➡️"} {h.trend}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 경보 */}
                                {r.alerts && r.alerts.length > 0 && (
                                    <div>
                                        <div className="text-sm font-medium mb-2">상위 경보 규칙</div>
                                        <div className="flex flex-wrap gap-2">
                                            {r.alerts.slice(0, 5).map((a, idx) => (
                                                <Badge key={idx} variant="outline" className="text-xs">
                                                    {a.rule}: {a.hits}회
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 리뷰 히스토리 */}
                                {r.reviewHistory && r.reviewHistory.length > 0 && (
                                    <div>
                                        <div className="text-sm font-medium mb-2">리뷰 히스토리</div>
                                        <div className="space-y-1 text-xs">
                                            {r.reviewHistory.map((rh, idx) => (
                                                <div key={idx} className="text-muted-foreground">
                                                    {rh.action === "approve" ? "✅" : rh.action === "reject" ? "❌" : "📝"} {rh.name} - {new Date(rh.ts).toLocaleString()}
                                                    {rh.comment && (
                                                        <div className="ml-4 text-xs">{rh.comment}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 코멘트 */}
                                {r.comments && r.comments.length > 0 && (
                                    <div>
                                        <div className="text-sm font-medium mb-2">코멘트</div>
                                        <div className="space-y-1 text-xs">
                                            {r.comments.map((c, idx) => (
                                                <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                                    <div className="font-medium">{c.name || "운영자"}</div>
                                                    <div className="text-muted-foreground">{c.text}</div>
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {new Date(c.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 액션 버튼 */}
                                {r.status === "draft" && (
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            size="sm"
                                            onClick={() => handleReview(r.id, "approve")}
                                            disabled={processing.has(r.id)}
                                            className="flex-1"
                                        >
                                            <Check className="h-4 w-4 mr-1" />
                                            {processing.has(r.id) ? "처리 중..." : "승인"}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => {
                                                setSelectedReport(r);
                                                const comment = prompt("반려 사유를 입력하세요:");
                                                if (comment) {
                                                    setComment(comment);
                                                    handleReview(r.id, "reject");
                                                }
                                            }}
                                            disabled={processing.has(r.id)}
                                            className="flex-1"
                                        >
                                            <X className="h-4 w-4 mr-1" />
                                            반려
                                        </Button>
                                        {canEdit && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const newSummary = prompt("요약을 수정하세요:", r.summary);
                                                    if (newSummary && newSummary !== r.summary) {
                                                        handleUpdate(r.id, newSummary, r.highlights);
                                                    }
                                                }}
                                                disabled={processing.has(r.id)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}

                                {r.status === "approved" && (
                                    <div className="text-sm text-green-600 dark:text-green-400">
                                        ✅ 승인됨 - 배포 대기 중
                                    </div>
                                )}

                                {r.status === "published" && (
                                    <div className="text-sm text-blue-600 dark:text-blue-400">
                                        ✅ 배포 완료
                                    </div>
                                )}

                                {r.status === "rejected" && (
                                    <div className="text-sm text-red-600 dark:text-red-400">
                                        ❌ 반려됨
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
