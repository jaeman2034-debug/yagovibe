/**
 * 🔥 운영 로그 패널 (opLogs v1)
 * 
 * 기능:
 * - 필터 바 (타입/레벨/검색)
 * - 타임라인 리스트
 * - 상세 패널 (메타 데이터 펼치기)
 * - 원본 감사 로그 링크 (있는 경우)
 */

import { useMemo, useState } from "react";
import { useOpLogs, type OpLog, type OpLogType, type OpLogLevel } from "@/hooks/useOpLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportOpLogsToCSV } from "@/utils/exportCsv";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function iconFor(type: OpLogType): string {
  if (type === "TOURNAMENT_FINALIZED") return "🏁";
  if (type === "DRAW_EXECUTED") return "🟣";
  if (type === "MATCH_RESULT") return "🔵";
  if (type?.includes("APPLY")) return "🟢";
  if (type === "ERROR") return "🔴";
  if (type === "INVITE_REISSUED") return "🟡";
  if (type === "TEAM_LOCKED") return "🔒";
  return "📌";
}

function levelColor(level: OpLogLevel): string {
  if (level === "error") return "bg-red-100 text-red-700 border-red-200";
  if (level === "warn") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
}

function formatTimestamp(ts: any): string {
  if (!ts) return "-";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

interface OpLogsPanelProps {
  associationId: string;
  tournamentId: string;
}

export default function OpLogsPanel({
  associationId,
  tournamentId,
}: OpLogsPanelProps) {
  const [type, setType] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [qText, setQText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // 🔥 관리자 권한 확인 (조건부 실행)
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const { logs, loading } = useOpLogs({
    associationId,
    tournamentId,
    level: level || undefined,
    type: type || undefined,
    enabled: isAdmin, // 🔥 관리자만 구독
  });
  
  // 🔥 관리자가 아니면 패널 숨김
  if (!adminLoading && !isAdmin) {
    return null;
  }

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return logs;
    return logs.filter((l) => (l.message || "").toLowerCase().includes(t));
  }, [logs, qText]);

  const handleExpand = (logId: string) => {
    setExpandedId(expandedId === logId ? null : logId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5" />
          운영 로그
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          대회 운영 중 실행된 작업 내역입니다.
        </p>
      </CardHeader>
      <CardContent>
        {/* 필터 바 */}
        <div className="flex flex-wrap gap-2 items-center mb-4 pb-4 border-b">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="전체 타입" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체 타입</SelectItem>
              <SelectItem value="APPLY_SUBMITTED">신청 접수</SelectItem>
              <SelectItem value="APPLY_APPROVED">신청 승인</SelectItem>
              <SelectItem value="DRAW_EXECUTED">조 추첨</SelectItem>
              <SelectItem value="MATCH_RESULT">결과 입력</SelectItem>
              <SelectItem value="TOURNAMENT_FINALIZED">대회 종료</SelectItem>
              <SelectItem value="INVITE_REISSUED">초대 재발급</SelectItem>
              <SelectItem value="TEAM_LOCKED">팀 잠금</SelectItem>
              <SelectItem value="ERROR">에러</SelectItem>
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="전체 레벨" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체 레벨</SelectItem>
              <SelectItem value="info">info</SelectItem>
              <SelectItem value="warn">warn</SelectItem>
              <SelectItem value="error">error</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="flex-1 max-w-xs"
            placeholder="메시지 검색..."
            value={qText}
            onChange={(e) => setQText(e.target.value)}
          />

          {/* CSV 내보내기 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const filename = `tournament-op-logs-${new Date().toISOString().split("T")[0]}.csv`;
              exportOpLogsToCSV(filtered, filename);
            }}
            disabled={filtered.length === 0}
            className="flex items-center gap-2"
            title="현재 필터가 적용된 로그를 CSV로 다운로드합니다."
          >
            <Download className="w-4 h-4" />
            CSV 내보내기
          </Button>
        </div>

        {/* 로그 리스트 */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">로그가 없습니다.</div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex gap-3">
                  <div className="text-xl flex-shrink-0">{iconFor(log.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {log.message}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${levelColor(log.level)}`}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>{formatTimestamp(log.ts)}</span>
                      {log.actorRole && (
                        <span>
                          {log.actorRole} ·{" "}
                          {log.actorUid
                            ? String(log.actorUid).slice(0, 8) + "…"
                            : "-"}
                        </span>
                      )}
                    </div>

                    {/* 메타 데이터 (펼치기) */}
                    {expandedId === log.id && log.meta && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* 원본 감사 로그 링크 */}
                    {log.ref?.docId && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            // TODO: 원본 로그 페이지로 이동
                            console.log("원본 로그:", log.ref);
                          }}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          원본 보기
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* 펼치기 버튼 */}
                  {log.meta && Object.keys(log.meta).length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExpand(log.id)}
                      className="text-xs"
                    >
                      {expandedId === log.id ? "접기" : "펼치기"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
