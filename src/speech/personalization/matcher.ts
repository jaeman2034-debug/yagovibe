// src/speech/personalization/matcher.ts
// 🔥 Phase 7: 가중치 기반 매칭 (개인화)
// ✅ 기본 키워드 + 사용자 alias + 최근 intent 부스트

import type { SpeechCommand } from "../commands/types";
import type { UserVoiceProfile } from "./userProfile";
import { isRecentIntent, createIntentKey } from "./history";

interface MatchScore {
  command: SpeechCommand;
  score: number;
  reason: string;
}

/**
 * 가중치 기반 명령 매칭
 * 
 * 점수 계산:
 * - 기본 키워드 매칭: +1
 * - 사용자 alias 매칭: +2
 * - 최근 7일 내 사용 intent: +1
 * 
 * 👉 점수 높은 것만 실행
 */
export function matchCommandWithWeight(
  transcript: string,
  commands: SpeechCommand[],
  userProfile: UserVoiceProfile | null
): SpeechCommand | null {
  const normalized = transcript.replace(/\s/g, "").toLowerCase();
  const scores: MatchScore[] = [];

  for (const cmd of commands) {
    let score = 0;
    let reason = "";

    // 🔥 기본 키워드 매칭: +1
    for (const keyword of cmd.keywords) {
      const normalizedKeyword = keyword.replace(/\s/g, "").toLowerCase();
      if (normalized.includes(normalizedKeyword)) {
        score += 1;
        reason = `keyword:${keyword}`;
        break;
      }
    }

    // 🔥 사용자 alias 매칭: +2 (개인화 부스트)
    if (userProfile?.aliases) {
      for (const [alias, targetKeyword] of Object.entries(userProfile.aliases)) {
        const normalizedAlias = alias.replace(/\s/g, "").toLowerCase();
        if (normalized.includes(normalizedAlias)) {
          // alias가 targetKeyword와 매칭되는 command인지 확인
          const targetNormalized = targetKeyword.replace(/\s/g, "").toLowerCase();
          const cmdKeywords = cmd.keywords.map((k) => k.replace(/\s/g, "").toLowerCase());
          
          if (cmdKeywords.some((k) => k.includes(targetNormalized) || targetNormalized.includes(k))) {
            score += 2;
            reason = `alias:${alias}→${targetKeyword}`;
            break;
          }
        }
      }
    }

    // 🔥 최근 7일 내 사용 intent: +1 (히스토리 부스트)
    // command → intent key 매핑 (간단한 휴리스틱)
    if (userProfile) {
      // command의 첫 번째 키워드를 intent key로 사용 (간단한 예시)
      const intentKey = createIntentKey("COMMAND", { keyword: cmd.keywords[0] });
      if (isRecentIntent(intentKey, userProfile)) {
        score += 1;
        reason = reason ? `${reason}+recent` : "recent";
      }
    }

    if (score > 0) {
      scores.push({ command: cmd, score, reason });
    }
  }

  if (scores.length === 0) {
    return null;
  }

  // 🔥 점수 높은 것만 반환
  scores.sort((a, b) => b.score - a.score);
  const topScore = scores[0];

  // 🔥 Phase 7-5: 안전 가드 (최소 점수 체크)
  if (topScore.score < 1) {
    return null;
  }

  return topScore.command;
}

