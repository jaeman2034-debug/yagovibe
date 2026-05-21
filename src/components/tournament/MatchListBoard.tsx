/**
 * 🔥 STEP 7: 경기 목록 및 스코어 입력 보드 (관리자/참가자용)
 * 
 * 경기 목록 조회, 필터링, 스코어 입력 (관리자만)
 */

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { Search, Play, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { Tournament, MatchOps } from "@/types/tournament";

interface MatchListBoardProps {
  associationId: string;
  tournament: Tournament;
  isAdmin: boolean;
  onOpenScoreDialog?: (match: MatchOps) => void; // 외부에서 스코어 입력 다이얼로그 열기
}

export function MatchListBoard({
  associationId,
  tournament,
  isAdmin,
  onOpenScoreDialog: externalOnOpenScoreDialog,
}: MatchListBoardProps) {
  const [matches, setMatches] = useState<MatchOps[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [divisionFilter, setDivisionFilter] = useState<number | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedMatch, setSelectedMatch] = useState<MatchOps | null>(null);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  // 🔥 경기 결과 입력 가능 여부
  const canSubmitResult = tournament.tournamentPhase === "MATCHES_RUNNING" && isAdmin;

  // 🔥 경기 목록 조회
  useEffect(() => {
    if (!associationId || !tournament.id) {
      setLoading(false);
      return;
    }

    const matchesRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournament.id}/matches`
    );

    // 실시간 구독 (토너먼트와 조별 리그 모두 포함)
    // 주의: Firestore는 여러 orderBy에 인덱스가 필요할 수 있으므로, 클라이언트에서 정렬
    const unsubscribe = onSnapshot(
      matchesRef,
      (snapshot) => {
        const matchesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MatchOps[];

        // 클라이언트에서 정렬 (토너먼트 우선, 그 다음 조별 리그)
        matchesData.sort((a, b) => {
          // 1. stage 순서 (GROUP 먼저, KNOCKOUT 나중에)
          const stageOrder = { GROUP: 1, KNOCKOUT: 2 };
          const aStage = stageOrder[a.stage || "GROUP"] || 1;
          const bStage = stageOrder[b.stage || "GROUP"] || 1;
          if (aStage !== bStage) return aStage - bStage;

          // 2. 토너먼트: round → matchNo
          if (a.stage === "KNOCKOUT" && b.stage === "KNOCKOUT") {
            if (a.round !== b.round) return (a.round || 0) - (b.round || 0);
            return (a.matchNo || 0) - (b.matchNo || 0);
          }

          // 3. 조별 리그: divisionNumber → date → startTime
          if (a.divisionNumber !== b.divisionNumber) {
            return (a.divisionNumber || 0) - (b.divisionNumber || 0);
          }
          if (a.date !== b.date) {
            return (a.date || "").localeCompare(b.date || "");
          }
          return (a.startTime || "").localeCompare(b.startTime || "");
        });

        setMatches(matchesData);
        setLoading(false);
      },
      (error) => {
        console.error("[경기 목록 조회 오류]", error);
        toast.error("경기 목록을 불러오는데 실패했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId, tournament.id]);

  // 🔥 조 목록 추출
  const divisions = useMemo(() => {
    const divisionSet = new Set<number>();
    matches.forEach((match) => {
      if (match.divisionNumber) {
        divisionSet.add(match.divisionNumber);
      }
    });
    return Array.from(divisionSet).sort((a, b) => a - b);
  }, [matches]);

  // 🔥 필터링된 경기 목록
  const filteredMatches = useMemo(() => {
    let filtered = matches;

    // 조 필터 (조별 리그만)
    if (divisionFilter !== "ALL") {
      filtered = filtered.filter(
        (match) => match.stage === "GROUP" && match.divisionNumber === divisionFilter
      );
    }

    // 상태 필터
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((match) => match.status === statusFilter);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (match) =>
          match.homeTeam?.toLowerCase().includes(query) ||
          match.awayTeam?.toLowerCase().includes(query) ||
          match.divisionNumber?.toString().includes(query) ||
          (match.stage === "KNOCKOUT" && match.round?.toString().includes(query))
      );
    }

    return filtered;
  }, [matches, divisionFilter, statusFilter, searchQuery]);

  // 🔥 스코어 입력 다이얼로그 열기
  const handleOpenScoreDialog = (match: MatchOps) => {
    setSelectedMatch(match);
    setHomeScore(match.score?.home?.toString() || "");
    setAwayScore(match.score?.away?.toString() || "");
    setShowScoreDialog(true);
    // 외부 콜백도 호출
    if (externalOnOpenScoreDialog) {
      externalOnOpenScoreDialog(match);
    }
  };

  // 🔥 스코어 제출
  const handleSubmitScore = async () => {
    if (!selectedMatch) return;

    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      toast.error("점수는 0 이상의 정수여야 합니다.");
      return;
    }

    try {
      setSubmitting(selectedMatch.id);
      const functions = getFunctions(app, "asia-northeast3");
      const submitResult = httpsCallable(functions, "submitMatchResultCallable");

      await submitResult({
        associationId,
        tournamentId: tournament.id,
        matchId: selectedMatch.id,
        homeScore: home,
        awayScore: away,
      });

      toast.success("경기 결과가 입력되었습니다.");
      setShowScoreDialog(false);
      setSelectedMatch(null);
    } catch (error: any) {
      console.error("[스코어 입력] 실패:", error);
      toast.error(error?.message || "경기 결과 입력에 실패했습니다.");
    } finally {
      setSubmitting(null);
    }
  };

  // 🔥 상태별 배지
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "END":
      case "completed":
        return <Badge className="bg-green-100 text-green-800">완료</Badge>;
      case "LIVE":
      case "in_progress":
        return <Badge className="bg-red-100 text-red-800">진행중</Badge>;
      case "WAIT":
      case "scheduled":
        return <Badge className="bg-gray-100 text-gray-800">예정</Badge>;
      case "CANCELLED":
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">취소</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">경기 목록을 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>⚽ 경기 목록</span>
          <div className="flex gap-2">
            {hasKnockoutMatches && (
              <Badge variant="default" className="bg-purple-100 text-purple-800">
                토너먼트
              </Badge>
            )}
            <Badge variant="outline">
              총 {matches.length}경기 / 완료 {matches.filter((m) => m.status === "END" || m.status === "completed").length}경기
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
        <CardContent className="space-y-4">
          {/* 필터 및 검색 */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="팀명, 조, 라운드 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 min-h-[44px] touch-manipulation"
                inputMode="search"
              />
            </div>
            {!hasKnockoutMatches && (
              <Select
                value={divisionFilter === "ALL" ? "ALL" : divisionFilter.toString()}
                onValueChange={(v) => setDivisionFilter(v === "ALL" ? "ALL" : parseInt(v))}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue placeholder="조" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">전체 조</SelectItem>
                  {divisions.map((div) => (
                    <SelectItem key={div} value={div.toString()}>
                      조 {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="WAIT">예정</SelectItem>
                <SelectItem value="LIVE">진행중</SelectItem>
                <SelectItem value="END">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 경기 리스트 */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredMatches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery || divisionFilter !== "ALL" || statusFilter !== "ALL"
                  ? "검색 결과가 없습니다."
                  : "경기가 없습니다."}
              </div>
            ) : (
              filteredMatches.map((match) => {
                const hasScore = match.score && (match.score.home !== undefined || match.score.away !== undefined);
                const isCompleted = match.status === "END" || match.status === "completed";

                return (
                  <div
                    key={match.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {match.stage === "KNOCKOUT" && match.round ? (
                            <Badge variant="outline" className="text-xs">
                              {match.round === 1 ? "1라운드" : match.round === 2 ? "8강" : match.round === 3 ? "4강" : match.round === 4 ? "준결승" : "결승"}
                            </Badge>
                          ) : match.divisionNumber ? (
                            <Badge variant="outline" className="text-xs">
                              조 {match.divisionNumber}
                            </Badge>
                          ) : null}
                          {match.isBye && (
                            <Badge variant="secondary" className="text-xs">
                              BYE
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {match.date} {match.startTime}
                          </span>
                          {getStatusBadge(match.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className={`truncate ${match.score && match.score.home > match.score.away ? "text-green-600 font-bold" : ""}`}>
                            {match.homeTeam}
                          </span>
                          {hasScore ? (
                            <span className="text-2xl font-bold shrink-0">
                              {match.score?.home} : {match.score?.away}
                            </span>
                          ) : (
                            <span className="text-gray-400 shrink-0">vs</span>
                          )}
                          <span className={`truncate ${match.score && match.score.away > match.score.home ? "text-green-600 font-bold" : ""}`}>
                            {match.awayTeam}
                          </span>
                        </div>
                        {match.venueId && (
                          <p className="text-xs text-gray-500 mt-1">
                            {match.venueId} {match.courtNo}코트
                          </p>
                        )}
                      </div>

                      {/* 스코어 입력 버튼 (퀵 액션) */}
                      {canSubmitResult && (
                        <Button
                          size="sm"
                          variant={isCompleted ? "outline" : "default"}
                          onClick={() => {
                            // 🔥 FINAL+ 단계: 수정 모드 확인
                            if (isCompleted && tournament.resultEditEnabled !== true) {
                              toast.error("결과 수정 모드가 비활성화되어 있습니다. 관리자에게 문의하세요.");
                              return;
                            }
                            handleOpenScoreDialog(match);
                          }}
                          disabled={submitting === match.id}
                          className="min-h-[44px] touch-manipulation shrink-0"
                        >
                          {submitting === match.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : hasScore ? (
                            "수정"
                          ) : (
                            "입력"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 스코어 입력 다이얼로그 */}
      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>경기 결과 입력</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <>
                  조 {selectedMatch.divisionNumber} - {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeScore">{selectedMatch?.homeTeam} (홈)</Label>
              <Input
                id="homeScore"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="0"
                className="text-center text-lg min-h-[44px] text-2xl font-bold"
              />
              </div>
              <div className="space-y-2">
                <Label htmlFor="awayScore">{selectedMatch?.awayTeam} (원정)</Label>
                <Input
                  id="awayScore"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  placeholder="0"
                  className="text-center text-lg min-h-[44px] text-2xl font-bold"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoreDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmitScore}
              disabled={submitting !== null || !homeScore || !awayScore}
              className="min-h-[44px] touch-manipulation"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
