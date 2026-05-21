/**
 * 🎯 Command Parser
 * 룰 기반 명령 파싱 (Fallback용)
 */

export interface ParsedCommand {
  type: 'MAP' | 'UNKNOWN';
  query?: string;
}

/**
 * 간단한 명령 파싱 (Fallback용)
 */
export function parseCommand(text: string): ParsedCommand {
  const patterns = ['찾아줘', '가줘', '어디야', '근처', '위치'];

  for (const p of patterns) {
    if (text.includes(p)) {
      let query = text
        .replace('찾아줘', '')
        .replace('가줘', '')
        .replace('어디야', '')
        .replace('근처', '')
        .replace('위치', '')
        .trim();

      if (!query) {
        query = text.trim();
      }

      return { type: 'MAP', query };
    }
  }

  return { type: 'UNKNOWN' };
}
