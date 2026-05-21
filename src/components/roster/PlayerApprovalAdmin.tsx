/**
 * 🔥 사무국 선수 승인 관리 UI (실전 운영 핵심)
 * 
 * 사무국은 판단 안 함 → 시스템이 분류 → 사무국은 체크 → 승인만
 */

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getTournamentPlayers, approvePlayers, rejectPlayers, type TournamentPlayerRecord, type ApprovalStatus } from "@/lib/tournament/playerRepository";
import { useAuth } from "@/context/AuthProvider";
import { Download, CheckCircle2, XCircle, AlertCircle, Clock, History, Info } from "lucide-react";
import * as XLSX from "xlsx";
import { getJoinKfaCache, matchPlayerWithJoinKfa, type JoinKfaCache, type JoinKfaMatchStatus } from "@/lib/tournament/joinKfaCache";
import { filterAutoApproveEligiblePlayers } from "@/lib/tournament/autoApprovePlayers";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/types/tournament";

/**
 * 연령 판정 배지 (컬러 규칙)
 */
function AgeBadge({ eligible, reason }: { eligible: boolean | null; reason: string }) {
  if (eligible === true) {
    return <Badge className="bg-green-600">🟢 출전 가능</Badge>;
  }
  if (eligible === false) {
    return <Badge variant="destructive">🔴 연령 불가</Badge>;
  }
  return <Badge variant="secondary">🟡 확인 필요</Badge>;
}

/**
 * JoinKFA 매칭 배지 (실전 운영 기준)
 * 
 * 상태별 표시:
 * - verified: 🟢 인증됨 (이름 + 생년월일 일치)
 * - mismatch: 🟡 불일치 (이름만 일치, 수기 확인 필요)
 * - not_found: 🔴 없음 (등록 안 됐을 가능성)
 */
