import { useCallback, useRef, useState, type CSSProperties } from "react";
import type { PlayInputActions } from "@/lib/play/PlayInputActions";

const MAX_RADIUS = 44;

type Props = {
  input: PlayInputActions;
  className?: string;
  style?: CSSProperties;
};

export function TeamMatchVirtualJoystick({ input, className, style }: Props) {
  const [pressed, setPressed] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const resetStick = useCallback(() => {
    const stick = stickRef.current;
    if (stick) stick.style.transform = "translate(-50%, -50%)";
    input.move({ x: 0, y: 0 });
  }, [input]);

  const moveStick = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - center.current.x;
      const dy = clientY - center.current.y;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, MAX_RADIUS);
      const angle = Math.atan2(dy, dx);
      const nx = dist > 0 ? Math.cos(angle) * (clamped / MAX_RADIUS) : 0;
      const ny = dist > 0 ? Math.sin(angle) * (clamped / MAX_RADIUS) : 0;
      input.move({ x: nx, y: ny });

      const stick = stickRef.current;
      if (stick) {
        const ox = Math.cos(angle) * clamped;
        const oy = Math.sin(angle) * clamped;
        stick.style.transform = `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`;
      }
    },
    [input],
  );

  return (
    <div
      ref={baseRef}
      className={`${className ?? ""} transition-transform ${pressed ? "scale-95" : "scale-100"}`}
      style={style}
      onPointerDown={(e) => {
        if (pointerId.current != null) return;
        const base = baseRef.current;
        if (!base) return;
        pointerId.current = e.pointerId;
        base.setPointerCapture(e.pointerId);
        const rect = base.getBoundingClientRect();
        center.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        setPressed(true);
        moveStick(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerId.current !== e.pointerId) return;
        moveStick(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (pointerId.current !== e.pointerId) return;
        pointerId.current = null;
        setPressed(false);
        resetStick();
      }}
      onPointerCancel={(e) => {
        if (pointerId.current !== e.pointerId) return;
        pointerId.current = null;
        setPressed(false);
        resetStick();
      }}
    >
      <div className="absolute inset-0 rounded-full border border-cyan-500/30 bg-cyan-500/10" />
      <div
        ref={stickRef}
        className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/80 shadow-lg shadow-cyan-500/30"
        style={{ transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}
