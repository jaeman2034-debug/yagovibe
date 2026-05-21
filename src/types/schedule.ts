/**
 * 🔥 일정 타입 정의 (YAGO v2)
 * 
 * 일정 유형: 경기/훈련/친선
 * 권한: 생성=운영자만, 조회=전체
 */

export type ScheduleType = '경기' | '훈련' | '친선';

export interface Schedule {
  id: string;
  teamId: string;
  type: ScheduleType;
  title: string;
  dateTime: any; // Firestore Timestamp
  place: string;
  placeCoordinates?: {
    lat: number;
    lng: number;
  };
  opponent?: string; // 경기/친선만
  isPublic: boolean;
  needsSubstitute: boolean; // 용병 모집
  description?: string;
  creatorId: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
  // 참석 응답
  attendance?: {
    [userId: string]: '참석' | '불참' | '미정';
  };
}

export interface ScheduleFormData {
  type: ScheduleType;
  title: string;
  dateTime: Date;
  place: string;
  placeCoordinates?: {
    lat: number;
    lng: number;
  };
  opponent?: string;
  isPublic: boolean;
  needsSubstitute: boolean;
  description?: string;
}
