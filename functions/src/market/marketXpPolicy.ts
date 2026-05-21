/**
 * 마켓 거래 완료 XP — 추후 가격/카테고리/이벤트 배율 확장용 단일 진입점
 */
import { XP_POLICY } from "../config/xpPolicy";

export type MarketPostLike = Record<string, unknown>;

/**
 * 거래 완료 시 판매자에게 부여할 XP (정수, ≥0)
 */
export function getMarketTransactionXpReward(_post: MarketPostLike): number {
  // 추후: _post.category, _post.price, 시즌 이벤트 등 반영
  return Math.max(0, Math.floor(XP_POLICY.MARKET.COMPLETE_BASE_XP));
}
