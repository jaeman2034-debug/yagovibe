import { useEffect, useState } from "react";
import { loadPlayerGrowthAvatar } from "@/lib/ai-growth/playerGrowthAvatarService";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export function usePlayerGrowthAvatar(
  teamId: string | undefined,
  playerName: string,
  playerId?: string
) {
  const [avatar, setAvatar] = useState<PlayerGrowthAvatarDoc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const name = playerName.trim();
    if (!teamId || !name) {
      setAvatar(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void loadPlayerGrowthAvatar(teamId, name, playerId)
      .then((doc) => {
        if (!cancelled) setAvatar(doc);
      })
      .catch((error) => {
        if (!cancelled) setAvatar(null);
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: unknown }).code ?? "")
            : "";
        if (code.includes("permission-denied")) {
          console.warn("[playerGrowthAvatar] read skipped — insufficient permissions", { teamId, name });
          return;
        }
        console.warn("[playerGrowthAvatar] load failed", error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, playerName, playerId]);

  return { avatar, loading };
}
