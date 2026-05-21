/**
 * 🛡️ Graceful Degrade
 * 운영 디그레이드 전략
 * "무조건 실행" 원칙
 */

import * as logger from 'firebase-functions/logger';
import type { ServerInstruction } from '../executor/searchAndNavigate';

/**
 * Graceful Degrade 우선순위
 * 1. NAVIGATE 성공 → 최고
 * 2. NAVIGATE 실패 → SEARCH로 전환
 * 3. Places 쿼터/실패 → SEARCH로 전환
 * 4. LLM 실패 → SEARCH(raw)로 전환
 */

/**
 * NAVIGATE → SEARCH 디그레이드
 */
export function degradeNavigateToSearch(
  query: string,
  reason: string
): ServerInstruction {
  logger.warn(`🛡️ NAVIGATE → SEARCH 디그레이드: ${reason}`);
  return { kind: 'OPEN_SEARCH', query };
}

/**
 * Places 쿼터 초과 디그레이드
 */
export function degradePlacesQuota(query: string): ServerInstruction {
  logger.warn('🛡️ Places 쿼터 초과, SEARCH로 디그레이드');
  return { kind: 'OPEN_SEARCH', query };
}

/**
 * Ultimate Fallback (절대 NOOP 금지)
 */
export function ultimateFallback(finalText: string): ServerInstruction {
  logger.warn('🛡️ Ultimate Fallback 실행');
  return { kind: 'OPEN_SEARCH', query: finalText || '지도' };
}
