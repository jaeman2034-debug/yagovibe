/**
 * Facility 데이터 타입 정의 (Tournament 패턴 기반)
 * 
 * Sprint 4: 실전 엔진 확장
 * Phase D: 행정 패턴 전면 확장 (공지와 동일한 구조)
 */

import { Timestamp } from "firebase/firestore";

export type FacilityAdminStatus = "draft" | "published" | "archived"; // 행정 상태 (공지와 동일)
export type FacilityVisibility = "public" | "member" | "admin"; // 노출 범위 (공지와 동일)
export type FacilitySlotStatus = "available" | "blocked" | "event";

export interface Facility {
  id: string;
  associationId: string;
  title: string;
  content?: string; // 시설 본문 (공지 패턴과 일치, 선택적 필드로 유지)
  adminStatus?: FacilityAdminStatus; // 행정 상태 (draft/published/archived) - 행정 패턴 추가
  isOfficial?: boolean; // 공식 기준 여부 (기본값: true)
  isPinned?: boolean; // 상단 고정 (공지 패턴과 일치)
  visibility?: FacilityVisibility; // 노출 범위 (기본값: public) - 행정 패턴 추가
  openTime?: string; // 운영 시작 시간 (HH:mm)
  closeTime?: string; // 운영 종료 시간 (HH:mm)
  address?: string; // 주소
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // 작성자 UID (행정 로그용)
  updatedBy?: string; // 수정자 UID (행정 로그용)
}

export interface FacilitySlot {
  id: string;
  associationId: string;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:mm
  timeEnd: string; // HH:mm
  status: FacilitySlotStatus;
  note?: string;
  updatedAt: Timestamp;
}