function JoinKfaBadge({ status }: { status: "verified" | "mismatch" | "not_found" }) {
  if (status === "verified") {
    return (
      <Badge className="bg-green-600 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        🟢 인증됨
      </Badge>
    );
  }
  if (status === "mismatch") {
    return (
      <Badge variant="secondary" className="bg-yellow-500 text-white flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        🟡 불일치
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="flex items-center gap-1">
      <XCircle className="w-3 h-3" />
      🔴 없음
    </Badge>
  );
}

interface PlayerApprovalAdminProps {
  associationId: string;
  tournamentId: string;
}

type FilterType = "all" | "eligible" | "ineligible" | "needsReview" | "pending" | "approved" | "rejected";

export function PlayerApprovalAdmin({
  associationId,
  tournamentId,
}: PlayerApprovalAdminProps) {
  const { user } = useAuth();
  const [players, setPlayers] = useState<TournamentPlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [joinKfaCache, setJoinKfaCache] = useState<JoinKfaCache | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [autoApproveEligible, setAutoApproveEligible] = useState<number>(0);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null); // 승인 로그 확장

  // 선수 목록, JoinKFA 캐시, 대회 정보 로드
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [playersData, cacheData, tournamentSnap] = await Promise.all([
          getTournamentPlayers(associationId, tournamentId),
          getJoinKfaCache(associationId, tournamentId),
          getDoc(doc(db, `associations/${associationId}/tournaments/${tournamentId}`)),
        ]);
        setPlayers(playersData);
        setJoinKfaCache(cacheData);
        
        if (tournamentSnap.exists()) {
          const tournamentData = { id: tournamentSnap.id, ...tournamentSnap.data() } as Tournament;
          setTournament(tournamentData);
          
          // 자동 승인 가능 선수 수 계산
          if (tournamentData.approvalRules?.autoApproveEnabled) {
            const { eligible } = filterAutoApproveEligiblePlayers(
              playersData,
              tournamentData,
              cacheData
            );
            setAutoApproveEligible(eligible.length);
          }
        }
      } catch (error: any) {
        console.error("데이터 로드 실패:", error);
        toast.error(`로드 실패: ${error.message || "알 수 없는 오류"}`);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [associationId, tournamentId]);

  // 필터링된 선수 목록
  const filteredPlayers = useMemo(() => {
    let filtered = players;

    switch (activeFilter) {
      case "eligible":
        filtered = players.filter(p => p.ageCheck.eligible === true);
        break;
      case "ineligible":
        filtered = players.filter(p => p.ageCheck.eligible === false);
        break;
      case "needsReview":
        filtered = players.filter(p => p.ageCheck.eligible === null);
        break;
      case "pending":
        filtered = players.filter(p => p.approvalStatus === "pending");
        break;
      case "approved":
        filtered = players.filter(p => p.approvalStatus === "approved");
        break;
      case "rejected":
        filtered = players.filter(p => p.approvalStatus === "rejected");
        break;
      case "all":
      default:
        filtered = players;
    }

    return filtered;
  }, [players, activeFilter]);

  // 통계
  const stats = useMemo(() => {
    return {
      all: players.length,
      eligible: players.filter(p => p.ageCheck.eligible === true).length,
      ineligible: players.filter(p => p.ageCheck.eligible === false).length,
      needsReview: players.filter(p => p.ageCheck.eligible === null).length,
      pending: players.filter(p => p.approvalStatus === "pending").length,
      approved: players.filter(p => p.approvalStatus === "approved").length,
      rejected: players.filter(p => p.approvalStatus === "rejected").length,
    };
  }, [players]);

  // 🔥 검수 완료 여부 확인 (검수 기간 종료 시)
  const isReviewCompleted = useMemo(() => {
    if (!tournament?.reviewPeriod?.endDate) return false;
    const now = new Date();
    const reviewEnd = new Date(tournament.reviewPeriod.endDate);
    reviewEnd.setHours(23, 59, 59, 999);
    return now > reviewEnd;
  }, [tournament]);

  // 체크박스 토글
  const toggleSelect = (playerId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedIds(newSelected);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPlayers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  // 일괄 승인
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) {
      return toast.error("승인할 선수를 선택해주세요.");
    }

    if (!user) {
      return toast.error("로그인이 필요합니다.");
    }

    setApproving(true);
    try {
      const result = await approvePlayers(
        associationId,
        tournamentId,
        Array.from(selectedIds)
      );

      toast.success(`승인 완료: ${result.approved}명`);
      
      // 목록 새로고침
      const data = await getTournamentPlayers(associationId, tournamentId);
      setPlayers(data);
      setSelectedIds(new Set());
      
      // 자동 승인 가능 수 재계산
      if (tournament?.approvalRules?.autoApproveEnabled) {
        const { eligible } = filterAutoApproveEligiblePlayers(
          data,
          tournament,
          joinKfaCache
        );
        setAutoApproveEligible(eligible.length);
      }
    } catch (error: any) {
      console.error("승인 실패:", error);
      toast.error(`승인 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setApproving(false);
    }
  };

  // 자동 승인 (규칙에 맞는 선수 일괄 승인)
  const handleAutoApprove = async () => {
    if (!tournament || !tournament.approvalRules?.autoApproveEnabled) {
      return toast.error("자동 승인이 활성화되어 있지 않습니다.");
    }

    if (!user) {
      return toast.error("로그인이 필요합니다.");
    }

    setApproving(true);
    try {
      const { eligible, ineligible } = filterAutoApproveEligiblePlayers(
        players.filter(p => p.approvalStatus === "pending"),
        tournament,
        joinKfaCache
      );

      if (eligible.length === 0) {
        return toast.info("자동 승인 가능한 선수가 없습니다.");
      }

      const result = await approvePlayers(
        associationId,
        tournamentId,
        eligible.map(p => p.id)
      );

      toast.success(`자동 승인 완료: ${result.approved}명 (${ineligible.length}명은 규칙 미부합으로 제외)`);
      
      // 목록 새로고침
      const data = await getTournamentPlayers(associationId, tournamentId);
      setPlayers(data);
      setSelectedIds(new Set());
      
      // 자동 승인 가능 수 재계산
      const { eligible: newEligible } = filterAutoApproveEligiblePlayers(
        data,
        tournament,
        joinKfaCache
      );
      setAutoApproveEligible(newEligible.length);
    } catch (error: any) {
      console.error("자동 승인 실패:", error);
      toast.error(`자동 승인 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setApproving(false);
    }
  };

  // 일괄 반려
  const handleBatchReject = async () => {
    if (selectedIds.size === 0) {
      return toast.error("반려할 선수를 선택해주세요.");
    }

    if (!rejectReason.trim()) {
      return toast.error("반려 사유는 필수입니다.");
    }

    if (!user) {
      return toast.error("로그인이 필요합니다.");
    }

    setApproving(true);
    try {
      const result = await rejectPlayers(
        associationId,
        tournamentId,
        Array.from(selectedIds),
        rejectReason.trim()
      );

      toast.success(`반려 완료: ${result.rejected}명`);
      
      // 목록 새로고침
      const data = await getTournamentPlayers(associationId, tournamentId);
      setPlayers(data);
      setSelectedIds(new Set());
      setRejectDialogOpen(false);
      setRejectReason("");
      
      // 자동 승인 가능 수 재계산
      if (tournament?.approvalRules?.autoApproveEnabled) {
        const { eligible } = filterAutoApproveEligiblePlayers(
          data,
          tournament,
          joinKfaCache
        );
        setAutoApproveEligible(eligible.length);
      }
    } catch (error: any) {
      console.error("반려 실패:", error);
      toast.error(`반려 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setApproving(false);
    }
  };

  // 엑셀 다운로드 (연령별 시트 분리)
  const handleExportExcel = () => {
    if (players.length === 0) {
      return toast.error("다운로드할 데이터가 없습니다.");
    }

    const wb = XLSX.utils.book_new();

    // 전체 선수 데이터 변환 (JoinKFA 매칭 포함)
    const allRows = players.map(p => {
      const joinKfaMatch = joinKfaCache
        ? matchPlayerWithJoinKfa(
            p.name,
            p.birthDateISO || p.birthDateRaw,
            p.birthYear || undefined,
            joinKfaCache
          )
        : { status: "not_found" as const, reason: "JoinKFA 캐시 없음" };
      
      // JoinKFA 상태 텍스트 변환
      const joinKfaStatusText = joinKfaMatch.status === "verified" 
        ? "🟢 인증됨" 
        : joinKfaMatch.status === "mismatch" 
        ? "🟡 불일치" 
        : "🔴 없음";
      
      return {
        팀명: p.teamName,
        이름: p.name,
        생년월일_원문: p.birthDateRaw,
        생년월일_정규화: p.birthDateISO || "",
        출생연도: p.birthYear || "",
        포지션: p.position || "",
        연락처: p.phone || "",
        등번호: p.jerseyNo || "",
        연령판정: p.ageCheck.eligible === true ? "가능" : p.ageCheck.eligible === false ? "불가" : "확인필요",
        판정사유: p.ageCheck.reason,
        JoinKFA상태: joinKfaStatusText,
        JoinKFA등록번호: joinKfaMatch.joinKfaPlayer?.joinKfaId || "",
        JoinKFA불일치사유: joinKfaMatch.reason || "",
        승인상태: p.approvalStatus === "pending" ? "대기" : p.approvalStatus === "approved" ? "승인됨" : "반려",
        승인일시: p.approvedAt ? (p.approvedAt as any).toDate?.().toLocaleString("ko-KR") || "" : "",
        비고: p.memo || "",
      };
    });

    // 요약 시트
    const summary = [
      { 항목: "전체 선수", 값: stats.all },
      { 항목: "🟢 출전 가능", 값: stats.eligible },
      { 항목: "🔴 연령 불가", 값: stats.ineligible },
      { 항목: "🟡 확인 필요", 값: stats.needsReview },
      { 항목: "승인 대기", 값: stats.pending },
      { 항목: "✅ 승인됨", 값: stats.approved },
      { 항목: "❌ 반려", 값: stats.rejected },
      { 항목: "생성일시", 값: new Date().toLocaleString("ko-KR") },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "요약");

    // 연령별 시트
    const eligible = allRows.filter(r => r.연령판정 === "가능");
    const ineligible = allRows.filter(r => r.연령판정 === "불가");
    const needsReview = allRows.filter(r => r.연령판정 === "확인필요");

    if (eligible.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eligible), "출전가능");
    }
    if (ineligible.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ineligible), "연령불가");
    }
    if (needsReview.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(needsReview), "확인필요");
    }

    // 승인 상태별 시트
    const pending = allRows.filter(r => r.승인상태 === "대기");
    const approved = allRows.filter(r => r.승인상태 === "승인됨");
    const rejected = allRows.filter(r => r.승인상태 === "반려");

    if (pending.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pending), "승인대기");
    }
    if (approved.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(approved), "승인됨");
    }
    if (rejected.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rejected), "반려");
    }

    // 전체 시트
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allRows), "전체");

    // 파일명: 대회명_선수명단_YYYYMMDD.xlsx
    const fileName = `선수명단_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("엑셀 파일이 다운로드되었습니다.");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          선수 목록을 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  // 승인 로그 포맷팅
  const formatApprovalLog = (log: TournamentPlayerRecord["approvalLog"]) => {
    if (!log || log.length === 0) return [];
    return log
      .slice()
      .sort((a, b) => {
        const aTime = a.at?.toDate?.() || new Date(a.at as any);
        const bTime = b.at?.toDate?.() || new Date(b.at as any);
        return bTime.getTime() - aTime.getTime(); // 최신순
      });
  };

  return (
    <div className="space-y-4">
      {/* 🔥 검수 완료 후 승인 결과 요약 카드 (5️⃣) */}
      {isReviewCompleted && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              검수 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-gray-900">{stats.all}</p>
                <p className="text-sm text-muted-foreground mt-1">총 신청 선수 수</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-sm text-muted-foreground mt-1">승인 선수 수</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground mt-1">반려 선수 수</p>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 flex items-center gap-2">
                <Info className="w-4 h-4" />
                안내 문구
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                승인된 선수만 대회 출전이 가능합니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>선수 승인 관리</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {isReviewCompleted 
                  ? "검수 기간이 종료되었습니다. 승인 결과를 확인하세요."
                  : "시스템이 자동 분류한 결과를 확인하고 승인하세요. 🟢 출전 가능은 바로 체크, 🟡 확인 필요만 집중 확인하세요."}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={players.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              엑셀 다운로드
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline">전체 {stats.all}</Badge>
            <Badge className="bg-green-600">🟢 가능 {stats.eligible}</Badge>
            <Badge variant="destructive">🔴 불가 {stats.ineligible}</Badge>
            <Badge variant="secondary">🟡 확인필요 {stats.needsReview}</Badge>
            <Badge>승인대기 {stats.pending}</Badge>
            <Badge variant="default" className="bg-green-600">✅ 승인됨 {stats.approved}</Badge>
            <Badge variant="destructive">❌ 반려 {stats.rejected}</Badge>
          </div>

          {/* 자동 승인 버튼 */}
          {tournament?.approvalRules?.autoApproveEnabled && autoApproveEligible > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-green-900">
                  자동 승인 가능: {autoApproveEligible}명
                </span>
                <p className="text-xs text-green-700 mt-1">
                  승인 규칙에 부합하는 선수를 자동으로 승인합니다.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleAutoApprove}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700"
              >
                {approving ? "승인 중..." : `자동 승인 (${autoApproveEligible}명)`}
              </Button>
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size}명 선택됨
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleBatchApprove}
                  disabled={approving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approving ? "승인 중..." : `선택한 ${selectedIds.size}명 승인`}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectDialogOpen(true)}
                  disabled={approving}
                >
                  {approving ? "처리 중..." : `선택한 ${selectedIds.size}명 반려`}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  선택 해제
                </Button>
              </div>
            </div>
          )}

          {/* 반려 사유 입력 다이얼로그 */}
          {rejectDialogOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-none md:max-w-3xl space-y-4">
                <h3 className="text-lg font-semibold">선수 반려</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedIds.size}명의 선수를 반려합니다. 반려 사유를 입력해주세요.
                </p>
                <textarea
                  className="w-full border rounded-lg p-3 min-h-[100px]"
                  placeholder="반려 사유 (필수)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectDialogOpen(false);
                      setRejectReason("");
                    }}
                  >
                    취소
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleBatchReject}
                    disabled={!rejectReason.trim() || approving}
                  >
                    {approving ? "반려 중..." : "반려 확인"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as FilterType)}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="eligible">🟢 가능</TabsTrigger>
              <TabsTrigger value="ineligible">🔴 불가</TabsTrigger>
              <TabsTrigger value="needsReview">🟡 확인필요</TabsTrigger>
              <TabsTrigger value="pending">승인대기</TabsTrigger>
              <TabsTrigger value="approved">승인됨</TabsTrigger>
              <TabsTrigger value="rejected">반려</TabsTrigger>
            </TabsList>

            <TabsContent value={activeFilter} className="mt-4">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  해당 상태의 선수가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
                    <Checkbox
                      checked={
                        filteredPlayers.length > 0 &&
                        filteredPlayers.filter(p => p.approvalStatus !== "approved").every(p => selectedIds.has(p.id))
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      전체 선택 ({filteredPlayers.filter(p => p.approvalStatus !== "approved").length}명)
                    </span>
                  </div>

                  <div className="rounded-lg border overflow-auto">
                    <table className="min-w-[800px] w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 w-12"></th>
                          <th className="p-2 text-left">팀명</th>
                          <th className="p-2 text-left">이름</th>
                          <th className="p-2 text-left">출생연도</th>
                          <th className="p-2 text-left">생년월일</th>
                          <th className="p-2 text-left">포지션</th>
                          <th className="p-2 text-left">연령 판정</th>
                          <th className="p-2 text-left">JoinKFA</th>
                          <th className="p-2 text-left">승인 상태</th>
                          <th className="p-2 text-left">승인 로그</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayers.map((player) => {
                          const isSelected = selectedIds.has(player.id);
                          const isApproved = player.approvalStatus === "approved";
                          const isExpanded = expandedPlayerId === player.id;
                          const approvalLogs = formatApprovalLog(player.approvalLog);
                          const joinKfaMatch = joinKfaCache
                            ? matchPlayerWithJoinKfa(
                                player.name,
                                player.birthDateISO || player.birthDateRaw,
                                player.birthYear || undefined,
                                joinKfaCache
                              )
                            : { status: "not_found" as const, reason: "JoinKFA 캐시 없음" };
                          
                          return (
                            <>
                              <tr
                                key={player.id}
                                className={`border-t ${
                                  isSelected ? "bg-blue-50 border-blue-200" : ""
                                } ${isApproved ? "opacity-60" : ""}`}
                              >
                                <td className="p-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelect(player.id)}
                                    disabled={isApproved || isReviewCompleted}
                                  />
                                </td>
                                <td className="p-2 font-medium">{player.teamName}</td>
                                <td className="p-2">{player.name}</td>
                                <td className="p-2">{player.birthYear ?? "-"}</td>
                                <td className="p-2 text-xs text-muted-foreground">
                                  {player.birthDateISO || player.birthDateRaw || "-"}
                                </td>
                                <td className="p-2">{player.position || "-"}</td>
                                <td className="p-2">
                                  <AgeBadge
                                    eligible={player.ageCheck.eligible}
                                    reason={player.ageCheck.reason}
                                  />
                                </td>
                                <td className="p-2">
                                  <JoinKfaBadge status={joinKfaMatch.status} />
                                  {joinKfaMatch.reason && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {joinKfaMatch.reason}
                                    </p>
                                  )}
                                </td>
                                <td className="p-2">
                                  {player.approvalStatus === "pending" && (
                                    <Badge variant="outline">대기</Badge>
                                  )}
                                  {player.approvalStatus === "approved" && (
                                    <Badge className="bg-green-600">✅ 승인됨</Badge>
                                  )}
                                  {player.approvalStatus === "rejected" && (
                                    <Badge variant="destructive">❌ 반려</Badge>
                                  )}
                                </td>
                                <td className="p-2">
                                  {approvalLogs.length > 0 ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setExpandedPlayerId(isExpanded ? null : player.id)}
                                      className="flex items-center gap-1"
                                    >
                                      <History className="w-3 h-3" />
                                      로그 ({approvalLogs.length})
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </td>
                              </tr>
                              {/* 🔥 승인 로그 확장 행 (6️⃣) */}
                              {isExpanded && approvalLogs.length > 0 && (
                                <tr className="bg-muted/30">
                                  <td colSpan={10} className="p-4">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        승인 로그
                                      </p>
                                      {approvalLogs.map((log, idx) => {
                                        const logTime = log.at?.toDate?.() || new Date(log.at as any);
                                        const actionText = log.action === "approved" 
                                          ? "✅ 승인" 
                                          : log.action === "rejected" 
                                          ? "❌ 반려" 
                                          : "⏳ 대기";
                                        return (
                                          <div key={idx} className="pl-6 p-2 bg-white rounded border text-sm">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <Badge variant={log.action === "approved" ? "default" : log.action === "rejected" ? "destructive" : "secondary"}>
                                                  {actionText}
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                  {log.byName || log.byUid || "시스템"}
                                                </span>
                                              </div>
                                              <span className="text-xs text-muted-foreground">
                                                {logTime.toLocaleString("ko-KR")}
                                              </span>
                                            </div>
                                            {log.reason && (
                                              <p className="text-xs text-muted-foreground mt-1 ml-12">
                                                사유: {log.reason}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

