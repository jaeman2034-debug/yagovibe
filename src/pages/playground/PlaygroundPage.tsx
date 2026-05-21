import { PlaygroundGameCanvas } from "@/components/playground/PlaygroundGameCanvas";
import { PlaygroundGameOverlay } from "@/components/playground/PlaygroundGameOverlay";

/**
 * PHASE C — 2D Phaser 운동장 (싱글 플레이 MVP)
 * 모드 허브(PK·드리블 등): `/playground/hub`
 */
export default function PlaygroundPage() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#070b14]">
      <PlaygroundGameCanvas className="absolute inset-0 h-full w-full" />
      <PlaygroundGameOverlay />
    </div>
  );
}
