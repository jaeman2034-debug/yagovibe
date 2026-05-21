/**
 * 🔥 선수 명단 관리 페이지
 * 
 * 경로: /me/tournaments/{tournamentId}/teams/{teamId}/roster
 * 
 * 기능:
 * - 선수 목록 표시
 * - 선수 추가/수정/삭제
 * - 명단 제출
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit2, Trash2, Save, Send } from "lucide-react";
import { getTournamentApplication } from "@/lib/tournament/applicationRepository";
import type { TournamentApplication } from "@/types/tournament";

// 🔥 임시 타입 (추후 rosterRepository에서 import)
interface RosterPlayer {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  position?: string;
  phone?: string;
  status: "active" | "inactive";
}

export default function TournamentRosterPage() {
  const { tournamentId, teamId } = useParams<{
    tournamentId: string;
    teamId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [application, setApplication] = useState<TournamentApplication | null>(null);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [rosterStatus, setRosterStatus] = useState<"draft" | "submitted" | "locked">("draft");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);

  // 🔥 신청 정보 조회
  useEffect(() => {
    if (!tournamentId || !teamId) {
      navigate("/mypage");
      return;
    }

    const loadApplication = async () => {
      try {
        setLoading(true);
        // TODO: associationId 조회 필요
        // 임시로 빈 값 처리
        const app = await getTournamentApplication("", tournamentId, "");
        if (app) {
          setApplication(app);
          // rosterStatus는 application에서 가져오거나 별도 조회
          setRosterStatus("draft");
        }
      } catch (error) {
        console.error("[선수 명단] 신청 정보 조회 실패:", error);
        toast.error("신청 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [tournamentId, teamId, navigate]);

  // 🔥 권한 확인: 팀장만 접근 가능
  useEffect(() => {
    if (!user || !application) return;
    
    // TODO: teamId를 통해 팀장 확인
    // 현재는 임시로 통과
  }, [user, application]);

  const handleAddPlayer = () => {
    setEditingPlayer(null);
    setShowAddModal(true);
  };

  const handleEditPlayer = (player: RosterPlayer) => {
    setEditingPlayer(player);
    setShowAddModal(true);
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm("선수를 삭제하시겠습니까?")) return;
    
    try {
      // TODO: rosterRepository.deletePlayer 호출
      setPlayers(players.filter((p) => p.id !== playerId));
      toast.success("선수가 삭제되었습니다.");
    } catch (error) {
      console.error("[선수 명단] 삭제 실패:", error);
      toast.error("선수 삭제에 실패했습니다.");
    }
  };

  const handleSaveDraft = async () => {
    try {
      // TODO: rosterRepository.saveDraft 호출
      toast.success("임시 저장되었습니다.");
    } catch (error) {
      console.error("[선수 명단] 임시 저장 실패:", error);
      toast.error("임시 저장에 실패했습니다.");
    }
  };

  const handleSubmit = async () => {
    if (players.length === 0) {
      toast.error("최소 1명의 선수를 등록해야 합니다.");
      return;
    }

    if (!confirm("명단을 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.")) return;

    try {
      // TODO: rosterRepository.submitRoster 호출
      setRosterStatus("submitted");
      toast.success("명단이 제출되었습니다.");
    } catch (error) {
      console.error("[선수 명단] 제출 실패:", error);
      toast.error("명단 제출에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-600">신청 정보를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate("/mypage")} className="mt-4">
            마이페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 🔥 승인 전 상태
  if (application.status?.toUpperCase() !== "APPROVED") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/mypage")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>

          <Card>
            <CardContent className="py-8 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <h2 className="text-lg font-semibold mb-2">승인 대기 중입니다</h2>
              <p className="text-sm text-gray-600 mb-4">
                협회 승인 후 선수 명단을 등록할 수 있습니다.
              </p>
              <Badge variant="secondary">
                {application.status?.toUpperCase() === "PENDING" ? "⏳ 대기" : "❌ 반려"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        {/* 헤더 */}
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/mypage")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
          <h1 className="text-xl font-semibold">선수 명단 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            현재 등록 인원: {players.length} / 12명
          </p>
        </div>

        {/* 상태 배너 */}
        {rosterStatus === "draft" && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⏳</span>
                <div>
                  <p className="text-sm font-medium">선수 명단 제출 전입니다</p>
                  <p className="text-xs text-gray-600">(마감: 3월 10일)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {rosterStatus === "submitted" && (
          <Card className="mb-4 border-green-200 bg-green-50">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <p className="text-sm font-medium">명단 제출 완료</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 선수 리스트 */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">선수 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500">
                등록된 선수가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{player.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {player.birthDate} {player.position && `• ${player.position}`}
                      </div>
                    </div>
                    {rosterStatus === "draft" && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPlayer(player)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePlayer(player.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 선수 추가 버튼 */}
        {rosterStatus === "draft" && (
          <Button
            onClick={handleAddPlayer}
            className="w-full mb-4"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            선수 추가
          </Button>
        )}

        {/* 하단 고정 버튼 */}
        {rosterStatus === "draft" && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-2xl mx-auto">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                임시 저장
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                disabled={players.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                명단 제출
              </Button>
            </div>
          </div>
        )}

        {/* 선수 추가/수정 모달 */}
        {showAddModal && (
          <PlayerAddModal
            player={editingPlayer}
            onClose={() => setShowAddModal(false)}
            onSave={(player) => {
              if (editingPlayer) {
                // 수정
                setPlayers(players.map((p) => (p.id === player.id ? player : p)));
              } else {
                // 추가
                setPlayers([...players, player]);
              }
              setShowAddModal(false);
              toast.success(editingPlayer ? "선수 정보가 수정되었습니다." : "선수가 추가되었습니다.");
            }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 선수 추가/수정 모달
 */
function PlayerAddModal({
  player,
  onClose,
  onSave,
}: {
  player: RosterPlayer | null;
  onClose: () => void;
  onSave: (player: RosterPlayer) => void;
}) {
  const [name, setName] = useState(player?.name || "");
  const [birthDate, setBirthDate] = useState(player?.birthDate || "");
  const [position, setPosition] = useState(player?.position || "");
  const [phone, setPhone] = useState(player?.phone || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !birthDate) {
      toast.error("이름과 생년월일은 필수입니다.");
      return;
    }

    onSave({
      id: player?.id || `player-${Date.now()}`,
      name: name.trim(),
      birthDate,
      position: position || undefined,
      phone: phone || undefined,
      status: "active",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-none md:max-w-3xl">
        <CardHeader>
          <CardTitle>{player ? "선수 정보 수정" : "선수 추가"}</CardTitle>
        </CardHeader>
        <CardContent>
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
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                생년월일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">포지션</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                취소
              </Button>
              <Button type="submit" className="flex-1">
                {player ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
