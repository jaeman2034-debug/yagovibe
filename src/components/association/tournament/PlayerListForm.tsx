/**
 * 선수 명단 제출 폼 컴포넌트
 * 
 * 선수 추가 조건:
 * - 대한축구협회(KFA) 조인 시스템 등록 회원만 가능
 * - 선수 ID 입력 → 시스템 대조
 * 
 * 제출 후 수정 ❌ (Admin만 가능)
 */

import { useState } from "react";
import type { TournamentPlayer } from "@/types/tournament";

interface PlayerListFormProps {
  players: TournamentPlayer[];
  submitted: boolean;
  onSubmit: (players: TournamentPlayer[]) => void;
  onAddPlayer: (player: TournamentPlayer) => void;
  onRemovePlayer: (playerId: string) => void;
  loading?: boolean;
}

export function PlayerListForm({
  players,
  submitted,
  onSubmit,
  onAddPlayer,
  onRemovePlayer,
  loading = false,
}: PlayerListFormProps) {
  const [kfaId, setKfaId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // KFA 검증 (서버 API 호출)
  const verifyKFA = async (kfaId: string): Promise<{ success: boolean; name?: string }> => {
    // TODO: 실제 KFA API 연동
    setVerifying(true);
    setError(null);
    
    try {
      // 실제로는 서버 API 호출
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // 임시: 항상 성공 (실제로는 API 응답 확인)
      // 서버 검증 기준:
      // - KFA 미등록: return { success: false }
      // - 출전 정지: return { success: false }
      // - 정상: return { success: true, name: "선수명" }
      
      setVerifying(false);
      return { success: true, name: "선수명" }; // 실제로는 API에서 받은 이름
    } catch (error) {
      setVerifying(false);
      return { success: false };
    }
  };

  const handleAddPlayer = async () => {
    if (!kfaId.trim()) {
      setError("선수 KFA 등록 ID를 입력해주세요.");
      return;
    }

    const result = await verifyKFA(kfaId.trim());
    
    if (!result.success) {
      setError("등록할 수 없는 선수입니다.");
      return;
    }

    const newPlayer: TournamentPlayer = {
      id: Date.now().toString(),
      name: result.name || kfaId.trim(), // API에서 받은 이름 또는 KFA ID
      kfaId: kfaId.trim(),
      kfaVerified: true,
    };

    onAddPlayer(newPlayer);
    setKfaId("");
    setError(null);
  };

  const handleSubmit = () => {
    if (players.length === 0) {
      alert("최소 1명의 선수를 등록해주세요.");
      return;
    }
    onSubmit(players);
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium">
            선수 명단 제출이 완료되었습니다.
            <br />
            이후 수정은 불가합니다.
          </p>
        </div>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
            >
              <div>
                <span className="font-medium">{player.name}</span>
                {player.kfaId && (
                  <span className="ml-2 text-sm text-gray-500">
                    (KFA ID: {player.kfaId})
                  </span>
                )}
              </div>
              {player.kfaVerified && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  ✓ 검증됨
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">선수 명단</h3>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-700">
            대한축구협회(KFA) 조인 시스템에 등록된 선수만 등록 가능합니다.
          </p>
        </div>

        {/* 선수 추가 (입력 최소: KFA 등록 ID만) */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="선수 KFA 등록 ID 입력"
              value={kfaId}
              onChange={(e) => {
                setKfaId(e.target.value);
                setError(null);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleAddPlayer();
                }
              }}
            />
            <button
              onClick={handleAddPlayer}
              disabled={verifying || !kfaId.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {verifying ? "검증 중..." : "추가"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* 선수 목록 */}
        {players.length > 0 && (
          <div className="space-y-2 mb-4">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
              >
                <div>
                  <span className="font-medium">{player.name}</span>
                  {player.kfaId && (
                    <span className="ml-2 text-sm text-gray-500">
                      (KFA ID: {player.kfaId})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {player.kfaVerified && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      ✓ 검증됨
                    </span>
                  )}
                  <button
                    onClick={() => onRemovePlayer(player.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || players.length === 0}
          className="w-full bg-black text-white py-2 disabled:opacity-50"
        >
          {loading ? "제출 중..." : "선수 명단 제출"}
        </button>
      </div>
    </div>
  );
}

