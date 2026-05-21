/**
 * 🎙️ 음성 인식 실패 UX 처리 컴포넌트
 * 
 * 원칙:
 * 1. 실패라는 단어 쓰지 않음
 * 2. 사용자를 고치려 하지 않음
 * 3. 항상 예시로 말함
 * 4. 2초 이상 화면 점유 안 함
 */

import { useEffect, useState } from "react";

type VoiceFailureType = 
  | "no_speech"      // 아무 소리도 안 들어옴
  | "meaningless"    // 말은 했지만 의미 없음
  | "no_results";    // 결과 없음

interface VoiceFailureHandlerProps {
  failureType: VoiceFailureType | null;
  recognizedText?: string;
  onReset: () => void;
}

export function VoiceFailureHandler({
  failureType,
  recognizedText,
  onReset,
}: VoiceFailureHandlerProps) {
  const [hintText, setHintText] = useState<string | null>(null);
  const [emptyCard, setEmptyCard] = useState<{
    message: string;
    suggestion: string;
  } | null>(null);

  useEffect(() => {
    if (!failureType) {
      setHintText(null);
      setEmptyCard(null);
      return;
    }

    switch (failureType) {
      case "no_speech":
        // 타입 ①: 아무것도 안 함 (조용히 복귀)
        onReset();
        break;

      case "meaningless":
        // 타입 ②: 예시 제시 (2초)
        setHintText("\"근처 축구장\" 처럼 말해보세요");
        const hintTimer = setTimeout(() => {
          setHintText(null);
          onReset();
        }, 2000);
        return () => clearTimeout(hintTimer);

      case "no_results":
        // 타입 ③: 대안 제시 (5초)
        const suggestion = getAlternativeSuggestion(recognizedText || "");
        setEmptyCard({
          message: "근처에 해당 장소가 없어요",
          suggestion,
        });
        const cardTimer = setTimeout(() => {
          setEmptyCard(null);
          onReset();
        }, 5000);
        return () => clearTimeout(cardTimer);
    }
  }, [failureType, recognizedText, onReset]);

  return (
    <>
      {/* 힌트 메시지 (타입 ②) */}
      {hintText && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 rounded-xl bg-gray-900/90 backdrop-blur-md px-4 py-2.5 text-sm text-white shadow-xl">
          <p className="text-center">{hintText}</p>
        </div>
      )}

      {/* 빈 결과 카드 (타입 ③) */}
      {emptyCard && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 w-[90%] max-w-md rounded-xl bg-white px-4 py-3 shadow-xl border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {emptyCard.message}
          </p>
          <p className="text-xs text-gray-600">
            {emptyCard.suggestion}
          </p>
        </div>
      )}
    </>
  );
}

/**
 * 의미 없는 말 판단
 */
function isMeaninglessSpeech(text: string): boolean {
  const meaningless = ["음", "어", "저기", "아", "그", "이", "응"];
  const words = text.trim().split(/\s+/);
  
  // 단어가 1개 이하
  if (words.length <= 1) return true;
  
  // 의미 없는 단어만
  if (words.every(w => meaningless.includes(w))) return true;
  
  return false;
}

/**
 * 대안 제시
 */
function getAlternativeSuggestion(text: string): string {
  const alternatives: Record<string, string[]> = {
    "아이스하키": ["축구장", "헬스장"],
    "테니스": ["배드민턴장", "축구장"],
    "수영장": ["헬스장", "카페"],
    "골프": ["축구장", "헬스장"],
  };
  
  // 키워드 매칭
  for (const [keyword, alts] of Object.entries(alternatives)) {
    if (text.includes(keyword)) {
      return `"${alts[0]}"이나 "${alts[1]}"은 어때요?`;
    }
  }
  
  // 기본 대안
  return "\"축구장\"이나 \"헬스장\"은 어때요?";
}

/**
 * 음성 인식 실패 타입 판단
 */
export function detectFailureType(
  recognizedText: string | null,
  results: any[]
): VoiceFailureType | null {
  // 타입 ①: 아무 소리도 안 들어옴
  if (!recognizedText || recognizedText.trim() === "") {
    return "no_speech";
  }
  
  // 타입 ②: 의미 없는 말
  if (isMeaninglessSpeech(recognizedText)) {
    return "meaningless";
  }
  
  // 타입 ③: 결과 없음
  if (results.length === 0) {
    return "no_results";
  }
  
  return null;
}
