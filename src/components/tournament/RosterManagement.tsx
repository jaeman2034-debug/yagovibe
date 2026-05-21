/**
 * 🔥 팀원(선수) 등록 관리 컴포넌트 (천재 모드)
 * 
 * 기능:
 * - 팀원 목록 표시
 * - 팀원 추가 (대표만)
 * - 팀원 삭제 (대표만)
 * - 중복 체크 (백엔드에서 처리)
 * - 대회 phase + 팀 잠금 상태 체크
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, User } from "lucide-react";
import type { TournamentPlayer, TournamentTeam, Tournament } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";
import { MIN_PLAYERS, MAX_PLAYERS } from "@/constants/rosterPolicy";

interface RosterManagementProps {
  associationId: string;
  tournamentId: string;
  teamId: string;
  team: TournamentTeam;
  tournament: Tournament;
}

export function RosterManagement({
  associationId,
  tournamentId,
  teamId,
  team,
  tournament,
}: RosterManagementProps) {
  const { user } = useAuth();
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // 🔥 권한 체크: 팀 대표만
  const isCaptain = user?.uid === team.captainUid;

  // 🔥 팀원 등록 가능 여부 체크
  const canEditRoster =
    isCaptain &&
    tournament.tournamentPhase === "ROSTER_OPEN" &&
    !team.rosterLocked;

  // 🔥 팀원 목록 실시간 구독
  useEffect(() => {
    if (!associationId || !tournamentId || !teamId) {
      setLoading(false);
      return;
    }

    const playersRef = collection(
      db,
      "associations",
      associationId,
      "tournaments",
      tournamentId,
      "teams",
      teamId,
      "players"
    );

    const q = query(playersRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const playersList = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TournamentPlayer[];
        setPlayers(playersList);
        setLoading(false);
      },
      (error: any) => {
        console.error("[팀원 목록 조회 오류]", error);
        
        // 🔥 권한 에러는 조용히 처리 (테스트 시나리오 대응)
        if (error?.code === "permission-denied" || error?.code === "missing-or-insufficient-permissions") {
          console.log("[팀원 목록] 권한 없음 (정상 - 팀 대표만 조회 가능)");
          setPlayers([]);
        } else {
          // 다른 에러는 사용자에게 알림
          toast.error("팀원 목록을 불러올 수 없습니다.", {
            duration: 3000,
          });
        }
        
        setLoading(false);
      }
    );

    return () => unsub();
  }, [associationId, tournamentId, teamId]);

  // 🔥 팀원 추가
  const handleAddPlayer = async (playerData: {
    name: string;
    birthYear: number;
    position?: string;
    phone?: string;
    jerseyNo?: number;
  }) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (!canEditRoster) {
      toast.error("팀원 등록 권한이 없습니다.");
      return;
    }

    setAdding(true);
    const loadingToastId = toast.loading("팀원 추가 중...");

    try {
      const functions = getFunctions(undefined, "asia-northeast3");
      const addPlayerFn = httpsCallable(functions, "addPlayerCallable");

      await addPlayerFn({
        associationId,
        tournamentId,
        teamId,
        playerData,
      });

      toast.success("팀원이 추가되었습니다.", {
        id: loadingToastId,
      });
      setShowAddModal(false);
    } catch (error: any) {
      console.error("[팀원 추가 오류]", error);
      
      // 🔥 에러 코드별 사용자 친화적 메시지 (테스트 시나리오 대응)
      const errorCode = error?.code;
      let errorMessage = "팀원 추가에 실패했습니다.";
      
      if (errorCode === "already-exists") {
        errorMessage = "이미 등록된 선수입니다. (이름 + 출생년도 중복)";
      } else if (errorCode === "failed-precondition") {
        errorMessage = error?.message || "팀원 등록 기간이 아니거나 잠겨 있습니다.";
      } else if (errorCode === "permission-denied") {
        errorMessage = "팀 대표만 팀원을 추가할 수 있습니다.";
      } else if (errorCode === "unauthenticated") {
        errorMessage = "로그인이 필요합니다.";
      } else if (errorCode === "resource-exhausted") {
        errorMessage = error?.message || "최대 인원을 초과했습니다.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        id: loadingToastId,
        duration: 5000,
      });
    } finally {
      setAdding(false);
    }
  };

  // 🔥 팀원 삭제
  const handleRemovePlayer = async (playerId: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (!canEditRoster) {
      toast.error("팀원 삭제 권한이 없습니다.");
      return;
    }

    if (!confirm("정말 이 팀원을 삭제하시겠습니까?")) {
      return;
    }

    const loadingToastId = toast.loading("팀원 삭제 중...");

    try {
      const functions = getFunctions(undefined, "asia-northeast3");
      const removePlayerFn = httpsCallable(functions, "removePlayerCallable");

      await removePlayerFn({
        associationId,
        tournamentId,
        teamId,
        playerId,
      });

      toast.success("팀원이 삭제되었습니다.", {
        id: loadingToastId,
      });
    } catch (error: any) {
      console.error("[팀원 삭제 오류]", error);
      
      // 🔥 에러 코드별 사용자 친화적 메시지 (테스트 시나리오 대응)
      const errorCode = error?.code;
      let errorMessage = "팀원 삭제에 실패했습니다.";
      
      if (errorCode === "failed-precondition") {
        errorMessage = error?.message || "팀원 등록 기간이 아니거나 잠겨 있습니다.";
      } else if (errorCode === "permission-denied") {
        errorMessage = "팀 대표만 팀원을 삭제할 수 있습니다.";
      } else if (errorCode === "unauthenticated") {
        errorMessage = "로그인이 필요합니다.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        id: loadingToastId,
        duration: 5000,
      });
    }
  };

  // 🔥 STEP 3: 상태 메시지 로직 (정답)
  const getRosterStatusMessage = () => {
    const phase = tournament.tournamentPhase;
    
    switch (phase) {
      case "ROSTER_OPEN":
        return {
          type: "success" as const,
          text: "🟢 현재 팀원 등록 기간입니다. 팀원을 추가해주세요.",
        };
      case "ROSTER_LOCKED":
        return {
          type: "warning" as const,
          text: "🔒 팀원 명단이 확정되었습니다. 더 이상 수정할 수 없습니다.",
        };
      default:
        return {
          type: "info" as const,
          text: "⏳ 팀원 등록 기간이 아닙니다. 관리자 오픈을 기다려주세요.",
        };
    }
  };

  const rosterStatus = getRosterStatusMessage();
  
  // 🔥 팀원 수 상태 색상 계산
  const playerCount = players.length;
  const getPlayerCountStatus = () => {
    if (playerCount < MIN_PLAYERS) {
      return { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    }
    if (playerCount > MAX_PLAYERS) {
      return { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    }
    return { color: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
  };
  
  const countStatus = getPlayerCountStatus();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>팀원 명단</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>팀원 명단 ({players.length}명)</CardTitle>
          {canEditRoster && (
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              disabled={adding}
            >
              <Plus className="w-4 h-4 mr-2" />
              팀원 추가
            </Button>
          )}
        </div>
        {team.rosterCount !== undefined && (
          <div className="text-xs text-gray-500 mt-1">
            캐시 카운트: {team.rosterCount}명
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 🔥 STEP 3: 상태 메시지 (명확한 안내) */}
        <Alert
          className={
            rosterStatus.type === "success"
              ? "bg-green-50 border-green-200"
              : rosterStatus.type === "warning"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-gray-50 border-gray-200"
          }
        >
          <AlertDescription
            className={
              rosterStatus.type === "success"
                ? "text-green-800"
                : rosterStatus.type === "warning"
                ? "text-yellow-800"
                : "text-gray-600"
            }
          >
            {rosterStatus.text}
          </AlertDescription>
        </Alert>

        {/* 팀원 수 상태 표시 */}
        <div className={`p-3 rounded-lg border ${countStatus.bg} ${countStatus.border}`}>
          <div className={`text-sm font-medium ${countStatus.color}`}>
            현재 등록 인원: {playerCount}명
            {playerCount < MIN_PLAYERS && (
              <span className="ml-2">(최소 {MIN_PLAYERS}명 필요)</span>
            )}
            {playerCount > MAX_PLAYERS && (
              <span className="ml-2">(최대 {MAX_PLAYERS}명 초과)</span>
            )}
          </div>
        </div>

        {/* 팀원 목록 테이블 */}
        <TeamRosterTable
          players={players}
          canEdit={canEditRoster}
          onRemove={handleRemovePlayer}
        />
      </CardContent>

      {/* 팀원 추가 모달 */}
      {showAddModal && (
        <AddPlayerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddPlayer}
          adding={adding}
        />
      )}
    </Card>
  );
}

