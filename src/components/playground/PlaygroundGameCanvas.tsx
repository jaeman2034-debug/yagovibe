import { useEffect, useRef } from "react";
import { createPlaygroundGame, type PlaygroundGameHandle } from "@/game/playground/createPlaygroundGame";

type Props = {
  className?: string;
};

export function PlaygroundGameCanvas({ className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PlaygroundGameHandle | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const handle = createPlaygroundGame(host);
    gameRef.current = handle;

    return () => {
      handle.destroy();
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden />;
}
