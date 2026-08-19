import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ImmersiveMatchShellVariant = "relative" | "fixed";

export type ImmersiveMatchShellProps = {
  children: ReactNode;
  /**
   * `relative` — child of MainLayout outlet (`/game/1v1`)
   * `fixed` — full viewport under app chrome (`/game/session/:id` root)
   */
  variant?: ImmersiveMatchShellVariant;
  className?: string;
};

/**
 * TRACK 9A Phase C-2 — shared immersive viewport for offline 1v1 + live 1v1.
 * Ownership: shell = layout chrome; Match*Canvas = Phaser; *Overlay = HUD/input.
 */
export function ImmersiveMatchShell({
  children,
  variant = "relative",
  className,
}: ImmersiveMatchShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-[#070b14]",
        variant === "fixed"
          ? "fixed inset-0 z-0"
          : "relative isolate h-[100dvh] min-h-[100dvh] w-full",
        className,
      )}
    >
      {children}
    </div>
  );
}
