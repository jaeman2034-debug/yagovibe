/**
 * 마켓 게시글 status 전이 — Firestore/OwnerActions와 동일 규칙
 */

export function canTransitionMarketPostStatus(
  from: string | undefined | null,
  to: string
): boolean {
  const fromKey = (from || "active").toLowerCase();
  const toKey = to.toLowerCase();
  const allowedTransitions: Record<string, string[]> = {
    active: ["reserved", "done", "hidden"],
    open: ["reserved", "done", "hidden"],
    reserved: ["open", "active", "done", "hidden"],
    done: ["hidden"],
    sold: ["hidden"],
    completed: ["hidden"],
    hidden: [],
  };
  const allowed =
    allowedTransitions[fromKey] ?? allowedTransitions.active ?? [];
  return allowed.includes(toKey);
}
