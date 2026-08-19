import { useLayoutEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ImmersiveMatchShell } from "@/components/unified/ImmersiveMatchShell";
import { MatchGameCanvas } from "@/components/unified/MatchGameCanvas";
import { PlaygroundGameOverlay } from "@/components/playground/PlaygroundGameOverlay";
import { syncPlaygroundControlFromOfflineMode } from "@/game/unified/matchGameBootstrap";
import { parseGameEntrySearchParams } from "@/game/unified/routes";
import type { MatchMode } from "@/game/unified/types";

function resolveOfflineMode(mode: MatchMode | null): "demo" | "practice" {
  return mode === "practice" ? "practice" : "demo";
}

/**
 * TRACK 9A canonical 1v1 entry — demo (default) or practice via ?mode=
 * Shell: ImmersiveMatchShell · Body: MatchGameCanvas · HUD: PlaygroundGameOverlay
 */
export default function Game1v1Page() {
  const [searchParams] = useSearchParams();
  const { mode: urlMode } = parseGameEntrySearchParams(`?${searchParams.toString()}`);
  const offlineMode = resolveOfflineMode(urlMode);

  useLayoutEffect(() => {
    syncPlaygroundControlFromOfflineMode(offlineMode);
  }, [offlineMode]);

  return (
    <ImmersiveMatchShell variant="relative">
      <MatchGameCanvas className="absolute inset-0 h-full w-full" mode={offlineMode} />
      <PlaygroundGameOverlay entryMode={offlineMode} />
    </ImmersiveMatchShell>
  );
}
