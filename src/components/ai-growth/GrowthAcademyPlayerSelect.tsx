import { Loader2 } from "lucide-react";
import { growthPlayerSelectLabel } from "@/lib/ai-growth/growthSelectedPlayer";
import type { GrowthSelectedPlayer } from "@/lib/ai-growth/growthSelectedPlayer";

type Props = {
  players: GrowthSelectedPlayer[];
  selectedPlayerId: string;
  onSelectPlayerId: (playerId: string) => void;
  loading?: boolean;
  error?: string | null;
};

export function GrowthAcademyPlayerSelect({
  players,
  selectedPlayerId,
  onSelectPlayerId,
  loading,
  error,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        아카데미 명단 불러오는 중…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (players.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        등록된 선수가 없습니다. 팀 <strong>명단</strong> 탭에서 선수를 먼저 추가한 뒤 Growth 분석을
        진행하세요.
      </div>
    );
  }

  const selected = players.find((p) => p.playerId === selectedPlayerId);

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-semibold text-gray-800">선수 선택 (아카데미 명단)</span>
        <select
          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base"
          value={selectedPlayerId}
          onChange={(e) => onSelectPlayerId(e.target.value)}
        >
          {players.map((p) => (
            <option key={p.playerId} value={p.playerId}>
              {growthPlayerSelectLabel(p)}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="text-xs text-gray-500">
          playerId: <code className="text-[11px]">{selected.playerId}</code>
          {" · "}
          보호자 연결·Delivery는 이 ID와 동일하게 저장됩니다.
        </p>
      ) : null}
    </div>
  );
}
