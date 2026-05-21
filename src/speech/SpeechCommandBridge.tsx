// src/speech/SpeechCommandBridge.tsx
// 🔥 Phase 3-2: STT 결과 → Commands → Action 브리지 (실사용자용)

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { routeIntent } from "./IntentRouter";
import { dispatchIntent } from "./intentDispatcher";
import { speechManager } from "./SpeechManager";
import { logUnknownVoice } from "./telemetry";
import { getCommandsByPath } from "./commands";
import { matchCommand } from "./matchCommand";
import { matchCommandWithWeight } from "./personalization/matcher";
import { loadUserProfile, recordIntentUsage } from "./personalization/userProfile";
import type { UserVoiceProfile } from "./personalization/userProfile";
import { createIntentKey } from "./personalization/history";
import { canRecommend, isInRecommendCooldown } from "./recommendation/guard";
import { generateRecommendation } from "./recommendation/engine";
import { recommendationManager } from "./recommendation/manager";
import { SpeechUIAdapter } from "@/ui/speechUIAdapter";
import { useAuth } from "@/context/AuthProvider";
import { isMobileDevice } from "@/utils/deviceDetection";

export function SpeechCommandBridge({
  onSearch,
}: {
  onSearch?: (q: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // 🔥 Phase 7: 개인화 프로필 로드
  const [userProfile, setUserProfile] = useState<UserVoiceProfile | null>(null);
  const PERSONALIZATION_ENABLED = import.meta.env.VITE_PERSONALIZATION === "on";
  const RECOMMENDATION_ENABLED = import.meta.env.VITE_RECOMMENDATION === "on";

  // 🔥 Phase 8: 추천 상태 추적
  const [lastCommandSuccess, setLastCommandSuccess] = useState(false);
  const [lastCommandTime, setLastCommandTime] = useState<Date | null>(null);

  useEffect(() => {
    if (PERSONALIZATION_ENABLED && user?.uid) {
      loadUserProfile(user.uid).then(setUserProfile).catch(console.warn);
    }
  }, [user?.uid, PERSONALIZATION_ENABLED]);

  useEffect(() => {
    const unsubscribe = speechManager.subscribeToSTTResult(async (text: string) => {
      // 🔥 Phase 3-2.5: 로그 레벨 정리 (DEV만 상세 로그)
      if (import.meta.env.DEV) {
        console.log("[SpeechCommandBridge] STT 결과 수신:", text);
      }

      // 🔥 Phase 3-2: Commands 시스템 우선 시도
      const commands = getCommandsByPath(location.pathname);
      
      // 🔥 Phase 7: 가중치 기반 매칭 (개인화)
      const matched = PERSONALIZATION_ENABLED && userProfile
        ? matchCommandWithWeight(text, commands, userProfile)
        : matchCommand(text, commands);

      if (matched) {
        if (import.meta.env.DEV) {
          console.log("[SpeechCommandBridge] Command 매칭:", matched.keywords);
        }

        const ui = new SpeechUIAdapter(navigate);
        
        // 🔥 Invariant B: 1 Command = 1 Action = 1 Stop
        matched.action({ ui, transcript: text });
        speechManager.stopAll(); // 즉시 중지 (재시작/루프 방지)
        
        // 🔥 Phase 7: Intent 사용 기록 (개인화)
        if (PERSONALIZATION_ENABLED && user?.uid) {
          // command → intent key 매핑 (간단한 예시)
          const intentKey = `COMMAND:${matched.keywords[0]}`;
          recordIntentUsage(user.uid, intentKey).catch(console.warn);
        }
        
        // 🔥 Phase 8: 명령 성공 추적 (추천 파이프라인)
        setLastCommandSuccess(true);
        setLastCommandTime(new Date());
        
        // 🔥 Phase 8: 추천 후보 생성 (조건 체크 후)
        if (RECOMMENDATION_ENABLED && user?.uid && userProfile) {
          handleRecommendation(user.uid, userProfile);
        }
        
        if (import.meta.env.PROD) {
          console.info("[Speech] command executed");
        }
        return;
      }

      // 🔥 Phase 6: Intent Router 사용 (Rule → NLP fallback)
      if (import.meta.env.DEV) {
        console.log("[SpeechCommandBridge] Command 매칭 실패, Intent Router로 fallback");
      }
      const intent = await routeIntent(text, location.pathname);
      if (import.meta.env.DEV) {
        console.log("[SpeechCommandBridge] Intent 파싱:", intent);
      }

      // 🔥 Phase 8: 추천 승인/거절 처리 (우선)
      if (intent.type === "CONFIRM_YES") {
        const pending = recommendationManager.getPending();
        if (pending) {
          // 추천 승인 → 실행
          executeRecommendation(pending, { navigate, onSearch });
          recommendationManager.clearPending();
          speechManager.stopAll();
          return;
        }
      } else if (intent.type === "CONFIRM_NO") {
        // 추천 거절 → 쿨다운 설정
        if (user?.uid) {
          recommendationManager.handleRejection(user.uid);
        }
        await speechManager.speak("알겠습니다.");
        speechManager.stopAll();
        return;
      }

      dispatchIntent(intent, { navigate, onSearch });

      // 🔥 Phase 7: Intent 사용 기록 (개인화)
      if (PERSONALIZATION_ENABLED && user?.uid && intent.type !== "UNKNOWN") {
        const intentKey = createIntentKey(intent.type, intent.payload);
        recordIntentUsage(user.uid, intentKey).catch(console.warn);
      }

      // 🔥 Phase 8: 명령 성공 추적 (추천 파이프라인)
      if (intent.type !== "UNKNOWN") {
        setLastCommandSuccess(true);
        setLastCommandTime(new Date());
        
        // 🔥 Phase 8: 추천 후보 생성 (조건 체크 후)
        if (RECOMMENDATION_ENABLED && user?.uid && userProfile) {
          handleRecommendation(user.uid, userProfile);
        }
      } else {
        setLastCommandSuccess(false);
      }

      // 🔥 Phase 4-2: UNKNOWN 로그 수집 (Firestore 텔레메트리)
      if (intent.type === "UNKNOWN") {
        // 🔥 Phase 4-2: Firestore에 해시만 저장 (원문 없음)
        await logUnknownVoice(text, location.pathname);
        // 🔥 Phase 3-2.5: 실패 시나리오 - 침묵도 UX (UI 변화 없음)
        await speechManager.speak("다시 한 번 말해 주세요.");
      } else {
        // 🔥 Phase 6-2: 성공한 Intent도 confidence 로깅 (운영 지표)
        if (import.meta.env.DEV) {
          console.log("[IntentRouter] Intent 성공:", intent.type, "confidence:", intent.confidence);
        }
      }

      // 🔥 Invariant B: 1명령 = 1회 STT (자동 중지)
      speechManager.stopAll();
    });

    return unsubscribe;
  }, [navigate, onSearch, location.pathname, user?.uid, userProfile, PERSONALIZATION_ENABLED, RECOMMENDATION_ENABLED]);

  // 🔥 Phase 8: 추천 처리 함수
  async function handleRecommendation(uid: string, profile: UserVoiceProfile): Promise<void> {
    // 쿨다운 체크
    if (isInRecommendCooldown(uid)) {
      return;
    }

    // 추천 허용 조건 체크
    const context = {
      pathname: location.pathname,
      isMobile: isMobileDevice(),
      userProfile: profile,
      lastRecommendTime: recommendationManager.getLastRecommendTime(),
      todayRecommendCount: recommendationManager.getTodayCount(),
      lastCommandSuccess,
      lastCommandTime,
    };

    if (!canRecommend(context)) {
      return;
    }

    // 추천 후보 생성
    const recommendation = generateRecommendation(profile, location.pathname);
    if (!recommendation || recommendation.confidence < 0.85) {
      return;
    }

    // 추천 설정 및 TTS 질문
    recommendationManager.setPending(recommendation);
    await speechManager.speak(recommendation.question);
  }

  // 🔥 Phase 8: 추천 실행 함수
  function executeRecommendation(
    recommendation: { key: string },
    ctx: { navigate: (to: string) => void; onSearch?: (q: string) => void }
  ): void {
    const [type, ...rest] = recommendation.key.split(":");
    const payload = rest.join(":");

    if (type === "NAVIGATE") {
      ctx.navigate(payload);
    } else if (type === "SEARCH") {
      ctx.onSearch?.(payload);
    }
  }

  return null;
}

