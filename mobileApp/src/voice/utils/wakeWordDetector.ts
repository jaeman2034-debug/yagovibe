/**
 * 🎧 Wake Word Detector
 * Wake Word 감지 유틸리티
 */

const DEFAULT_WAKE_KEYWORDS = ['헤이', '야고', '어시스턴트', '도와줘'];

/**
 * Wake Word 감지
 */
export function detectWakeWord(text: string, keywords = DEFAULT_WAKE_KEYWORDS): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword));
}
