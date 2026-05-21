const STORAGE_KEY = "yago_play_feedback_prompts_v1";

export type PlayFeedbackPromptEntry = {
  teamId: string;
  matchId: string;
  ts: number;
};

function parseList(): PlayFeedbackPromptEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const n = JSON.parse(raw) as unknown;
    return Array.isArray(n) ? (n as PlayFeedbackPromptEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: PlayFeedbackPromptEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

/** 경기 완료 직후 — 플레이 피드백 유도(인앱) */
export function enqueuePlayFeedbackPrompt(teamId: string, matchId: string): void {
  const tid = teamId.trim();
  const mid = matchId.trim();
  if (!tid || !mid) return;
  const prev = parseList().filter((e) => !(e.teamId === tid && e.matchId === mid));
  save([{ teamId: tid, matchId: mid, ts: Date.now() }, ...prev]);
}

export function listPlayFeedbackPromptsForTeam(teamId: string): PlayFeedbackPromptEntry[] {
  const tid = teamId.trim();
  if (!tid) return [];
  return parseList().filter((e) => e.teamId === tid);
}

export function dismissPlayFeedbackPrompt(teamId: string, matchId: string): void {
  const tid = teamId.trim();
  const mid = matchId.trim();
  save(parseList().filter((e) => !(e.teamId === tid && e.matchId === mid)));
}

export function peekNextPlayFeedbackPrompt(teamId: string): PlayFeedbackPromptEntry | undefined {
  return listPlayFeedbackPromptsForTeam(teamId)[0];
}
