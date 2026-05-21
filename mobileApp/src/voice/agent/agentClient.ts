/**
 * 🧠 Agent Client
 * 서버 Agent 호출 전용
 * 모바일에 LLM 없음, 항상 서버에 위임
 */

import { callAgent } from '../services/agentService';
import type { AgentResponse, MemoryItem } from '../types';

/**
 * Agent 실행 (서버 호출)
 */
export async function runAgent(
  finalText: string,
  memorySummary: string,
  memoryCount: number
): Promise<AgentResponse> {
  return callAgent(finalText, memorySummary, memoryCount);
}
