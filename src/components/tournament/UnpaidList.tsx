/**
 * 🔥 미납 현황 리스트 (관리자용)
 * paymentStatus != "PAID" + dueDate <= today 필터링
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Download, Send, Copy } from "lucide-react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentApplication } from "@/types/tournament";
import { format } from "date-fns";
import { toast } from "sonner";
import { calcEntryFee, DEFAULT_FEE_POLICY } from "@/lib/notice/feeCalc";

interface UnpaidListProps {
  associationId: string;
  tournamentId: string;
  onExport?: () => void;
}

/**
 * 미납 현황 리스트 컴포넌트
 */
export function UnpaidList({
  associationId,
  tournamentId,
  onExport,
}: UnpaidListProps) {
  const [applications, setApplications] = useState<TournamentApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, [associationId, tournamentId]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      // 미납/부분납만 쿼리
      const appsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/applications`
      );
      
      // paymentStatus != "PAID" 쿼리 (Firestore는 != 연산자 지원)
      const q = query(appsRef, where("paymentStatus", "in", ["UNPAID", "PARTIAL"]));
      const snap = await getDocs(q);
      
      const apps = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as TournamentApplication[];
      
      setApplications(apps);
    } catch (error) {
      console.error("신청 목록 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReminder = (app: TournamentApplication) => {
    // MVP: 안내 문구 복사
    const message = `[${app.teamName}] 참가비 납부 안내\n\n` +
      `미납 금액: ${app.dueAmount?.toLocaleString()}원\n` +
      `납부 기한: ${app.dueDate ? format(app.dueDate.toDate?.() || new Date(app.dueDate), "yyyy-MM-dd") : "미정"}\n\n` +
      `납부 계좌 정보는 신청 시 안내된 계좌를 확인해 주세요.`;
    
    navigator.clipboard.writeText(message).then(() => {
      toast.success("안내 문구가 클립보드에 복사되었습니다.");
    }).catch(() => {
      // 클립보드 복사 실패 시 표시
      alert(message);
    });
  };

  const today = new Date();
  const overdue = applications.filter((app) => {
    if (!app.dueDate) return false;
    const due = app.dueDate.toDate?.() || new Date(app.dueDate);
    return due < today;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          로딩 중...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            미납 현황
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              엑셀 다운로드
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {applications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            미납 신청이 없습니다.
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              총 {applications.length}건 (기한 경과: {overdue.length}건)
            </div>
            {applications.map((app) => {
              const isOverdue =
                app.dueDate &&
                (app.dueDate.toDate?.() || new Date(app.dueDate)) < today;

              return (
                <div
                  key={app.id}
                  className="border rounded-md p-3 space-y-2 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{app.teamName}</div>
                    <div className="flex gap-2">
                      {isOverdue && (
                        <Badge variant="destructive">기한 경과</Badge>
                      )}
                      <Badge
                        variant={
                          app.paymentStatus === "PARTIAL"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {app.paymentStatus === "PARTIAL" ? "부분납" : "미납"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {(() => {
                      // 🔥 참가비 재계산 (feePolicySnapshot이 있으면 항상 재계산 - 단일 소스 보장)
                      const displayFee = (() => {
                        // 1. feePolicySnapshot이 있으면 항상 재계산 (우선순위 1 - 정확도 보장)
                        if (app.feePolicySnapshot && app.teamCount) {
                          const feeCalc = calcEntryFee(app.teamCount, app.feePolicySnapshot);
                          return feeCalc.total;
                        }
                        // 2. feePolicySnapshot이 없으면 기본 정책으로 재계산 (우선순위 2 - 기존 데이터 보정)
                        if (app.teamCount) {
                          const feeCalc = calcEntryFee(app.teamCount, DEFAULT_FEE_POLICY);
                          return feeCalc.total;
                        }
                        // 3. feeCalc.totalFee가 있으면 사용 (우선순위 3 - 최후 fallback)
                        if (app.feeCalc?.totalFee) {
                          return app.feeCalc.totalFee;
                        }
                        return null;
                      })();

                      return displayFee !== null ? (
                        <div>
                          참가비: {displayFee.toLocaleString()}원
                          {app.paidTotal && app.paidTotal > 0 && (
                            <> (납부: {app.paidTotal.toLocaleString()}원)</>
                          )}
                        </div>
                      ) : null;
                    })()}
                    <div>
                      미납:{" "}
                      <span className="font-semibold text-orange-600">
                        {app.dueAmount?.toLocaleString()}원
                      </span>
                    </div>
                    {app.dueDate && (
                      <div>
                        납부 기한:{" "}
                        {format(
                          app.dueDate.toDate?.() || new Date(app.dueDate),
                          "yyyy-MM-dd"
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReminder(app)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    리마인드 복사
                  </Button>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}

