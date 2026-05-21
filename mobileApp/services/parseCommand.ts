/**
 * 🎯 음성 명령 파싱
 * STT 결과 텍스트를 명령 타입과 파라미터로 변환
 */

export type CommandType = 'MAP_SEARCH' | 'UNKNOWN';

export interface ParsedCommand {
  type: CommandType;
  query?: string;
}

/**
 * 음성 명령 파싱
 * @param text STT 결과 텍스트
 * @returns 파싱된 명령
 */
export function parseCommand(text: string): ParsedCommand {
  const trimmed = text.trim();
  
  // 지도 검색 패턴
  const searchPatterns = ['찾아줘', '가줘', '위치', '찾아', '검색'];
  
  for (const pattern of searchPatterns) {
    if (trimmed.includes(pattern)) {
      // 패턴 앞부분을 검색어로 추출
      const query = trimmed
        .replace(new RegExp(`${pattern}.*$`, 'i'), '')
        .trim();
      
      if (query) {
        return {
          type: 'MAP_SEARCH',
          query,
        };
      }
    }
  }
  
  return { type: 'UNKNOWN' };
}
