import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Download, FileText, Shield, Trash2 } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { getAuth } from "firebase/auth";

interface ComplianceExport {
    id: string;
    uid: string;
    manifest: {
        start: string;
        end: string;
        hash: string;
        counts: {
            audits: number;
            reports: number;
        };
    };
    gcsUri: string;
    publicUrl?: string;
    status: string;
    createdAt: any;
}

interface DSARRequest {
    id: string;
    uid: string;
    type: "access" | "delete" | "portability";
    status: "pending" | "done" | "failed";
    createdAt: any;
    completedAt?: any;
    result?: any;
}

/**
 * Step 63: Compliance & DSAR Center
 * 감사 번들 및 데이터 주체 요청 관리 대시보드
 * Step 43: Role System 연동 (Owner/SecOps만 접근)
 */
export default function ComplianceCenter() {
    const [exports, setExports] = useState<ComplianceExport[]>([]);
    const [dsarRequests, setDSARRequests] = useState<DSARRequest[]>([]);
    const [loading, setLoading] = useState(false);

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

            // Compliance Exports 조회
            const exportsResponse = await fetch(`${functionsOrigin}/listComplianceExports?limit=50`);
            if (exportsResponse.ok) {
                const exportsData = await exportsResponse.json();
                setExports(exportsData.items || []);
            }

            // DSAR Requests 조회
            const dsarResponse = await fetch(`${functionsOrigin}/listDSARRequests?limit=50`);
            if (dsarResponse.ok) {
                const dsarData = await dsarResponse.json();
                setDSARRequests(dsarData.items || []);
            }
        } catch (error) {
            console.error("데이터 로드 실패:", error);
        } finally {
            setLoading(false);
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
                                Compliance & DSAR Center는 Owner 또는 SecOps만 접근 가능합니다.
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

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🛡️ Compliance & DSAR Center</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Step 63: Compliance Export & DSAR Automation
                    </p>
                </div>
                <Button onClick={loadData} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    새로고침
                </Button>
            </div>

            {/* Compliance Exports 테이블 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">감사 번들 (Compliance Exports)</h2>
                        <Badge variant="outline">
                            총 {exports.length}개
                        </Badge>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : exports.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            감사 번들이 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="p-2">UID</th>
                                        <th className="p-2">기간</th>
                                        <th className="p-2">건수</th>
                                        <th className="p-2">해시</th>
                                        <th className="p-2">상태</th>
                                        <th className="p-2">액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exports.map((e) => (
                                        <tr key={e.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <td className="p-2 font-mono text-xs">{e.uid}</td>
                                            <td className="p-2 text-xs">
                                                {new Date(e.manifest.start).toLocaleDateString()} ~{" "}
                                                {new Date(e.manifest.end).toLocaleDateString()}
                                            </td>
                                            <td className="p-2">
                                                <div className="text-xs">
                                                    감사: {e.manifest.counts.audits}, 리포트: {e.manifest.counts.reports}
                                                </div>
                                            </td>
                                            <td className="p-2 font-mono text-xs text-muted-foreground">
                                                {e.manifest.hash.slice(0, 12)}…
                                            </td>
                                            <td className="p-2">
                                                <Badge
                                                    variant={
                                                        e.status === "completed" ? "default" : "secondary"
                                                    }
                                                >
                                                    {e.status}
                                                </Badge>
                                            </td>
                                            <td className="p-2">
                                                {e.publicUrl && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(e.publicUrl, "_blank")}
                                                    >
                                                        <Download className="h-3 w-3 mr-1" />
                                                        다운로드
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* DSAR Requests 테이블 */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">DSAR 요청 (Data Subject Access Requests)</h2>
                        <Badge variant="outline">
                            총 {dsarRequests.length}개
                        </Badge>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : dsarRequests.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            DSAR 요청이 없습니다.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="p-2">UID</th>
                                        <th className="p-2">타입</th>
                                        <th className="p-2">상태</th>
                                        <th className="p-2">요청일</th>
                                        <th className="p-2">완료일</th>
                                        <th className="p-2">액션</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dsarRequests.map((req) => (
                                        <tr key={req.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-900">
                                            <td className="p-2 font-mono text-xs">{req.uid}</td>
                                            <td className="p-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {req.type === "access" ? "접근권" :
                                                     req.type === "delete" ? "삭제권" :
                                                     "이식권"}
                                                </Badge>
                                            </td>
                                            <td className="p-2">
                                                <Badge
                                                    variant={
                                                        req.status === "done" ? "default" :
                                                        req.status === "failed" ? "destructive" :
                                                        "secondary"
                                                    }
                                                >
                                                    {req.status === "done" ? "완료" :
                                                     req.status === "failed" ? "실패" :
                                                     "대기"}
                                                </Badge>
                                            </td>
                                            <td className="p-2 text-xs">
                                                {req.createdAt ? new Date(req.createdAt).toLocaleString() : "-"}
                                            </td>
                                            <td className="p-2 text-xs">
                                                {req.completedAt ? new Date(req.completedAt).toLocaleString() : "-"}
                                            </td>
                                            <td className="p-2">
                                                {req.status === "done" && req.result?.publicUrl && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => window.open(req.result.publicUrl, "_blank")}
                                                    >
                                                        <Download className="h-3 w-3 mr-1" />
                                                        다운로드
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 법적 준수 항목 매핑 */}
            <Card>
                <CardContent className="p-4">
                    <h3 className="font-semibold mb-3">⚖️ 법적 준수 항목 매핑</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="p-2">항목</th>
                                    <th className="p-2">규정</th>
                                    <th className="p-2">대응 메커니즘</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t">
                                    <td className="p-2">데이터 접근권</td>
                                    <td className="p-2">GDPR Art. 15</td>
                                    <td className="p-2">DSAR 자동화 (dsarHandler)</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-2">삭제권(망각권)</td>
                                    <td className="p-2">GDPR Art. 17</td>
                                    <td className="p-2">retentionCleaner</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-2">보존기간 제한</td>
                                    <td className="p-2">PIPA 제21조</td>
                                    <td className="p-2">Retention 정책 (180일 기본)</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-2">이식권(Portability)</td>
                                    <td className="p-2">GDPR Art. 20</td>
                                    <td className="p-2">complianceExporter ZIP/PDF</td>
                                </tr>
                                <tr className="border-t">
                                    <td className="p-2">기록관리의무</td>
                                    <td className="p-2">ISO 27001 A.12</td>
                                    <td className="p-2">auditLogs + SHA256 무결성</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

