/**
 * 🔥 Search Types
 * 
 * 검색 결과 타입 정의
 */

export type SearchResultType = "event" | "team" | "player";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  name: string;
  href: string;
  subtitle?: string;
  imageUrl?: string;
  stats?: Record<string, any>;
}
