/** joinQueue 실패 시 자동 재시도하면 안 되는 메시지 (배포·모드 불일치 등) */
export function isNonRetryableMatchmakingJoinError(message: string | null | undefined): boolean {
  if (!message?.trim()) return false;
  const m = message.trim();
  if (/mode는\s*5v5\s*또는\s*8v8/i.test(m)) return true;
  if (/mode는\s*1v1,\s*5v5,\s*8v8/i.test(m)) return false;
  if (/mode는/i.test(m) && /이어야 합니다/i.test(m)) return true;
  if (/로그인이 필요/i.test(m)) return true;
  if (/유효한 clientId/i.test(m)) return true;
  return false;
}

export function matchmakingDeployHintForError(message: string | null | undefined): string | null {
  if (!message || !/mode는\s*5v5\s*또는\s*8v8/i.test(message)) return null;
  return "서버 Functions가 아직 1v1을 지원하지 않습니다. functions 빌드·배포 후 다시 시도하거나, 지금은 /matchmaking 에서 5v5 큐로 테스트하세요.";
}
