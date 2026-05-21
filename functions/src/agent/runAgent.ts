/**
 * 🧠 Run Agent
 * Agent 실행 (Structured Output)
 */

import { AGENT_SYSTEM_PROMPT } from "./systemPrompt";
import { agentSchema } from "./agentSchema";
import { retryWithBackoff } from "../utils/retry";
import { withTimeout, DEFAULT_TIMEOUT_MS } from "../utils/timeout";

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: any = null;
async function getOpenAIClient(): Promise<any> {
  if (!openaiClient) {
    const OpenAI = (await import("openai")).default;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    openaiClient = new OpenAI({
      apiKey,
    });
  }
  return openaiClient;
}

export interface RunAgentParams {
  userText: string;
  memorySummary?: string;
  memoryCount?: number;
}

export interface AgentResult {
  action: "SEARCH" | "NAVIGATE" | "REPEAT_LAST" | "SEARCH_ALTERNATIVE" | "NONE";
  query: string;
  filters: {
    openNow: boolean;
    parking: boolean;
    sort: "NEAREST" | "BEST_RATED" | "DEFAULT";
  };
}

/**
 * Agent 실행 (Structured Output)
 */
export async function runAgent(params: RunAgentParams): Promise<AgentResult> {
  const { userText, memorySummary = "", memoryCount = 0 } = params;

  const openai = await getOpenAIClient();

  const memoryContext =
    memorySummary && memoryCount > 0
      ? `\n\n최근 기록:\n${memorySummary}`
      : "";

  // Rate Limit 재시도 + 타임아웃
  const completion = await withTimeout(
    retryWithBackoff(
      async () => {
        return await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: AGENT_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: `사용자 말:\n${userText}${memoryContext}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "agent_action",
              schema: agentSchema,
              strict: true,
            },
          },
          temperature: 0,
        });
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        shouldRetry: (error: any) => {
          const status = error?.status || error?.response?.status;
          return status === 429 || status === 503;
        },
      }
    ),
    DEFAULT_TIMEOUT_MS,
    "Agent timeout"
  );

  const responseContent = completion.choices[0]?.message?.content;
  if (!responseContent) {
    throw new Error("No response from OpenAI");
  }

  const agentResult = JSON.parse(responseContent);

  // 스키마 검증
  if (!agentResult.action || !agentResult.query || !agentResult.filters) {
    throw new Error("Invalid agent structure");
  }

  return agentResult;
}
