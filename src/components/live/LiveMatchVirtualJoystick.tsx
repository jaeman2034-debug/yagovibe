import { useCallback, useRef, useState, type CSSProperties } from "react";
import { clearLiveMatchMove, setLiveMatchMove } from "@/lib/live/liveMatchInput";

const MAX_RADIUS = 44;

type Props = {
  sessionId: string;
  className?: string;
  style?: CSSProperties;
};

export function LiveMatchVirtualJoystick({ sessionId, className, style }: Props) {
  const [pressed, setPressed] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const resetStick = useCallback(() => {
    const stick = stickRef.current;
    if (stick) stick.style.transform = "translate(-50%, -50%)";
    clearLiveMatchMove(sessionId);
  }, [sessionId]);

  const moveStick = useCallback((clientX: number, clientY: number) => {
    const dx = clientX - center.current.x;
    const dy = clientY - center.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = dist > 0 ? Math.cos(angle) * (clamped / MAX_RADIUS) : 0;
    const ny = dist > 0 ? Math.sin(angle) * (clamped / MAX_RADIUS) : 0;
    setLiveMatchMove(sessionId, nx, ny);

    const stick = stickRef.current;
    if (stick) {
      const ox = Math.cos(angle) * clamped;
      const oy = Math.sin(angle) * clamped;
      stick.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
    }
  }, [sessionId]);

  return (
    <div
      ref={baseRef}
      className={`${className ?? ""} transition-transform ${pressed ? "scale-95" : "scale-100"}`}
      style={style}
      onPointerDown={(e) => {
        if (pointerId.current != null) return;
        const base = baseRef.current;
        if (!base) return;
        setPressed(true);
        pointerId.current = e.pointerId;
        base.setPointerCapture(e.pointerId);
        const rect = base.getBoundingClientRect();
        center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        moveStick(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pointerId.current) return;
        moveStick(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pointerId.current) return;
        pointerId.current = null;
        setPressed(false);
        resetStick();
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== pointerId.current) return;
        pointerId.current = null;
        setPressed(false);
        resetStick();
      }}
      role="group"
      aria-label="이동 조이스틱"
    >
      <div
        className="absolute inset-0 rounded-full border border-cyan-500/25 bg-cyan-950/40 backdrop-blur-sm"
        aria-hidden
      />
      <div
        ref={stickRef}
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400/60 bg-cyan-500/30 shadow-lg"
        style={{ transform: "translate(-50%, -50%)" }}
        aria-hidden
      />
    </div>
  );
}
