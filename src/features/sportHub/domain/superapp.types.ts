/**
 * 🔥 Superapp Types - 슈퍼앱 연동 도메인 모델
 * 
 * 축구 허브를 "외부 생태계의 중심 노드"로 확장
 */

import type { Region } from "./region.types";

/**
 * 공유 타입
 */
export type ShareTarget =
  | "story"
  | "team"
  | "league"
  | "match"
  | "ground";

/**
 * 지도 뷰 모델
 */
export type GroundMapView = {
  id: string;
  name: string;
  region: Region;

  lat: number;
  lng: number;

  priceFrom: number;
  rating: number;

  nextSlot?: string;        // ISO string
  imageUrl?: string;
  address: string;
};

/**
 * 딥링크 타입
 */
export type DeepLinkType =
  | "ground"
  | "team"
  | "league"
  | "match"
  | "story"
  | "hub";

/**
 * 딥링크 파라미터
 */
export type DeepLinkParams = {
  type: DeepLinkType;
  region: Region;
  id: string;
  query?: Record<string, string>;
};

/**
 * 공유 메타데이터
 */
export type ShareMetadata = {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  type: ShareTarget;
};

/**
 * OG 메타 태그
 */
export type OGMeta = {
  "og:title": string;
  "og:description": string;
  "og:image": string;
  "og:url": string;
  "og:type": "website" | "article";
};
