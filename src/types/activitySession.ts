/**
 * 🔥 ActivitySession 타입 정의
 * 
 * 역할:
 * - 사용자의 현재 활동 상태를 나타내는 핵심 데이터 구조
 * - "운동 시작" 버튼 클릭 시 생성되는 세션
 * - 주변 사용자에게 노출되는 활동 정보
 * 
 * 설계 철학:
 * - 상태 기반 실시간 존재 시스템
 * - 위치 = 컨텍스트, 상태 = 서비스 핵심
 */

import type { SportId } from "@/constants/sports";
import type { Timestamp } from "firebase/firestore";

/**
 * 🔥 ActivitySession 상태
 */
export type ActivitySessionStatus = 
  | "active"    // 활동 중
  | "ended"     // 종료됨
  | "paused";   // 일시 정지

/**
 * 🔥 ActivitySession 인터페이스
 */
export interface ActivitySession {
  id: string;
  uid: string; // 🔥 Firebase 표준: userId → uid
  
  // 스포츠 정보
  sport: SportId;
  
  // 위치 정보
  location: {
    lat: number;
    lng: number;
    dong: string;  // 행정동 (예: "가능동")
    gu?: string;   // 구/군 (예: "의정부시")
    si?: string;   // 시/도 (예: "경기도")
  };
  
  // 세션 상태
  status: ActivitySessionStatus;
  
  // 시간 정보
  startedAt: Timestamp | Date;
  endedAt?: Timestamp | Date;
  
  // 가시성 설정
  visibilityRadius: number; // 미터 단위 (기본: 1500m)
  
  // 참여자 (자기 자신 포함)
  participants: string[]; // uid 배열
  
  // 메타데이터
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

/**
 * 🔥 ActivityFeed 엔트리 (검색용 캐시)
 * 
 * 역할:
 * - 주변 활동 조회 최적화
 * - 지도 표시용 데이터
 * - 추천 생성용 데이터
 */
export interface ActivityFeedEntry {
  id: string; // sessionId와 동일
  sessionId: string;
  uid: string; // 🔥 Firebase 표준: userId → uid
  
  // 활동 정보
  type: "sport_start";
  sport: SportId;
  
  // 위치 정보 (검색용)
  dong: string;
  gu?: string;
  si?: string;
  location: {
    lat: number;
    lng: number;
  };
  
  // 시간 정보
  createdAt: Timestamp | Date;
  
  // 메타데이터
  status: ActivitySessionStatus;
}
