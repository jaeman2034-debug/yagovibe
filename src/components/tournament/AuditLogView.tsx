/**
 * 🔥 FINAL+ 단계: 결과 수정 감사 로그 뷰
 * 
 * 경기 결과 수정 이력을 표시하는 컴포넌트
 * - 운영 신뢰도 향상
 * - 분쟁 차단
 */

import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface AuditLog {
  id: string;
  type: string;
  matchId: string;
  matchStage?: string;
  before: {
    homeScore?: number;
    awayScore?: number;
    status?: string;
    winner?: string;
    winnerTeamId?: string;
  };
  after: {
    homeScore?: number;
    awayScore?: number;
    status?: string;
    winner?: string;
    winnerTeamId?: string;
  };
  updatedBy: string;
  updatedAt: any;
  metadata?: {
    associationId?: string;
    tournamentId?: string;
    homeTeamId?: string;
    awayTeamId?: string;
    divisionNumber?: number;
    round?: number;
    matchNo?: number;
  };
}

interface AuditLogViewProps {
  associationId: string;
  tournamentId: string;
}

export function AuditLogView({
  associationId,
  tournamentId,
}: AuditLogViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !tournamentId) {
      setLoading(false);
      return;
    }

    const auditLogsRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournamentId}/auditLogs`
    );

    const unsubscribe = onSnapshot(
      query(auditLogsRef, orderBy("updatedAt", "desc"), limit(50)),
      (snapshot) => {
        const logsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AuditLog[];

        setLogs(logsData);
        setLoading(false);
      },
      (error) => {
        console.error("[감사 로그 조회 오류]", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId, tournamentId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">감사 로그를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📋 결과 수정 이력</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-gray-500">
          아직 수정 이력이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 결과 수정 이력</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => {
            const updatedAt = log.updatedAt?.toDate
              ? log.updatedAt.toDate()
              : new Date(log.updatedAt);

            const scoreChanged =
              log.before.homeScore !== log.after.homeScore ||
              log.before.awayScore !== log.after.awayScore;

            return (
              <div
                key={log.id}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {log.type === "MATCH_RESULT_UPDATE" ? "경기 결과 수정" : log.type}
                    </Badge>
                    {log.matchStage === "KNOCKOUT" && log.metadata?.round && (
                      <Badge variant="secondary" className="text-xs">
                        {log.metadata.round === 1
                          ? "1라운드"
                          : log.metadata.round === 2
                          ? "8강"
                          : log.metadata.round === 3
                          ? "4강"
                          : log.metadata.round === 4
                          ? "준결승"
                          : "결승"}
                      </Badge>
                    )}
                    {log.matchStage === "GROUP" && log.metadata?.divisionNumber && (
                      <Badge variant="secondary" className="text-xs">
                        조 {log.metadata.divisionNumber}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(updatedAt, "yyyy-MM-dd HH:mm:ss", { locale: ko })}
                  </span>
                </div>

                {scoreChanged && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-700">점수 변경:</div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">변경 전:</span>
                        <span className="font-mono">
                          {log.before.homeScore ?? "-"} : {log.before.awayScore ?? "-"}
                        </span>
                      </div>
                      <span className="text-gray-400">→</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">변경 후:</span>
                        <span className="font-mono font-semibold text-green-600">
                          {log.after.homeScore ?? "-"} : {log.after.awayScore ?? "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {log.before.status !== log.after.status && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">상태 변경: </span>
                    <span className="font-semibold">
                      {log.before.status ?? "-"} → {log.after.status ?? "-"}
                    </span>
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  수정자: {log.updatedBy}
                  {log.metadata?.matchNo && ` | 경기 ${log.metadata.matchNo}`}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
