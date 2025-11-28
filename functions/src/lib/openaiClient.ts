/**
 * 🔥 OpenAI 클라이언트 중앙 집중식 Lazy Initialization
 * 
 * Firebase Functions 배포 시 코드 분석 단계에서
 * API 키가 없어도 오류가 발생하지 않도록 지연 초기화 사용
 * 
 * 사용법:
 * import { getOpenAIClient } from "./lib/openaiClient";
 * const openai = getOpenAIClient();
 * 
 * 환경변수 설정:
 * - Firebase Console > Functions > Configuration > Environment variables
 * - 또는 .env 파일 (로컬 개발용)
 */

import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    // Firebase Functions 환경변수 우선순위:
    // 1. process.env.OPENAI_API_KEY (환경변수 - Firebase Console에서 설정)
    // 2. functions.config().openai.key (레거시 방식, 2026년 3월 이후 사용 불가)
    let apiKey = process.env.OPENAI_API_KEY;
    
    // 레거시 functions.config() 지원 (deprecated, 2026년 3월 이후 제거 예정)
    if (!apiKey) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const functions = require("firebase-functions");
        apiKey = functions.config()?.openai?.key;
      } catch (e) {
        // firebase-functions가 없거나 config가 없는 경우 무시
      }
    }
    
    if (!apiKey) {
      console.warn("[OpenAI] Missing OPENAI_API_KEY. Please set it in:");
      console.warn("  Firebase Console > Functions > Configuration > Environment variables");
      console.warn("  or set OPENAI_API_KEY environment variable");
    }
    client = new OpenAI({ apiKey: apiKey || "" });
  }
  return client;
}

