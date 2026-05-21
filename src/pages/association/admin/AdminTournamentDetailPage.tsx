/**
 * Tournament 관리 페이지 (Admin 전용)
 * /association/:associationId/admin/tournaments/:tournamentId
 * 
 * 기능:
 * - RegistrationToggle
 * - FeeConfirmToggle
 * - RosterLockToggle
 * - BracketUpload
 * - ConfirmBracketButton
 * - DisciplineLogViewer
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, serverTimestamp, where, writeBatch, runTransaction, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";
import type { Tournament, EntryStatus, DisciplineLog } from "@/types/tournament";
import { BracketConfirmButton } from "@/components/association/tournament/BracketConfirmButton";
import { logAdminAction } from "@/lib/logAdminAction";
import { DrawExecuteButton } from "@/components/tournament/DrawExecuteButton";
import { DrawResultDisplay } from "@/components/tournament/DrawResultDisplay";
import { GenerateMatchesButton } from "@/components/tournament/GenerateMatchesButton";
import { TestTeamGenerator } from "@/components/tournament/TestTeamGenerator";
import { MatchCard } from "@/components/tournament/MatchCard";
import { AgeGroupTabs } from "@/components/tournament/AgeGroupTabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateDrawSystem1PagePdf } from "@/utils/drawSystem1PagePdf";
import { generateOfficialLetterToGuOfficePdf } from "@/utils/officialLetterToGuOfficePdf";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Clock, Download, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { buildTournamentReport } from "@/utils/tournamentReport";
import MatchResultEditor from "@/components/admin/MatchResultEditor";
import { useTournamentMatches } from "@/hooks/useTournamentMatches";
import { useTournamentLogs } from "@/hooks/useTournamentLogs";
import { useTournamentTeamsSnapshot } from "@/hooks/useTournamentTeamsSnapshot";
import { writeTournamentLog } from "@/utils/writeTournamentLog";
import { TeamsSnapshotModal } from "@/components/tournament/TeamsSnapshotModal";
import OpLogsPanel from "@/components/tournament/OpLogsPanel";
import { RosterControlPanel } from "@/components/tournament/RosterControlPanel";
import { TeamCheckinBoard } from "@/components/tournament/TeamCheckinBoard";
import { MatchListBoard } from "@/components/tournament/MatchListBoard";
import { KnockoutBracketView } from "@/components/tournament/KnockoutBracketView";
import { AuditLogView } from "@/components/tournament/AuditLogView";
import { ResultEditModeToggle } from "@/components/tournament/ResultEditModeToggle";
import { toast } from "sonner";

export default function AdminTournamentDetailPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useIsAssociationAdmin(associationId);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disciplineLogs, setDisciplineLogs] = useState<DisciplineLog[]>([]);
  const [showDateEdit, setShowDateEdit] = useState(false);
  const [approvedTeamCount, setApprovedTeamCount] = useState<number>(0);
  const [totalTeamCount, setTotalTeamCount] = useState<number>(0);
  const [generatingMatches, setGeneratingMatches] = useState(false);
  const [rounds, setRounds] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectingWinner, setSelectingWinner] = useState<string | null>(null);
  const [ageGroup, setAgeGroup] = useState<string>("20_30");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [report, setReport] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showTeamsView, setShowTeamsView] = useState(false); // 🔥 팀 보기 모달 상태

  // 🔥 운영 로그 실시간 구독 (Firestore에서 로드)
  const { logs: firestoreLogs, loading: logsLoading } = useTournamentLogs(
    associationId,
    tournament?.id
  );

  // 🔥 참가팀 스냅샷 실시간 구독 (Hook 사용)
  const { teams: teamsSnapshot, loading: teamsSnapshotLoading } = useTournamentTeamsSnapshot(
    associationId,
    tournament?.id
  );

  // 🔥 teams 컬렉션 실시간 구독 (승인된 팀 수 자동 업데이트)
  useEffect(() => {
    if (!associationId || !tournament?.id) {
      setApprovedTeamCount(0);
      setTotalTeamCount(0);
      return;
    }

    const teamsRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournament.id}/teams`
    );
    const teamsQuery = query(teamsRef, where("status", "in", ["pending", "approved", "rejected"]));
    
    // 🔥 onSnapshot 동적 import (타입 에러 방지)
    import("firebase/firestore").then(({ onSnapshot }) => {
      const unsubscribe = onSnapshot(
        teamsQuery,
        (snapshot: any) => {
          const total = snapshot.size;
          const approved = snapshot.docs.filter((d: any) => d.data().status === "approved").length;
          
          setTotalTeamCount(total);
          setApprovedTeamCount(approved);
          
          console.log("[참가팀 수 실시간 업데이트]", {
            전체_팀: total,
            승인_팀: approved,
            팀_목록: snapshot.docs.map((d: any) => ({
              id: d.id,
              name: d.data().teamName,
              status: d.data().status,
            })),
          });
        },
        (error: any) => {
          console.error("[참가팀 수 구독 오류]", error);
        }
      );

      return () => unsubscribe();
    });
  }, [associationId, tournament?.id]);

  // 🔥 로그 타입별 스타일 매핑
  const LOG_STYLE: Record<string, { icon: string; className: string }> = {
    MATCH_AUTO_GENERATED: {
      icon: "🟢",
      className: "text-green-700",
    },
    MATCH_RESULT: {
      icon: "🔵",
      className: "text-blue-700",
    },
    MATCH_RESULT_UNDO: {
      icon: "↩",
      className: "text-orange-700",
    },
    TOURNAMENT_FINISHED: {
      icon: "🟣",
      className: "text-purple-700 font-semibold",
    },
  };

  // 🔥 UI 표시용 로그 (Firestore 로그를 포맷팅, 타입 정보 유지)
  const formattedLogs = firestoreLogs
    .filter((log: any) => log.createdAt) // createdAt이 있는 것만 (실제 저장된 것)
    .map((log: any) => {
      const timeStr = log.createdAt?.toDate
        ? log.createdAt.toDate().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
      const style = LOG_STYLE[log.type] || { icon: "⚪", className: "text-gray-700" };
      return {
        id: log.id,
        timeStr,
        message: log.message || "",
        type: log.type,
        style,
      };
    });

  // 🔥 로그 추가 함수 (UI 즉시 반영용 - deprecated, Firestore 로그 사용)
  const addLog = (message: string) => {
    // 이 함수는 이제 사용하지 않지만, GenerateMatchesButton의 onLog prop 호환성을 위해 유지
    // 실제 로그는 writeTournamentLog로 Firestore에 저장되고, useTournamentLogs가 실시간으로 불러옴
  };

  // 🔥 팀 보기 모달 열기
  const handleOpenTeamsView = () => {
    setShowTeamsView(true);
  };

  // 🔥 실운영 모드 전환 함수
  const handleSwitchToLiveMode = async () => {
    if (!associationId || !tournament?.id) return;

    // 위험 액션 Confirm UX
    if (!window.confirm("실운영 모드로 전환하면 Undo 기능이 차단됩니다. 계속하시겠습니까?")) {
      return;
    }

    try {
      const tournamentRef = doc(
        db,
        "associations",
        associationId,
        "tournaments",
        tournament.id
      );

      await updateDoc(tournamentRef, {
        mode: "live",
        liveStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 실운영 모드 전환 로그
      await writeTournamentLog({
        associationId,
        tournamentId: tournament.id,
        type: "MODE_SWITCH",
        message: "🚀 실운영 모드로 전환됨",
        actor: "admin",
      });

      // tournament 상태 업데이트 (UI 즉시 반영)
      setTournament({ ...tournament, mode: "live" } as any);

      alert("실운영 모드로 전환되었습니다.");
    } catch (error: any) {
      console.error("실운영 모드 전환 오류:", error);
      alert(`모드 전환 실패: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 🔥 CSV Export 함수
  const handleExportCSV = () => {
    if (!tournament) return;

    // 대회 종료 상태 체크
    if ((tournament as any).status !== "completed") {
      alert("대회 종료 후 결과를 다운로드할 수 있습니다.");
      return;
    }

    try {
      // CSV 헤더
      const headers = ["Round", "Match", "HomeTeam", "AwayTeam", "Winner"];
      
      // 경기 데이터 정렬 및 변환
      const sortedMatches = [...matches].sort((a, b) => {
        // roundNumber 먼저 정렬
        if ((a.roundNumber || 0) !== (b.roundNumber || 0)) {
          return (a.roundNumber || 0) - (b.roundNumber || 0);
        }
        // 같은 라운드면 matchIndex로 정렬
        return (a.matchIndex || 0) - (b.matchIndex || 0);
      });

      const rows = sortedMatches.map((match) => {
        const roundName = match.roundName || (match.roundNumber ? `${match.roundNumber}강` : "경기");
        const homeTeam = match.homeTeamName || match.homeTeamId || "TBD";
        const awayTeam = match.awayTeamName || match.awayTeamId || "TBD";
        const winner = match.winnerTeamName || match.winnerTeamId || "";
        
        return [
          roundName,
          (match.matchIndex !== undefined ? match.matchIndex + 1 : "").toString(),
          homeTeam,
          awayTeam,
          winner,
        ];
      });

      // CSV 생성
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      // BOM 추가 (한글 깨짐 방지)
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      
      // 다운로드
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${tournament.name || "tournament"}_결과.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error("CSV Export 오류:", error);
      alert(`CSV 다운로드 실패: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 🔥 텍스트 요약 Export 함수
  const handleCopySummary = async () => {
    if (!tournament) return;

    // 대회 종료 상태 체크
    if ((tournament as any).status !== "completed") {
      alert("대회 종료 후 결과를 공유할 수 있습니다.");
      return;
    }

    try {
      // 경기 데이터 정렬
      const sortedMatches = [...matches].sort((a, b) => {
        if ((a.roundNumber || 0) !== (b.roundNumber || 0)) {
          return (a.roundNumber || 0) - (b.roundNumber || 0);
        }
        return (a.matchIndex || 0) - (b.matchIndex || 0);
      });

      // 라운드별 그룹화
      const roundsMap = new Map<number, typeof sortedMatches>();
      sortedMatches.forEach((match) => {
        const roundNum = match.roundNumber || 0;
        if (!roundsMap.has(roundNum)) {
          roundsMap.set(roundNum, []);
        }
        roundsMap.get(roundNum)!.push(match);
      });

      // 텍스트 생성
      const lines: string[] = [];
      lines.push("🏆 대회 결과 안내");
      lines.push("");
      lines.push(`대회명: ${tournament.name}`);
      lines.push(`우승팀: ${(tournament as any).winnerTeamName || (tournament as any).winnerTeamId || ""}`);
      lines.push("");

      // 라운드별 결과 추가 (역순: 결승 먼저)
      const sortedRoundNumbers = Array.from(roundsMap.keys()).sort((a, b) => b - a);
      
      sortedRoundNumbers.forEach((roundNum) => {
        const roundMatches = roundsMap.get(roundNum)!;
        const roundName = roundMatches[0]?.roundName || `${roundNum}강`;
        lines.push(`[${roundName}]`);
        
        roundMatches.forEach((match) => {
          const homeTeam = match.homeTeamName || match.homeTeamId || "TBD";
          const awayTeam = match.awayTeamName || match.awayTeamId || "TBD";
          const winner = match.winnerTeamName || match.winnerTeamId || "";
          lines.push(`${homeTeam} vs ${awayTeam} → ${winner} 승`);
        });
        
        lines.push("");
      });

      lines.push("감사합니다.");

      const summaryText = lines.join("\n");

      // 클립보드에 복사
      await navigator.clipboard.writeText(summaryText);
      alert("결과 요약이 복사되었습니다!");
    } catch (error: any) {
      console.error("텍스트 요약 복사 오류:", error);
      alert(`복사 실패: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 🔥 Undo 함수 (마지막 MATCH_RESULT 로그 취소)
  const undoLastResult = async () => {
    if (!associationId || !tournament?.id) return;

    // 🔥 위험 액션 Confirm UX (더 강한 문구)
    if (!window.confirm("되돌리면 다음 라운드도 함께 초기화됩니다. 계속하시겠습니까?")) {
      return;
    }

    // 🔥 실운영 모드에서는 Undo 차단
    if ((tournament as any).mode === "live") {
      alert("실운영 모드에서는 되돌릴 수 없습니다.");
      return;
    }

    try {
      // STEP A: 마지막 MATCH_RESULT 로그 찾기 (이미 최신순 정렬됨)
      const lastResultLog = firestoreLogs.find(
        (log: any) => log.type === "MATCH_RESULT"
      );

      if (!lastResultLog || !lastResultLog.matchId) {
        alert("되돌릴 경기 결과가 없습니다.");
        return;
      }

      const matchId = lastResultLog.matchId;

      // STEP B: match 문서 조회
      const matchRef = doc(
        db,
        "associations",
        associationId,
        "tournaments",
        tournament.id,
        "matches",
        matchId
      );

      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists()) {
        alert("경기를 찾을 수 없습니다.");
        return;
      }

      const matchData = matchSnap.data();

      // STEP C-1: 해당 match winner 제거
      await updateDoc(matchRef, {
        winner: null,
        winnerTeamId: null,
        winnerTeamName: null,
        status: null,
        completedAt: null,
        updatedAt: serverTimestamp(),
      });

      // STEP C-2: 다음 match의 team 제거
      if (matchData.nextMatchId && matchData.nextSlot) {
        const nextRef = doc(
          db,
          "associations",
          associationId,
          "tournaments",
          tournament.id,
          "matches",
          matchData.nextMatchId
        );

        const nextMatchSnap = await getDoc(nextRef);
        if (nextMatchSnap.exists()) {
          const fieldId = matchData.nextSlot === "home" ? "homeTeamId" : "awayTeamId";
          const fieldName = matchData.nextSlot === "home" ? "homeTeamName" : "awayTeamName";

          await updateDoc(nextRef, {
            [fieldId]: null,
            [fieldName]: null,
            updatedAt: serverTimestamp(),
          });
        }
      }

      // STEP C-3: 결승이었으면 tournament 상태도 원복
      if (!matchData.nextMatchId && tournament.status === "completed") {
        const tournamentRef = doc(
          db,
          "associations",
          associationId,
          "tournaments",
          tournament.id
        );

        await updateDoc(tournamentRef, {
          status: "ongoing", // 또는 "ready"로 변경 가능
          winnerTeamId: null,
          winnerTeamName: null,
          completedAt: null,
          updatedAt: serverTimestamp(),
        });
      }

      // STEP D: Undo 로그 남기기
      const roundName = matchData.roundName || (matchData.roundNumber ? `${matchData.roundNumber}강` : "경기");
      await writeTournamentLog({
        associationId,
        tournamentId: tournament.id,
        type: "MATCH_RESULT_UNDO",
        message: `↩ ${roundName} 경기 결과 되돌림`,
        actor: "admin",
        matchId: matchId,
      });
    } catch (error: any) {
      console.error("Undo 오류:", error);
      alert(`되돌리기 실패: ${error.message || "알 수 없는 오류"}`);
    }
  };

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}/tournaments/${tournamentId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, tournamentId, navigate]);

  // 🔥 연령대별 tournaments 조회
  useEffect(() => {
    if (!associationId || !isAdmin) return;

    const fetchTournaments = async () => {
      try {
        const tournamentsRef = collection(
          db,
          `associations/${associationId}/tournaments`
        );
        const tournamentsQuery = query(tournamentsRef);
        const tournamentsSnapshot = await getDocs(tournamentsQuery);
        
        const tournamentsData = tournamentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Tournament[];

        setTournaments(tournamentsData);
        
        // 기본 연령대 선택 (있는 것 중 첫 번째 또는 20_30)
        if (tournamentsData.length > 0) {
          const firstWithAgeGroup = tournamentsData.find((t) => (t as any).ageGroup);
          const defaultAgeGroup = firstWithAgeGroup ? (firstWithAgeGroup as any).ageGroup : "20_30";
          setAgeGroup(defaultAgeGroup);
        }
      } catch (error) {
        console.error("대회 목록 조회 오류:", error);
      }
    };

    fetchTournaments();
  }, [associationId, isAdmin]);

  // 🔥 선택된 연령대의 tournament 찾기 및 데이터 로드
  useEffect(() => {
    if (!associationId || !isAdmin || tournaments.length === 0) return;

    // 연령대별 tournament 찾기 (여러 개면 최신 1개)
    const ageGroupTournaments = tournaments.filter(
      (t) => (t as any).ageGroup === ageGroup
    );
    
    const selectedTournament = ageGroupTournaments.length > 0
      ? ageGroupTournaments.sort((a, b) => {
          // 최신 순으로 정렬 (createdAt 기준)
          const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
          return bTime - aTime;
        })[0]
      : null;

    if (!selectedTournament) {
      // 해당 연령대의 대회가 없으면 tournament를 null로 설정
      setTournament(null);
      setRounds([]);
      setMatches([]);
      setApprovedTeamCount(0);
      setTotalTeamCount(0);
      setDisciplineLogs([]);
      setLoading(false);
      return;
    }

    const currentTournamentId = selectedTournament.id;
    setTournament(selectedTournament);

    const fetchTournamentData = async () => {
      try {
        setLoading(true);

        // 징계 로그 조회
        const logsRef = collection(
          db,
          `associations/${associationId}/tournaments/${currentTournamentId}/discipline_logs`
        );
        const logsQuery = query(logsRef, orderBy("createdAt", "desc"));
        const logsSnapshot = await getDocs(logsQuery);
        const logsData = logsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DisciplineLog[];
        setDisciplineLogs(logsData);

        // 🔥 참가팀 수 조회 (초기 로드용, 이후는 useTournamentTeamsSnapshot으로 실시간 업데이트)
        // teamsSnapshot이 있으면 그것을 우선 사용 (실시간 업데이트)
        if (!teamsSnapshot || teamsSnapshot.length === 0) {
          const teamsRef = collection(
            db,
            `associations/${associationId}/tournaments/${currentTournamentId}/teams`
          );
          const teamsQuery = query(teamsRef, where("status", "in", ["pending", "approved", "rejected"]));
          const teamsSnapshot = await getDocs(teamsQuery);
          const total = teamsSnapshot.size;
          const approved = teamsSnapshot.docs.filter((d) => d.data().status === "approved").length;
          
          setTotalTeamCount(total);
          setApprovedTeamCount(approved);
          
          console.log("[참가팀 수 조회] 초기 로드", {
            전체_팀: total,
            승인_팀: approved,
            팀_목록: teamsSnapshot.docs.map(d => ({
              id: d.id,
              name: d.data().teamName,
              status: d.data().status,
            })),
          });
        }

        // 🔥 대진표 데이터 조회 (rounds는 1회, matches는 실시간 구독)
        const roundsRef = collection(
          db,
          `associations/${associationId}/tournaments/${currentTournamentId}/rounds`
        );
        const matchesRef = collection(
          db,
          `associations/${associationId}/tournaments/${currentTournamentId}/matches`
        );

        try {
          // rounds는 1회만 조회 (변경 빈도 낮음)
          const roundsSnapshot = await getDocs(roundsRef);
          const roundsData = roundsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRounds(roundsData);

          // 🔥 matches는 실시간 구독 (승자 입력 시 즉시 반영)
          const matchesQuery = query(matchesRef, orderBy("roundNumber", "asc"), orderBy("matchIndex", "asc"));
          const unsubMatches = onSnapshot(
            matchesQuery,
            (matchesSnapshot) => {
              const matchesData = matchesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setMatches(matchesData);

              console.log("[대진표 실시간 업데이트]", {
                라운드_수: roundsData.length,
                경기_수: matchesData.length,
              });
            },
            (error: any) => {
              console.error("[대진표 실시간 구독 오류]", {
                error: error?.message,
                code: error?.code,
              });
              setMatches([]);
            }
          );

          // cleanup: 컴포넌트 언마운트 또는 tournament 변경 시 구독 해제
          return () => {
            unsubMatches();
          };
        } catch (error: any) {
          console.error("[대진표 데이터 조회 실패]", {
            error: error?.message,
            code: error?.code,
          });
          setRounds([]);
          setMatches([]);
        }
      } catch (error) {
        console.error("대회 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentData();
      }, [associationId, ageGroup, tournaments, isAdmin]);

  // 참가 접수 토글
  const handleToggleRegistration = async () => {
    if (!tournament || !user) return;

    try {
      setSaving(true);
      const tournamentRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      await updateDoc(tournamentRef, {
        registrationOpen: !tournament.registrationOpen,
        updatedAt: serverTimestamp(),
      });

      setTournament({ ...tournament, registrationOpen: !tournament.registrationOpen });
      await logAdminAction("TOURNAMENT_REGISTRATION_TOGGLED", `참가 접수 ${!tournament.registrationOpen ? "열림" : "닫힘"}`, {
        tournamentId,
        registrationOpen: !tournament.registrationOpen,
      });
    } catch (error) {
      console.error("참가 접수 토글 오류:", error);
      alert("변경 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 승자 선택 및 다음 라운드 자동 반영
  const handleSelectWinner = async (matchId: string, winner: 'home' | 'away') => {
    if (!associationId || !tournament || !user || selectingWinner) return;
    
    const currentTournament = tournament; // null 체크 후 로컬 변수에 저장

    const match = matches.find((m) => m.id === matchId);
    if (!match) {
      alert("경기 정보를 찾을 수 없습니다.");
      return;
    }

    if (match.status === 'finished') {
      alert("이미 종료된 경기입니다.");
      return;
    }

    const winnerTeamId = winner === 'home' ? match.homeTeamId : match.awayTeamId;
    const winnerTeamName = winner === 'home' ? match.homeTeamName : match.awayTeamName;

    if (!winnerTeamId) {
      alert("승자 팀 정보가 없습니다.");
      return;
    }

    if (!confirm(`${winnerTeamName || winnerTeamId} 팀의 승리를 확정하시겠습니까?`)) {
      return;
    }

    try {
      setSelectingWinner(matchId);

      // matchIndex 확인 (없으면 현재 방식으로 fallback)
      const currentMatchIndex = match.matchIndex != null 
        ? match.matchIndex 
        : (() => {
            // matchIndex가 없으면 정렬 기반으로 계산 (fallback)
            const currentRoundMatches = matches
              .filter((m) => m.roundNumber === match.roundNumber)
              .sort((a, b) => {
                if (a.matchIndex != null && b.matchIndex != null) {
                  return a.matchIndex - b.matchIndex;
                }
                if (a.roundId && b.roundId) return a.roundId.localeCompare(b.roundId);
                return a.id.localeCompare(b.id);
              });
            return currentRoundMatches.findIndex((m) => m.id === matchId);
          })();

      if (currentMatchIndex === -1) {
        throw new Error("현재 경기의 인덱스를 찾을 수 없습니다.");
      }

      // 🔥 결승 감지: maxRound 계산
      const maxRound = Math.max(
        ...rounds.map((r) => r.roundNumber || 0).filter((n) => n > 0),
        ...matches.map((m) => m.roundNumber || 0).filter((n) => n > 0),
        0
      );
      const isFinal = match.roundNumber === maxRound;

      // 다음 라운드 계산: roundNumber + 1
      const nextRoundNumber = (match.roundNumber || 0) + 1;
      const nextMatchIndex = Math.floor(currentMatchIndex / 2); // 2경기당 1경기

      const tournamentPath = `associations/${associationId}/tournaments/${currentTournament.id}`;

      await runTransaction(db, async (transaction) => {
        // 1️⃣ 현재 경기 종료 처리
        const matchRef = doc(db, `${tournamentPath}/matches/${matchId}`);
        
        const matchSnap = await transaction.get(matchRef);
        if (!matchSnap.exists()) {
          throw new Error("경기 문서를 찾을 수 없습니다.");
        }

        transaction.update(matchRef, {
          winnerTeamId,
          winnerTeamName,
          status: 'finished',
          updatedAt: serverTimestamp(),
        });

        // 2️⃣ 결승 처리 또는 다음 라운드 반영
        if (isFinal) {
          // 🏆 결승: 우승 확정 및 대회 종료 처리
          const tournamentRef = doc(db, tournamentPath);
          
          transaction.update(tournamentRef, {
            status: "completed",
            winnerTeamId,
            winnerTeamName,
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // 3️⃣ 로그 기록
          const logsRef = collection(db, `${tournamentPath}/logs`);
          const logRef = doc(logsRef);
          
          transaction.set(logRef, {
            type: "tournament_completed",
            message: "🏆 우승팀 확정",
            winnerTeamId,
            winnerTeamName,
            createdAt: serverTimestamp(),
            by: user.uid,
          });
        } else {
          // 2️⃣ 다음 라운드로 승자 반영 (결승 제외)
          const nextRound = match.roundNumber + 1;
          const nextIndex = Math.floor(currentMatchIndex / 2);

          // 다음 라운드 경기 찾기 (트랜잭션 전에 쿼리)
          const nextQ = query(
            collection(db, `${tournamentPath}/matches`),
            where("roundNumber", "==", nextRound),
            where("matchIndex", "==", nextIndex)
          );

          // 트랜잭션 전에 쿼리 실행
          const nextSnap = await getDocs(nextQ);
          
          if (!nextSnap.empty) {
            const nextDoc = nextSnap.docs[0];
            const nextMatchRef = doc(db, `${tournamentPath}/matches/${nextDoc.id}`);
            const nextMatchSnap = await transaction.get(nextMatchRef);
            
            if (!nextMatchSnap.exists()) {
              throw new Error("다음 라운드 경기 문서를 찾을 수 없습니다.");
            }

            const next = nextMatchSnap.data();
            
            // 빈 슬롯에 승자 삽입
            const updateData: any = {
              updatedAt: serverTimestamp(),
            };

            if (!next.homeTeamId) {
              updateData.homeTeamId = winnerTeamId;
              updateData.homeTeamName = winnerTeamName;
            } else if (!next.awayTeamId) {
              updateData.awayTeamId = winnerTeamId;
              updateData.awayTeamName = winnerTeamName;
            } else {
              throw new Error("다음 라운드 경기의 슬롯이 이미 모두 채워져 있습니다.");
            }

            transaction.update(nextMatchRef, updateData);
          }
        }
      });

      // 3. 성공 메시지 및 데이터 재조회
      if (isFinal) {
        alert(`🏆 우승팀이 확정되었습니다!\n\n우승: ${winnerTeamName || winnerTeamId}\n\n대회가 종료되었습니다.`);
      } else {
        alert(`✅ 승자가 확정되었습니다.\n${winnerTeamName || winnerTeamId}`);
      }
      
      // 데이터 재조회
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error: any) {
      console.error("승자 선택 오류:", error);
      alert(`❌ 승자 선택 실패: ${error?.message || "알 수 없는 오류"}`);
    } finally {
      setSelectingWinner(null);
    }
  };

  // 대진표 확정
  const handleConfirmBracket = async () => {
    if (!tournament || !user) return;

    try {
      setSaving(true);
      const tournamentRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      await updateDoc(tournamentRef, {
        bracketStatus: "confirmed",
        updatedAt: serverTimestamp(),
      });

      setTournament({ ...tournament, bracketStatus: "confirmed" });
      await logAdminAction("TOURNAMENT_BRACKET_CONFIRMED", "대진표 확정", {
        tournamentId,
      });
    } catch (error) {
      console.error("대진표 확정 오류:", error);
      alert("확정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 검수 종료일 + 조 추첨일 빠른 수정 (테스트용)
  const handleQuickUpdateReviewDate = async () => {
    if (!tournament || !user) return;

    const today = new Date();
    today.setHours(23, 59, 59, 999); // 오늘 23:59:59
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    if (!confirm(`테스트를 위해 다음 날짜를 오늘(${todayStr})로 변경하시겠습니까?\n\n- 검수 종료일\n- 조 추첨일\n\n⚠️ 테스트 목적의 빠른 수정입니다.`)) {
      return;
    }

    try {
      setSaving(true);
      const tournamentRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}`
      );

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      // 검수 기간 종료일 업데이트
      if (tournament.reviewPeriod) {
        updateData.reviewPeriod = {
          ...tournament.reviewPeriod,
          endDate: todayStr,
        };
      } else {
        updateData.reviewPeriod = {
          startDate: tournament.registrationPeriod?.endDate || todayStr,
          endDate: todayStr,
        };
      }

      // 조 추첨일도 오늘로 설정 (기존 값이 있든 없든 오늘로 변경)
      updateData.drawDate = {
        date: todayStr,
        isPublic: tournament.drawDate?.isPublic ?? false,
      };

      await updateDoc(tournamentRef, updateData);

      // 상태 업데이트
      const updatedTournament = {
        ...tournament,
        reviewPeriod: updateData.reviewPeriod,
        drawDate: updateData.drawDate,
      };
      setTournament(updatedTournament);

      await logAdminAction("TOURNAMENT_DATES_UPDATED", "검수 종료일 + 조 추첨일 빠른 수정 (테스트)", {
        tournamentId,
        reviewEndDate: todayStr,
        drawDate: todayStr,
      });

      alert(`✅ 날짜 업데이트 완료!\n\n- 검수 종료일: ${todayStr}\n- 조 추첨일: ${todayStr}\n\n이제 조 추첨을 실행할 수 있습니다.\n(팀 승인 상태도 확인해주세요.)`);
      
      // 페이지 새로고침하여 상태 반영
      window.location.reload();
    } catch (error) {
      console.error("날짜 수정 오류:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 권한 확인 에러 처리 (흰 화면 방지)
  if (adminError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ 관리자 권한 확인 실패</h2>
          <p className="text-gray-700 mb-4">{adminError.message}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-semibold mb-2">해결 방법:</p>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>브라우저 확장 프로그램(광고 차단, VPN 등)을 비활성화하세요</li>
              <li>시크릿 모드에서 다시 시도하세요</li>
              <li>네트워크 환경(회사망, VPN)을 확인하세요</li>
              <li>페이지를 새로고침하거나 다시 로그인하세요</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            페이지 새로고침
          </button>
        </div>
      </div>
    );
  }

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">접근 권한 없음</h2>
          <p className="text-gray-600 mb-4">이 페이지는 협회 관리자만 접근할 수 있습니다.</p>
          <button
            onClick={() => navigate(`/association/${associationId}/tournaments/${tournamentId}`)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            일반 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  // 연령대별 대회가 없을 때
  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="mb-6">
            <button
              onClick={() => navigate(`/association/${associationId}/tournaments`)}
              className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
            >
              ← 대회 목록으로 돌아가기
            </button>
          </div>

          {/* 🔥 연령대별 탭 */}
          <div className="mb-6">
            <AgeGroupTabs
              active={ageGroup}
              onChange={(key) => setAgeGroup(key)}
            />
          </div>

          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 text-lg">
              {ageGroup === "20_30" && "20/30대"}
              {ageGroup === "40" && "40대"}
              {ageGroup === "50" && "50대"}
              {ageGroup === "60" && "60대"} 대회가 없습니다.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              해당 연령대의 대회를 생성해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/association/${associationId}/tournaments/${tournament?.id || ''}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
          >
            ← 대회 페이지로 돌아가기
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              <p className="text-gray-600 mt-1">대회 관리</p>
            </div>
            {/* 🔥 참가팀 보기 버튼 (상단 우측) */}
            <button
              onClick={handleOpenTeamsView}
              className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50"
            >
              👥 참가팀 보기
            </button>
          </div>
        </div>

        {/* 🔥 연령대별 탭 */}
        <div className="mb-6">
          <AgeGroupTabs
            active={ageGroup}
            onChange={(key) => setAgeGroup(key)}
          />
        </div>

        {/* 참가 접수 토글 및 참가팀 수 */}
        {(tournament as any).status !== 'completed' && isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">참가 접수 설정</h2>
            <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              참가 접수 {tournament.registrationOpen ? "열림" : "닫힘"}
            </span>
            <button
              onClick={handleToggleRegistration}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {tournament.registrationOpen ? "접수 닫기" : "접수 열기"}
            </button>
              </div>

              {/* 🔥 오늘부터 접수 시작 원클릭 버튼 */}
              {tournament.registrationPeriod?.startDate && (
                <div className="border-t pt-4 mt-4">
                  <button
                    onClick={async () => {
                      if (!tournament || !user || !associationId || !tournamentId) return;
                      if (!window.confirm("오늘부터 참가 신청을 시작하시겠습니까?")) return;

                      try {
                        setSaving(true);
                        const today = kstDateString(); // KST 기준 오늘
                        const currentEnd = tournament.registrationPeriod?.endDate
                          ? kstDateString(tournament.registrationPeriod.endDate)
                          : today;
                        
                        // applyEnd가 start보다 이전이면 자동으로 end를 start로 보정
                        const end = compareDateStr(currentEnd, today) < 0 ? today : currentEnd;

                        const tournamentRef = doc(
                          db,
                          `associations/${associationId}/tournaments/${tournamentId}`
                        );
                        await updateDoc(tournamentRef, {
                          "registrationPeriod.startDate": today,
                          "registrationPeriod.endDate": end,
                          registrationOpen: true,
                          updatedAt: serverTimestamp(),
                        });

                        setTournament({
                          ...tournament,
                          registrationPeriod: {
                            ...tournament.registrationPeriod,
                            startDate: today,
                            endDate: end,
                          },
                          registrationOpen: true,
                        });

                        await logAdminAction("TOURNAMENT_REGISTRATION_STARTED_TODAY", "오늘부터 참가 신청 시작", {
                          tournamentId,
                          startDate: today,
                          endDate: end,
                        });

                        alert("오늘부터 참가 신청이 시작되었습니다.");
                      } catch (error) {
                        console.error("오늘부터 접수 시작 오류:", error);
                        alert("변경 중 오류가 발생했습니다.");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !tournament.registrationPeriod?.startDate}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    🟢 오늘부터 접수 시작
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    신청 시작일을 오늘(KST 기준)로 설정하고 접수를 시작합니다.
                  </p>
                </div>
              )}
            
            {/* 🔥 참가팀 수 표시 */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">참가팀 현황</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">전체 팀</div>
                  <div className="text-2xl font-bold text-gray-900">{totalTeamCount}팀</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">승인 완료</div>
                  <div className="text-2xl font-bold text-green-600">{approvedTeamCount}팀</div>
                </div>
              </div>
              {approvedTeamCount < 2 && (tournament as any).status !== 'completed' && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 조 추첨을 실행하려면 최소 <strong>2팀 이상</strong>의 승인된 팀이 필요합니다.
                  </p>
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* 🔥 팀원 등록 제어 (관리자 전용, 상단 배치) */}
        {isAdmin && tournament && (tournament as any).status !== 'completed' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">대회 단계</h2>
                <div className="text-sm text-gray-600">
                  현재 단계:{" "}
                  <span className="font-medium text-gray-900">
                    {tournament.tournamentPhase === "ROSTER_OPEN"
                      ? "팀원 등록 진행 중"
                      : tournament.tournamentPhase === "ROSTER_LOCKED"
                      ? "팀원 명단 잠금"
                      : tournament.tournamentPhase === "APPLICATION_OPEN"
                      ? "신청 접수 중"
                      : "신청 마감"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {tournament.tournamentPhase !== "ROSTER_OPEN" &&
                  tournament.tournamentPhase !== "ROSTER_LOCKED" && (
                    <Button
                      onClick={async () => {
                        if (
                          !confirm(
                            "팀원 등록 기간을 시작하시겠습니까?\n\n팀 대표들이 팀원을 등록할 수 있게 됩니다."
                          )
                        ) {
                          return;
                        }

                        try {
                          const functions = getFunctions(undefined, "asia-northeast3");
                          const openRosterFn = httpsCallable(
                            functions,
                            "openRosterPeriodCallable"
                          );

                          await openRosterFn({
                            associationId,
                            tournamentId,
                          });

                          // 🔥 tournament 정보 새로고침
                          const tournamentRef = doc(
                            db,
                            `associations/${associationId}/tournaments/${tournamentId}`
                          );
                          const tournamentSnap = await getDoc(tournamentRef);
                          if (tournamentSnap.exists()) {
                            setTournament({
                              id: tournamentSnap.id,
                              ...tournamentSnap.data(),
                            } as Tournament);
                          }

                          alert("팀원 등록 기간이 시작되었습니다.");
                        } catch (error: any) {
                          console.error("[팀원 등록 기간 시작 오류]", error);
                          alert(
                            error?.message ||
                              error?.details?.message ||
                              "팀원 등록 기간 시작에 실패했습니다."
                          );
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      팀원 등록 시작
                    </Button>
                  )}

                {tournament.tournamentPhase === "ROSTER_OPEN" && (
                  <Button
                    onClick={async () => {
                      if (
                        !confirm(
                          "팀원 등록을 잠그시겠습니까?\n\n모든 팀의 팀원 등록이 불가능해지며, 조 추첨을 진행할 수 있습니다.\n\n이 작업은 되돌릴 수 없습니다."
                        )
                      ) {
                        return;
                      }

                      try {
                        const functions = getFunctions(undefined, "asia-northeast3");
                        const lockRosterFn = httpsCallable(
                          functions,
                          "lockRosterPeriodCallable"
                        );

                        const result = await lockRosterFn({
                          associationId,
                          tournamentId,
                        });

                        const data = result.data as any;

                        // 🔥 tournament 정보 새로고침
                        const tournamentRef = doc(
                          db,
                          `associations/${associationId}/tournaments/${tournamentId}`
                        );
                        const tournamentSnap = await getDoc(tournamentRef);
                        if (tournamentSnap.exists()) {
                          setTournament({
                            id: tournamentSnap.id,
                            ...tournamentSnap.data(),
                          } as Tournament);
                        }

                        alert(
                          data?.message ||
                            `팀원 등록이 잠겼습니다. (${data?.lockedTeamsCount || 0}개 팀)`
                        );
                      } catch (error: any) {
                        console.error("[팀원 등록 잠금 오류]", error);
                        alert(
                          error?.message ||
                            error?.details?.message ||
                            "팀원 등록 잠금에 실패했습니다."
                        );
                      }
                    }}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    팀원 명단 잠금
                  </Button>
                )}

                {tournament.tournamentPhase === "ROSTER_LOCKED" && (
                  <div className="text-sm text-gray-600 flex items-center">
                    <span className="mr-2">🔒</span>
                    팀원 등록이 잠겨 있습니다. 조 추첨을 진행할 수 있습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 참가팀 수 표시 (읽기 전용, completed 상태에서도 표시) */}
        {(tournament as any).status === 'completed' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">참가팀 현황</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">전체 팀</div>
                <div className="text-2xl font-bold text-gray-900">{totalTeamCount}팀</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">승인 완료</div>
                <div className="text-2xl font-bold text-green-600">{approvedTeamCount}팀</div>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 테스트 팀 생성 (관리자만, completed 아님) */}
        {isAdmin && (tournament as any).status !== 'completed' && (
          <div className="mb-6">
            <TestTeamGenerator
              associationId={associationId!}
              tournamentId={tournament?.id || ''}
              onTeamsCreated={async () => {
                // 팀 생성 후 토너먼트 재조회 (승인 팀 수 업데이트)
                const tournamentRef = doc(
                  db,
                  `associations/${associationId}/tournaments/${tournament?.id || ''}`
                );
                const tournamentSnap = await getDoc(tournamentRef);
                if (tournamentSnap.exists()) {
                  setTournament({
                    id: tournamentSnap.id,
                    ...tournamentSnap.data(),
                  } as Tournament);
                }
              }}
            />
          </div>
        )}

        {/* 🔥 검수 종료일 + 조 추첨일 빠른 수정 (관리자만, 테스트용, completed 아님) */}
        {isAdmin && (tournament as any).status !== 'completed' && 
         ((tournament.reviewPeriod?.endDate && new Date(tournament.reviewPeriod.endDate) > new Date()) ||
          (tournament.drawDate?.date && new Date(tournament.drawDate.date) > new Date())) && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">조 추첨 테스트 준비</h3>
                  <p className="text-sm text-amber-700">
                    {tournament.reviewPeriod?.endDate && new Date(tournament.reviewPeriod.endDate) > new Date() && (
                      <>
                        검수 종료일: {new Date(tournament.reviewPeriod.endDate).toLocaleDateString("ko-KR")}
                        <br />
                      </>
                    )}
                    {tournament.drawDate?.date && new Date(tournament.drawDate.date) > new Date() && (
                      <>
                        조 추첨일: {new Date(tournament.drawDate.date).toLocaleDateString("ko-KR")}
                        <br />
                      </>
                    )}
                    조 추첨을 바로 실행하려면 검수 종료일과 조 추첨일을 모두 오늘로 변경하세요.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleQuickUpdateReviewDate}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
              >
                {saving ? "수정 중..." : "⚡ 조 추첨 테스트 즉시 실행"}
              </Button>
          </div>
        </div>
        )}

        {/* 조 추첨 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">조 추첨 관리</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateDrawSystem1PagePdf()}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                아키텍처 요약 (1P)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateOfficialLetterToGuOfficePdf()}
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                구청 제출 공문
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {/* 🔥 조 추첨 실행 버튼 (추첨 전, 관리자만, completed 아님) */}
            {isAdmin && !tournament.drawExecuted && (tournament as any).status !== 'completed' && (
              <DrawExecuteButton
                associationId={associationId!}
                tournament={tournament}
                onSuccess={async () => {
                  // 🔥 추첨 완료 후 페이지 새로고침으로 상태 반영 (무한루프 방지)
                  // setTournament 직접 호출 대신 페이지 새로고침 사용
                  console.log("[조 추첨 완료] onSuccess 콜백 실행 - 페이지 새로고침");
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000); // 1초 딜레이 후 새로고침 (성공 메시지 표시 시간 확보)
                }}
              />
            )}

            {/* 조 추첨 결과 표시 (추첨 완료 후) */}
            {tournament.drawExecuted && (
              <div className="space-y-4">
                {/* 🔥 STEP 5: 팀 명단 엑셀 다운로드 버튼 */}
                {isAdmin && tournament.tournamentPhase === "DRAW_DONE" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">📥 팀 명단 엑셀 다운로드</h4>
                        <p className="text-sm text-blue-700">
                          조 추첨 완료된 팀/선수 명단을 엑셀로 다운로드합니다.
                        </p>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            const functions = getFunctions(app, "asia-northeast3");
                            const exportExcel = httpsCallable(functions, "exportRosterExcelCallable");
                            
                            const loadingToast = toast.loading("엑셀 파일 생성 중...");
                            
                            const res: any = await exportExcel({
                              associationId: associationId!,
                              tournamentId: tournamentId!,
                            });
                            
                            // Base64 디코딩
                            const binaryString = atob(res.data.file);
                            const bytes = new Uint8Array(binaryString.length);
                            for (let i = 0; i < binaryString.length; i++) {
                              bytes[i] = binaryString.charCodeAt(i);
                            }
                            
                            // Blob 생성 및 다운로드
                            const blob = new Blob([bytes], {
                              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            });
                            
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = res.data.fileName;
                            link.click();
                            
                            // 메모리 정리
                            URL.revokeObjectURL(link.href);
                            
                            toast.success("엑셀 파일 다운로드 완료", { id: loadingToast });
                          } catch (error: any) {
                            console.error("[엑셀 다운로드] 실패:", error);
                            toast.error(
                              error?.message || "엑셀 다운로드에 실패했습니다.",
                              { duration: 5000 }
                            );
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        엑셀 다운로드
                      </Button>
                    </div>
                  </div>
                )}
                
                {isAdmin && tournament.tournamentPhase !== "DRAW_DONE" && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      조 추첨 완료 후 다운로드 가능합니다.
                    </p>
                  </div>
                )}
                
                <DrawResultDisplay
                  tournament={tournament}
                  associationId={associationId!}
                  isAdmin={isAdmin}
                />
                {/* 🔥 경기 자동 생성 버튼 (관리자만, matches 없을 때만, completed 아님) */}
                {isAdmin && matches.length === 0 && (tournament as any).status !== 'completed' && (
                  <GenerateMatchesButton
                    associationId={associationId!}
                    tournamentId={tournament?.id || ''}
                    tournament={tournament}
                    onSuccess={() => {
                      console.log("[경기 생성 완료] onSuccess 콜백 실행 - 페이지 새로고침");
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    }}
                    onLog={addLog}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* 🔥 STEP 6: 팀 체크인 보드 (조 추첨 완료 후) */}
        {isAdmin && tournament.drawExecuted && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <TeamCheckinBoard
              associationId={associationId!}
              tournament={tournament}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* 🔥 STEP 7 확장: 토너먼트 브라켓 (조 추첨 완료 후) */}
        {tournament.drawExecuted && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <KnockoutBracketView
              associationId={associationId!}
              tournament={tournament}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* 🔥 STEP 7: 경기 목록 및 스코어 입력 보드 (경기 진행 중, 조별 리그용) */}
        {isAdmin && tournament.tournamentPhase === "MATCHES_RUNNING" && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <MatchListBoard
              associationId={associationId!}
              tournament={tournament}
              isAdmin={isAdmin}
            />
          </div>
        )}

        {/* 🔥 FINAL+ 단계: 결과 수정 모드 토글 */}
        {isAdmin && tournament.tournamentPhase === "MATCHES_RUNNING" && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <ResultEditModeToggle
              associationId={associationId!}
              tournament={tournament}
            />
          </div>
        )}

        {/* 🔥 FINAL+ 단계: 결과 수정 이력 (감사 로그) */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <AuditLogView
              associationId={associationId!}
              tournamentId={tournament.id}
            />
          </div>
        )}


        {/* 🏆 우승팀 표시 (대회 종료 시) */}
        {(tournament as any).status === 'completed' && (tournament as any).winnerTeamId && (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl">🏆</span>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-yellow-900 mb-1">우승팀</h2>
                  <p className="text-2xl font-bold text-yellow-800">
                    {(tournament as any).winnerTeamName || (tournament as any).winnerTeamId}
                  </p>
                </div>
              </div>
              
              {/* 🔥 결과 Export 버튼 */}
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCopySummary}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    📋 결과 요약 복사
                  </Button>
                  <Button
                    onClick={handleExportCSV}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    📄 결과 CSV 다운로드
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 대진표 관리 - 세로형 스텝형 토너먼트 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">대진표 관리</h2>
          
          {/* 🔥 표시 조건: matches.length > 0만 확인 (단순화) */}
          {matches.length > 0 ? (
            <div className="space-y-6">
              {/* 🔥 Firestore → UI 변환: rounds를 roundNumber 기준 내림차순 정렬 (결승 먼저) */}
              {(() => {
                // UI 구조 변환
                const uiRounds = rounds
                  .filter((round) => round.roundNumber != null)
                  .sort((a, b) => (b.roundNumber || 0) - (a.roundNumber || 0)) // 결승 먼저 (내림차순)
                  .map((round) => ({
                    roundNumber: round.roundNumber as number,
                    title: (round.name as string) || `라운드 ${round.roundNumber}`,
                    matches: matches.filter(
                      (m) => m.roundNumber === round.roundNumber
                    ),
                  }));

                // 🔥 결승 감지
                const maxRound = Math.max(
                  ...rounds.map((r) => r.roundNumber || 0).filter((n) => n > 0),
                  ...matches.map((m) => m.roundNumber || 0).filter((n) => n > 0),
                  0
                );

                return uiRounds.map((round) => {
                  const isFinalRound = round.roundNumber === maxRound;
                  
                  return (
                    <section
                      key={round.roundNumber}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <h3 className="font-bold text-lg text-gray-900 mb-4 pb-2 border-b border-gray-300 flex items-center gap-2">
                        {isFinalRound && <span className="text-yellow-600">🏆</span>}
                        {round.title}
                        {isFinalRound && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">결승</span>}
                      </h3>

                      {round.matches.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <p>자동 진출</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {round.matches.map((match: any) => (
                            <div key={match.id}>
                              <MatchCard
                                match={match}
                                isAdmin={isAdmin && (tournament as any).status !== 'completed'}
                                onSelectWinner={(tournament as any).status !== 'completed' ? handleSelectWinner : undefined}
                                isSelecting={selectingWinner === match.id}
                              />
                              {/* 🔥 관리자용 결과 입력 (조건부 렌더링만 - Hook 절대 조건부 사용 안 함) */}
                              {isAdmin && 
                               (tournament as any).status !== 'completed' && 
                               match.status !== 'finished' && 
                               associationId && 
                               tournamentId && (
                                <MatchResultEditor
                                  associationId={associationId}
                                  tournamentId={tournamentId}
                                  match={match}
                                  onSuccess={() => {
                                    // 결과 저장 후 데이터 재조회
                                    window.location.reload();
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                });
              })()}

              {/* 🔥 대진표 확인 버튼 (관리자만, completed 아님) */}
              {isAdmin && (tournament as any).status !== 'completed' && (
                <div className="mt-6 pt-6 border-t border-gray-300">
          <BracketConfirmButton
                    currentStatus={tournament.bracketStatus || "preparing"}
            onConfirm={handleConfirmBracket}
            loading={saving}
          />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">대진표가 아직 생성되지 않았습니다.</p>
              <p className="text-sm text-gray-400">
                조 추첨 완료 후 "경기 자동 생성" 버튼을 눌러주세요.
              </p>
            </div>
          )}
        </div>

        {/* 🔥 대회 종료 후 리포트 (관리자 전용) */}
        {tournament && (tournament as any).status === "completed" && isAdmin && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">대회 종료 리포트</h2>
            
            <div className="space-y-4">
              {/* 리포트 생성 버튼 */}
              {!report && (
                <Button
                  onClick={() => {
                    if (tournament && rounds.length > 0 && matches.length > 0) {
                      const tournamentReport = buildTournamentReport(tournament, rounds, matches);
                      setReport(tournamentReport);
                    }
                  }}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  리포트 생성
                </Button>
              )}

              {/* 리포트 JSON 표시 */}
              {report && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">대회 종료 리포트</h3>
                    <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-96 border border-gray-200">
                      {JSON.stringify(report, null, 2)}
                    </pre>
                  </div>

                  {/* PDF 다운로드 버튼 */}
                  <Button
                    onClick={async () => {
                      if (!associationId || !tournamentId || !user) return;
                      
                      setGeneratingPdf(true);
                      try {
                        const functions = getFunctions(app);
                        const generatePdf = httpsCallable(functions, "generateTournamentPdf");
                        const result = await generatePdf({
                          associationId,
                          tournamentId,
                        });
                        
                        const data = result.data as { pdfUrl?: string };
                        if (data.pdfUrl) {
                          window.open(data.pdfUrl, "_blank");
                        }
                      } catch (error: any) {
                        console.error("PDF 생성 오류:", error);
                        alert(`PDF 생성에 실패했습니다: ${error.message || "알 수 없는 오류"}`);
                      } finally {
                        setGeneratingPdf(false);
                      }
                    }}
                    disabled={generatingPdf}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        PDF 생성 중...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        📄 대회 결과 PDF 다운로드
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 징계 로그 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">징계 로그</h2>
          {disciplineLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">징계 로그가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {disciplineLogs.map((log) => (
                <div
                  key={log.id}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    [DISCIPLINE]
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>대회: {log.tournamentName}</div>
                    {log.teamName && <div>팀: {log.teamName}</div>}
                    <div>사유: {log.reason}</div>
                    <div>조치: {log.action}</div>
                    <div>결정: {log.decisionMaker}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {log.createdAt.toDate().toLocaleString("ko-KR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔥 운영 로그 패널 (opLogs 컬렉션) */}
        {associationId && tournamentId && (
          <div className="mb-6">
            <OpLogsPanel
              associationId={associationId}
              tournamentId={tournamentId}
            />
          </div>
        )}

        {/* 🔥 참가팀 보기 모달 (읽기 전용 스냅샷, 운영자/관중 공용) */}
        <TeamsSnapshotModal
          open={showTeamsView}
          onClose={() => setShowTeamsView(false)}
          teams={teamsSnapshot}
          loading={teamsSnapshotLoading}
          associationId={associationId}
          tournamentId={tournamentId}
        />
      </div>
    </div>
  );
}

