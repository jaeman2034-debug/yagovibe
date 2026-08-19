export const PLAY_MY_CARD_ANCHOR_ID = "yago-play-my-card";
export const PLAY_MVP_PANEL_ANCHOR_ID = "yago-play-mvp-panel";

/** 피드백 완료 CTA — lounge `<details>` 접힘 시 펼친 뒤 스크롤 */
export function scrollToPlayAnchor(anchorId: string): boolean {
  const el = document.getElementById(anchorId);
  if (!el) return false;

  const details = el.closest("details");
  if (details instanceof HTMLDetailsElement) {
    details.open = true;
  }

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}
