import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";

interface AuditLog {
    id: string;
    uid: string;
    email: string;
    action: string;
    target: string;
    createdAt: Timestamp | Date | null;
}

interface AuditLogTableProps {
    reportId: string;
}

/**
 * Step 43: 감사 로그 테이블 컴포넌트
 * 관리자만 볼 수 있는 활동 로그 테이블
 */
export default function AuditLogTable({ reportId }: AuditLogTableProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const auditLogsRef = collection(db, "reports", reportId, "auditLogs");
                const q = query(auditLogsRef, orderBy("createdAt", "desc"), limit(100));
                const querySnapshot = await getDocs(q);
                
                const logData: AuditLog[] = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AuditLog[];

                setLogs(logData);
            } catch (error) {
                console.error("감사 로그 로드 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        loadLogs();
    }, [reportId]);

    const formatDate = (timestamp: Timestamp | Date | null): string => {
        if (!timestamp) return "-";
        
        let date: Date;
        if (timestamp instanceof Timestamp) {
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            return "-";
        }

        return date.toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    if (loading) {
        return (
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <div className="text-center text-muted-foreground py-4">
                        로딩 중...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4 md:p-6">
                <h3 className="text-lg font-semibold mb-4">활동 로그 (최근 100개)</h3>
                {logs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        활동 로그가 없습니다.
                    </div>
                ) : (
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-muted-foreground border-b">
                                    <th className="text-left p-2">시간</th>
                                    <th className="text-left p-2">사용자</th>
                                    <th className="text-left p-2">액션</th>
                                    <th className="text-left p-2">대상</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-zinc-800">
                                        <td className="p-2 text-xs">{formatDate(log.createdAt)}</td>
                                        <td className="p-2">{log.email}</td>
                                        <td className="p-2 font-medium">{log.action}</td>
                                        <td className="p-2 text-muted-foreground">{log.target || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

