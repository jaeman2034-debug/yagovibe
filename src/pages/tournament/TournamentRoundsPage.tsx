/**
 * 🔥 대회 라운드/경기 관리 페이지
 * 
 * 경로: /tournament/:tournamentId/rounds
 * 
 * 역할:
 * - 협회 관리자만 접근 가능
 * - 라운드 생성
 * - 경기 생성
 * - 경기 결과 기록
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import {
  createRound,
  getTournamentRounds,
  type Round,
} from "@/lib/tournament/round";
import {
  createMatch,
  getRoundMatches,
  recordMatchResult,
  getMatchResult,
  startLive,
  updateLiveScore,
  endLive,
  type Match,
  type MatchResult,
} from "@/lib/tournament/match";
import { scheduleTournament, type SchedulingMode } from "@/lib/tournament/scheduling";
import { getTournamentTeams } from "@/lib/tournament/tournamentApplication";
import { doc, getDoc, collection, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

export default function TournamentRoundsPage() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<any>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult>>({});
  
  // 새 라운드 생성 폼
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [roundOrder, setRoundOrder] = useState(1);
  
  // 새 경기 생성 폼
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  
  // 결과 입력 폼
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  
  // 자동 스케줄링
  const [showSchedulingForm, setShowSchedulingForm] = useState(false);
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("ROUND_ROBIN");
  const [tournamentTeams, setTournamentTeams] = useState<string[]>([]);
  const [schedulingStartDate, setSchedulingStartDate] = useState("");
  const [schedulingMatchesPerDay, setSchedulingMatchesPerDay] = useState(4);

  // 대회 정보 및 참가팀 목록 조회
  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const loadTournament = async () => {
      try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        const tournamentSnap = await getDoc(tournamentRef);
        if (tournamentSnap.exists()) {
          setTournament(tournamentSnap.data());
        }

        // 참가팀 목록 조회
        const teams = await getTournamentTeams(tournamentId);
        setTournamentTeams(teams);
      } catch (e) {
        console.error("대회 정보 조회 실패:", e);
      }
    };

    loadTournament();
  }, [tournamentId]);

  // 라운드 목록 조회
  useEffect(() => {
    if (!tournamentId) return;

    const loadRounds = async () => {
      try {
        const roundsList = await getTournamentRounds(tournamentId);
        setRounds(roundsList);
      } catch (e) {
        console.error("라운드 목록 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    loadRounds();
  }, [tournamentId]);

  // 선택된 라운드의 경기 목록 조회 (실시간 구독)
  useEffect(() => {
    if (!selectedRound) {
      setMatches([]);
      return;
    }

    // 실시간 구독 설정
    const q = query(
      collection(db, "matches"),
      where("roundId", "==", selectedRound),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const matchesList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Match[];

      setMatches(matchesList);

      // 각 경기의 결과 조회 (DONE인 경우만)
      const results: Record<string, MatchResult> = {};
      for (const match of matchesList) {
        if (match.status === "DONE") {
          const result = await getMatchResult(match.id);
          if (result) {
            results[match.id] = result;
          }
        }
      }
      setMatchResults(results);
    }, (error) => {
      console.error("실시간 경기 목록 구독 실패:", error);
    });

    return () => unsubscribe();
  }, [selectedRound]);

  const handleCreateRound = async () => {
    if (!tournamentId || !roundName.trim()) return;

    try {
      await createRound({
        tournamentId,
        name: roundName.trim(),
        order: roundOrder,
      });
      
      alert("라운드가 생성되었습니다.");
      setShowRoundForm(false);
      setRoundName("");
      setRoundOrder(1);
      
      // 라운드 목록 새로고침
      const roundsList = await getTournamentRounds(tournamentId);
      setRounds(roundsList);
    } catch (e: any) {
      console.error("라운드 생성 실패:", e);
      alert(e.message || "라운드 생성에 실패했습니다.");
    }
  };

  const handleCreateMatch = async () => {
    if (!selectedRound || !homeTeamId.trim() || !awayTeamId.trim() || !tournamentId) return;

    try {
      await createMatch({
        tournamentId,
        roundId: selectedRound,
        homeTeamId: homeTeamId.trim(),
        awayTeamId: awayTeamId.trim(),
      });
      
      alert("경기가 생성되었습니다.");
      setShowMatchForm(false);
      setHomeTeamId("");
      setAwayTeamId("");
      
      // 경기 목록 새로고침
      const matchesList = await getRoundMatches(selectedRound);
      setMatches(matchesList);
    } catch (e: any) {
      console.error("경기 생성 실패:", e);
      alert(e.message || "경기 생성에 실패했습니다.");
    }
  };

  const handleAutoSchedule = async () => {
    if (!tournamentId || tournamentTeams.length < 2) {
      alert("최소 2팀 이상 필요합니다.");
      return;
    }

    if (!confirm(`${tournamentTeams.length}팀으로 ${schedulingMode === "ROUND_ROBIN" ? "조별 리그" : "토너먼트"} 경기를 자동 생성하시겠습니까?`)) {
      return;
    }

    setProcessing("scheduling");
    try {
      await scheduleTournament({
        tournamentId,
        teams: tournamentTeams,
        mode: schedulingMode,
        startDate: schedulingStartDate ? new Date(schedulingStartDate) : undefined,
        matchesPerDay: schedulingMatchesPerDay,
      });

      alert("경기 일정이 자동 생성되었습니다.");
      setShowSchedulingForm(false);
      
      // 라운드 목록 새로고침
      const roundsList = await getTournamentRounds(tournamentId);
      setRounds(roundsList);
    } catch (e: any) {
      console.error("자동 스케줄링 실패:", e);
      alert(e.message || "자동 스케줄링에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleRecordResult = async (matchId: string) => {
    if (!user?.uid || processing) return;

    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      alert("올바른 점수를 입력하세요.");
      return;
    }

    setProcessing(matchId);
    try {
      await recordMatchResult({
        matchId,
        homeScore: home,
        awayScore: away,
        actorUid: user.uid,
      });
      
      alert("경기 결과가 기록되었습니다.");
      setEditingMatch(null);
      setHomeScore("");
      setAwayScore("");
      
      // 결과 새로고침
      const result = await getMatchResult(matchId);
      if (result) {
        setMatchResults(prev => ({ ...prev, [matchId]: result }));
      }
      
      // 경기 목록 새로고침
      const matchesList = await getRoundMatches(selectedRound!);
      setMatches(matchesList);
    } catch (e: any) {
      console.error("결과 기록 실패:", e);
      alert(e.message || "결과 기록에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            대회 라운드/경기 관리
            {tournament && ` - ${tournament.name}`}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSchedulingForm(!showSchedulingForm)}
              disabled={tournamentTeams.length < 2}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {showSchedulingForm ? "취소" : "자동 스케줄링"}
            </button>
            <a
              href={`/tournament/${tournamentId}/standings`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              순위표
            </a>
          </div>
        </div>

        {/* 자동 스케줄링 폼 */}
        {showSchedulingForm && (
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">자동 스케줄링</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  참가팀 ({tournamentTeams.length}팀)
                </label>
                <div className="text-xs text-gray-500">
                  {tournamentTeams.join(", ") || "참가팀이 없습니다."}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스케줄링 모드
                </label>
                <select
                  value={schedulingMode}
                  onChange={(e) => setSchedulingMode(e.target.value as SchedulingMode)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="ROUND_ROBIN">조별 리그 (라운드로빈)</option>
                  <option value="KNOCKOUT">토너먼트 (단판)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작 날짜 (선택)
                </label>
                <input
                  type="date"
                  value={schedulingStartDate}
                  onChange={(e) => setSchedulingStartDate(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  하루 최대 경기 수
                </label>
                <input
                  type="number"
                  min="1"
                  value={schedulingMatchesPerDay}
                  onChange={(e) => setSchedulingMatchesPerDay(parseInt(e.target.value) || 4)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleAutoSchedule}
                disabled={processing === "scheduling" || tournamentTeams.length < 2}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {processing === "scheduling" ? "생성 중..." : "경기 일정 자동 생성"}
              </button>
            </div>
          </div>
        )}

        {/* 라운드 생성 */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">라운드</h2>
            <button
              onClick={() => setShowRoundForm(!showRoundForm)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {showRoundForm ? "취소" : "라운드 생성"}
            </button>
          </div>

          {showRoundForm && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                placeholder="라운드 이름 (예: 조별 A, 8강)"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="순서"
                value={roundOrder}
                onChange={(e) => setRoundOrder(parseInt(e.target.value) || 1)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleCreateRound}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
              >
                생성
              </button>
            </div>
          )}

          {/* 라운드 목록 */}
          <div className="mt-4 space-y-2">
            {rounds.map(round => (
              <button
                key={round.id}
                onClick={() => setSelectedRound(round.id === selectedRound ? null : round.id)}
                className={`w-full text-left p-3 border rounded transition-colors ${
                  selectedRound === round.id
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">{round.name}</div>
                <div className="text-xs text-gray-500">순서: {round.order}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 경기 목록 및 결과 입력 */}
        {selectedRound && (
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                경기 목록 - {rounds.find(r => r.id === selectedRound)?.name}
              </h2>
              <button
                onClick={() => setShowMatchForm(!showMatchForm)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
              >
                {showMatchForm ? "취소" : "경기 생성"}
              </button>
            </div>

            {showMatchForm && (
              <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded">
                <input
                  type="text"
                  placeholder="홈팀 ID"
                  value={homeTeamId}
                  onChange={(e) => setHomeTeamId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="원정팀 ID"
                  value={awayTeamId}
                  onChange={(e) => setAwayTeamId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={handleCreateMatch}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  경기 생성
                </button>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {matches.map(match => {
                const result = matchResults[match.id];
                const isEditing = editingMatch === match.id;
                const isLive = match.status === "LIVE";
                const liveHomeScore = match.liveHomeScore ?? 0;
                const liveAwayScore = match.liveAwayScore ?? 0;

                return (
                  <div
                    key={match.id}
                    className={`p-3 border rounded ${
                      isLive ? "bg-red-50 border-red-300" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">
                            {match.homeTeamId} vs {match.awayTeamId}
                          </div>
                          {isLive && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded animate-pulse">
                              🔴 LIVE
                            </span>
                          )}
                        </div>
                        {isLive && (
                          <div className="text-2xl font-bold text-red-600 mt-2 mb-1">
                            {liveHomeScore} - {liveAwayScore}
                          </div>
                        )}
                        {result && (
                          <div className="text-sm text-gray-600 mt-1">
                            결과: {result.homeScore} - {result.awayScore}
                            {result.winnerTeamId && (
                              <span className="ml-2 text-green-600">
                                승자: {result.winnerTeamId === match.homeTeamId ? match.homeTeamId : match.awayTeamId}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          상태: {
                            match.status === "DONE" ? "완료" :
                            match.status === "LIVE" ? "진행 중" :
                            "예정"
                          }
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {match.status === "SCHEDULED" && (
                          <button
                            onClick={async () => {
                              if (!confirm("라이브를 시작하시겠습니까?")) return;
                              try {
                                await startLive(match.id);
                                alert("라이브가 시작되었습니다.");
                              } catch (e: any) {
                                alert(e.message || "라이브 시작에 실패했습니다.");
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            🔴 라이브 시작
                          </button>
                        )}
                        {match.status === "LIVE" && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMatch(match.id);
                                setHomeScore(liveHomeScore.toString());
                                setAwayScore(liveAwayScore.toString());
                              }}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              점수 수정
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm("경기를 종료하고 결과를 확정하시겠습니까?")) return;
                                if (!user?.uid) return;
                                try {
                                  await endLive({ matchId: match.id, actorUid: user.uid });
                                  alert("경기가 종료되었습니다.");
                                } catch (e: any) {
                                  alert(e.message || "경기 종료에 실패했습니다.");
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium"
                            >
                              종료
                            </button>
                          </>
                        )}
                        {match.status !== "DONE" && match.status !== "LIVE" && (
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingMatch(null);
                                setHomeScore("");
                                setAwayScore("");
                              } else {
                                setEditingMatch(match.id);
                                setHomeScore(result?.homeScore?.toString() || "");
                                setAwayScore(result?.awayScore?.toString() || "");
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            {isEditing ? "취소" : "결과 입력"}
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 p-3 bg-white rounded border space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium w-20">{match.homeTeamId}</label>
                          <input
                            type="number"
                            min="0"
                            value={homeScore}
                            onChange={(e) => setHomeScore(e.target.value)}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            placeholder="점수"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium w-20">{match.awayTeamId}</label>
                          <input
                            type="number"
                            min="0"
                            value={awayScore}
                            onChange={(e) => setAwayScore(e.target.value)}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            placeholder="점수"
                          />
                        </div>
                        <button
                          onClick={() => handleRecordResult(match.id)}
                          disabled={processing === match.id || !!processing}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {processing === match.id ? "기록 중..." : "결과 기록"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {matches.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  경기가 없습니다. 경기를 생성하세요.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
