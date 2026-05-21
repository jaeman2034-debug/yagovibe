/**
 * 선수 명단 섹션 컴포넌트
 * 
 * 제출 규칙:
 * - 제출 후 잠금
 * - 수정은 Admin만
 */

import type { TournamentPlayer } from "@/types/tournament";
import { PlayerListForm } from "./PlayerListForm";

interface RosterSectionProps {
  players: TournamentPlayer[];
  submitted: boolean;
  canEdit: boolean;
  onSubmit: (players: TournamentPlayer[]) => void;
  onAddPlayer: (player: TournamentPlayer) => void;
  onRemovePlayer: (playerId: string) => void;
  loading?: boolean;
}

export function RosterSection({
  players,
  submitted,
  canEdit,
  onSubmit,
  onAddPlayer,
  onRemovePlayer,
  loading = false,
}: RosterSectionProps) {
  // 확정 전에는 선수 명단 UI 자체 없음
  if (!canEdit && !submitted) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">선수 명단</h3>
      
      {canEdit ? (
        <PlayerListForm
          players={players}
          submitted={submitted}
          onSubmit={onSubmit}
          onAddPlayer={onAddPlayer}
          onRemovePlayer={onRemovePlayer}
          loading={loading}
        />
      ) : (
        <div className="space-y-2">
          {players.length === 0 ? (
            <p className="text-gray-500">등록된 선수가 없습니다.</p>
          ) : (
            players.map((player) => (
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
            ))
          )}
        </div>
      )}
    </div>
  );
}

