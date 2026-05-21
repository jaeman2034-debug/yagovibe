/**
 * 🚀 Execute Intent Service
 * Intent 실행 (Search → Select → Navigate)
 */

import type { ExecuteIntentResponse, AgentResponse } from '../types';

const EXECUTE_INTENT_ENDPOINT =
  'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/executeIntent';

/**
 * Execute Intent 호출
 */
export async function callExecuteIntent(
  intent: {
    type: string;
    query: string;
    filters: any;
    autoNavigate: boolean;
    confidence: number;
  },
  text: string
): Promise<ExecuteIntentResponse> {
  const resp = await fetch(EXECUTE_INTENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent, text }),
  });

  if (!resp.ok) {
    throw new Error('Execute Intent API failed');
  }

  return resp.json();
}
