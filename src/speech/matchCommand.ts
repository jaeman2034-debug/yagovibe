// src/speech/matchCommand.ts
// 🔥 Phase 3-2: 명령 매칭 로직 (단순 키워드 매칭)

import type { SpeechCommand } from "./commands/types";

export function matchCommand(
  transcript: string,
  commands: SpeechCommand[]
): SpeechCommand | null {
  const normalized = transcript.replace(/\s/g, "").toLowerCase();

  return (
    commands.find((cmd) =>
      cmd.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
    ) ?? null
  );
}

