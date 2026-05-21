import { useCallback, useRef } from "react";
import { clearPlaygroundMove, setPlaygroundMove } from "@/game/playground/playgroundInput";

const MAX_RADIUS = 44;

type Props = {
  className?: string;
};

/** 좌측 가상 조이스틱 — 터치 이동 벡터 */
export function PlaygroundVirtualJoystick({ className }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const resetStick = useCallback(() => {
    const stick = stickRef.current;
    if (stick) {
      stick.style.transform = "translate(-50%, -50%)";
    }
    clearPlaygroundMove();
  }, []);

  const moveStick = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - center.current.x;
    const dy = clientY - center.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 0 ? Math.cos(angle) * (clamped / MAX_RADIUS) : 0;
    const ny = dist > 0 ? Math.sin(angle) * (clamped / MAX_RADIUS) : 0;

    setPlaygroundMove(nx, ny);

    const stick = stickRef.current;
    if (stick) {
      const ox = Math.cos(angle) * clamped;
      const oy = Math.sin(angle) * clamped;
      stick.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
    }
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (pointerId.current != null) return;
    const base = baseRef.current;
    if (!base) return;
    pointerId.current = e.pointerId;
    base.setPointerCapture(e.pointerId);
    const rect = base.getBoundingClientRect();
    center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    moveStick(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    moveStick(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerId.current) return;
    pointerId.current = null;
    resetStick();
  };

  return (
    <div
      ref={baseRef}
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="group"
      aria-label="이동 조이스틱"
    >
      <div
        className="absolute inset-0 rounded-full border border-cyan-500/25 bg-cyan-950/40 backdrop-blur-sm"
        aria-hidden
      />
      <div
        ref={stickRef}
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border-2 border-cyan-400/60 bg-gradient-to-br from-cyan-500/80 to-indigo-600/80 shadow-lg shadow-cyan-900/50"
        style={{ transform: "translate(-50%, -50%)" }}
        aria-hidden
      />
    </div>
  );
}
