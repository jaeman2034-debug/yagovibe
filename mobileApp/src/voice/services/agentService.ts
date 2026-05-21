/**
 * 🧠 Agent Service
 * 단일 Agent 호출 및 관리
 */

import type { AgentResponse, MemoryItem } from '../types';

const AGENT_ENDPOINT =
  'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/agent';

/**
 * Voice Agent 호출 (통합 Agent)
 */
export async function callAgent(
  userText: string,
  memorySummary: string,
  memoryCount: number
): Promise<AgentResponse> {
  const resp = await fetch(AGENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userText,
      memorySummary,
      memoryCount,
    }),
  });

  if (!resp.ok) {
    const errorData = await resp.json();
    // Fallback 응답 반환
    if (errorData.fallback) {
      return errorData.fallback;
    }
    throw new Error('Agent API failed');
  }

  return resp.json();
}
