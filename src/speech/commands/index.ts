// src/speech/commands/index.ts
// 🔥 Phase 3-2: 명령 통합 관리

import { globalCommands } from "./global";
import { sportsHubCommands } from "./sportsHub";
import { marketCommands } from "./market";
import type { SpeechCommand } from "./types";

export function getCommandsByPath(pathname: string): SpeechCommand[] {
  if (pathname.startsWith("/sports-hub")) {
    return [...globalCommands, ...sportsHubCommands];
  }

  if (pathname.startsWith("/app/market")) {
    return [...globalCommands, ...marketCommands];
  }

  return globalCommands;
}