/**
 * 🔥 팀원 목록 테이블 (천재 모드: 모듈화)
 */
function TeamRosterTable({
  players,
  canEdit,
  onRemove,
}: {
  players: TournamentPlayer[];
  canEdit: boolean;
  onRemove: (playerId: string) => void;
}) {
  // 🔥 STEP 3-4: 팀원 0명일 때 Empty State (중요)
  if (players.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
        <p className="text-sm font-medium mb-1">아직 등록된 팀원이 없습니다.</p>
        <p className="text-xs">
          팀원 등록 기간에 팀원을 추가해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">이름</th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">출생년도</th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">포지션</th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">등번호</th>
            <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">연락처</th>
            {canEdit && (
              <th className="text-right py-2 px-3 text-sm font-medium text-gray-700">작업</th>
            )}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <PlayerRow
              key={player.id}
              player={player}
              canEdit={canEdit}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 🔥 팀원 행 컴포넌트 (천재 모드: 모듈화)
 */
function PlayerRow({
  player,
  canEdit,
  onRemove,
}: {
  player: TournamentPlayer;
  canEdit: boolean;
  onRemove: (playerId: string) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{player.name}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-sm text-gray-600">{player.birthYear}년생</td>
      <td className="py-3 px-3 text-sm text-gray-600">{player.position || "-"}</td>
      <td className="py-3 px-3 text-sm text-gray-600">{player.jerseyNo || "-"}</td>
      <td className="py-3 px-3 text-sm text-gray-600">{player.phone || "-"}</td>
      {canEdit && (
        <td className="py-3 px-3 text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(player.id)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </td>
      )}
    </tr>
  );
}

/**
 * 🔥 팀원 추가 모달 (천재 모드: 모듈화)
 */
function AddPlayerModal({
  onClose,
  onAdd,
  adding,
}: {
  onClose: () => void;
  onAdd: (data: {
    name: string;
    birthYear: number;
    position?: string;
    phone?: string;
    jerseyNo?: number;
  }) => void;
  adding: boolean;
}) {
  return (
    <AddPlayerForm
      onAdd={onAdd}
      adding={adding}
      showModal={true}
      onClose={onClose}
    />
  );
}

/**
 * 🔥 팀원 추가 폼 (천재 모드: 모듈화)
 * - 모달 형태 또는 인라인 형태 모두 지원
 */
function AddPlayerForm({
  onAdd,
  adding,
  showModal = false,
  onClose,
}: {
  onAdd: (data: {
    name: string;
    birthYear: number;
    position?: string;
    phone?: string;
    jerseyNo?: number;
  }) => void;
  adding: boolean;
  showModal?: boolean;
  onClose?: () => void;
}) {
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState<number | "">("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [jerseyNo, setJerseyNo] = useState<number | "">("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !birthYear) {
      toast.error("이름과 출생년도는 필수입니다.");
      return;
    }

    if (typeof birthYear !== "number" || birthYear < 1900 || birthYear > new Date().getFullYear()) {
      toast.error("올바른 출생년도를 입력해주세요.");
      return;
    }

    if (jerseyNo !== "" && (typeof jerseyNo !== "number" || jerseyNo < 1 || jerseyNo > 99)) {
      toast.error("등번호는 1~99 사이의 숫자여야 합니다.");
      return;
    }

    onAdd({
      name: name.trim(),
      birthYear,
      position: position || undefined,
      phone: phone || undefined,
      jerseyNo: jerseyNo !== "" && typeof jerseyNo === "number" ? jerseyNo : undefined,
    });
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
          disabled={adding}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">
          출생년도 <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="1900"
          max={new Date().getFullYear()}
          value={birthYear}
          onChange={(e) => {
            const value = e.target.value;
            setBirthYear(value === "" ? "" : parseInt(value, 10));
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
          disabled={adding}
          placeholder="예: 2001"
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">포지션</label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          disabled={adding}
        >
          <option value="">선택 안 함</option>
          <option value="GK">GK</option>
          <option value="DF">DF</option>
          <option value="MF">MF</option>
          <option value="FW">FW</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">연락처</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          disabled={adding}
        />
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">등번호</label>
        <input
          type="number"
          min="1"
          max="99"
          value={jerseyNo}
          onChange={(e) => {
            const value = e.target.value;
            setJerseyNo(value === "" ? "" : parseInt(value, 10));
          }}
          placeholder="1~99"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          disabled={adding}
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={adding}
        >
          취소
        </Button>
        <Button type="submit" className="flex-1" disabled={adding}>
          {adding ? "추가 중..." : "추가"}
        </Button>
      </div>
    </form>
  );

  // 모달 형태
  if (showModal && onClose) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-none md:max-w-3xl">
          <CardHeader>
            <CardTitle>팀원 추가</CardTitle>
          </CardHeader>
          <CardContent>{formContent}</CardContent>
        </Card>
      </div>
    );
  }

  // 인라인 형태 (추후 확장용)
  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardHeader>
        <CardTitle className="text-base">팀원 추가</CardTitle>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
