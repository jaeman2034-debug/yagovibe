/**
 * 🔥 OpenAI 클라이언트 중앙 집중식 Lazy Initialization
 *
 * 배포 시 코드 로드/분석 단계에서 `openai` npm 패키지가 로드되지 않도록
 * 최초 호출 시점에만 require 합니다.
 *
 * 환경변수: Firebase Console → Functions → Environment variables 의 OPENAI_API_KEY
 */

import type OpenAI from "openai";

let client: OpenAI | null = null;

/** 환경변수·레거시 functions.config()에서 API 키만 조회 (클라이언트 생성 없음) */
export function resolveOpenAIApiKey(): string | undefined {
  let apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const functions = require("firebase-functions");
      apiKey = functions.config()?.openai?.key;
    } catch {
      // ignore
    }
  }
  return apiKey;
}

export function getOpenAIClient(): OpenAI {
  if (!client) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("openai") as typeof import("openai");
    const OpenAIConstructor = mod.default;

    const apiKey = resolveOpenAIApiKey();

    if (!apiKey) {
      console.warn("[OpenAI] Missing OPENAI_API_KEY. Set Functions env or legacy functions.config().openai.key");
    }

    client = new OpenAIConstructor({ apiKey: apiKey || "" });
  }
  return client;
}
