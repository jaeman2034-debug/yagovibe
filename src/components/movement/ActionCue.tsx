/**
 * 🎨 ActionCue 컴포넌트
 * 
 * Figma: ActionCue (Variant: Straight / TurnLeft / TurnRight / UTurn)
 * 이동 중 하단 액션 표시 (한 행동만)
 */

// GeneralMapPage의 ActionType과 호환
type ActionType = "straight" | "left" | "right" | "uturn" | "merge" | "roundabout";

interface ActionCueProps {
  type: ActionType;
  instruction: string;
  distance: string;
}

const ACTION_ICONS: Record<string, string> = {
  straight: "⬆️",
  left: "⬅️",
  right: "➡️",
  uturn: "↩️",
  merge: "↗️",
  roundabout: "🔄",
};

export function ActionCue({ type, instruction, distance }: ActionCueProps) {
  const icon = ACTION_ICONS[type] || "⬆️";
  const shortInstruction = instruction.length > 20 
    ? instruction.substring(0, 20) + "..."
    : instruction;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-md rounded-xl bg-white/95 backdrop-blur-md px-4 py-3 shadow-xl border border-gray-200">
      <div className="flex items-center justify-center gap-2">
        <span className="text-lg">{icon}</span>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">{shortInstruction}</p>
          <p className="text-xs text-gray-600 mt-0.5">{distance}</p>
        </div>
      </div>
    </div>
  );
}
