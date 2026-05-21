/**
 * 허브·프로필 XP 바용.
 * 임계값은 서버 `functions/src/lib/avatar/avatarXpConfig.ts`의 `levelFromTotalXp`와 반드시 동일해야 함 — drift 시 양쪽 수정.
 * (추후 공유 패키지로 단일 소스화 권장.)
 */
export function avatarLevelFromTotalXp(totalXp: number): number {
  const x = Math.max(0, Math.floor(Number(totalXp) || 0));
  if (x >= 500) return 4;
  if (x >= 250) return 3;
  if (x >= 100) return 2;
  return 1;
}

export type AvatarXpBarState = {
  /** 현재 레벨 구간 시작 XP */
  segmentStart: number;
  /** 다음 레벨 문턱 XP (없으면 만렙) */
  nextThreshold: number | null;
  /** segmentStart ~ nextThreshold 구간에서의 진행 비율 0~1 */
  ratio: number;
};

export function avatarXpBarState(totalXp: number): AvatarXpBarState {
  const x = Math.max(0, Math.floor(Number(totalXp) || 0));
  if (x >= 500) return { segmentStart: 500, nextThreshold: null, ratio: 1 };
  if (x >= 250) return { segmentStart: 250, nextThreshold: 500, ratio: (x - 250) / (500 - 250) };
  if (x >= 100) return { segmentStart: 100, nextThreshold: 250, ratio: (x - 100) / (250 - 100) };
  return { segmentStart: 0, nextThreshold: 100, ratio: x / 100 };
}
