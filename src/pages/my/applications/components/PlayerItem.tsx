/**
 * 선수 카드 아이템
 */

import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import type { RosterPlayer } from "@/hooks/useRoster";

interface PlayerItemProps {
  player: RosterPlayer;
  editable: boolean;
  onEdit?: (player: RosterPlayer) => void;
  onDelete?: (playerId: string) => void;
}

export function PlayerItem({ player, editable, onEdit, onDelete }: PlayerItemProps) {
  return (
    <li className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{player.name}</div>
        <div className="text-xs text-gray-600 mt-1">
          {player.birthDate}
          {player.position && ` • ${player.position}`}
          {player.phone && ` • ${player.phone}`}
        </div>
      </div>

      {editable && (
        <div className="flex gap-2">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(player)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(player.id)}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
