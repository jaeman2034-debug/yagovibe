/**
 * 선수 리스트 컴포넌트
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PlayerItem } from "./PlayerItem";
import { AddPlayerModal } from "./AddPlayerModal";
import { toast } from "sonner";
import type { RosterPlayer } from "@/hooks/useRoster";

interface PlayerListProps {
  players: RosterPlayer[];
  editable: boolean;
  applicationId?: string;
}

export function PlayerList({ players, editable, applicationId }: PlayerListProps) {
  const [editingPlayer, setEditingPlayer] = useState<RosterPlayer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEdit = (player: RosterPlayer) => {
    setEditingPlayer(player);
    setShowEditModal(true);
  };

  const handleDelete = async (playerId: string) => {
    if (!confirm("선수를 삭제하시겠습니까?")) return;

    try {
      // TODO: rosterRepository.deletePlayer 호출
      toast.success("선수가 삭제되었습니다.");
    } catch (error) {
      console.error("[선수 명단] 삭제 실패:", error);
      toast.error("선수 삭제에 실패했습니다.");
    }
  };

  if (players.length === 0) {
    return (
      <Card className="mb-4">
        <CardContent className="py-8 text-center text-sm text-gray-500">
          아직 등록된 선수가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <CardContent className="py-4">
          <ul className="space-y-2">
            {players.map((player) => (
              <PlayerItem
                key={player.id}
                player={player}
                editable={editable}
                onEdit={editable ? handleEdit : undefined}
                onDelete={editable ? handleDelete : undefined}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      {showEditModal && editingPlayer && applicationId && (
        <AddPlayerModal
          player={editingPlayer}
          onClose={() => {
            setShowEditModal(false);
            setEditingPlayer(null);
          }}
          onSave={() => {
            setShowEditModal(false);
            setEditingPlayer(null);
          }}
          applicationId={applicationId}
        />
      )}
    </>
  );
}
