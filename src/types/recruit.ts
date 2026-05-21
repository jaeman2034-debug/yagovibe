/**
 * 🔥 Recruit (팀원 모집) 타입 정의
 */

import { Timestamp } from "firebase/firestore";
import type { SportType } from "./sport";

export interface Recruit {
  id: string;
  teamId: string;
  teamName: string;
  authorId: string;
  
  sport: SportType; // 🔥 필수 필드: 멀티 스포츠 지원
  position: string[]; // ["공격수", "미드필더", "수비수", "골키퍼"]
  slots: number;
  region: string; // ✅ 이미 존재
  trainingDays?: string[]; // ["월", "화", "수", ...]
  level: "취미" | "아마추어" | "준선수";
  contact: "채팅" | "전화";
  description?: string;
  /** 모집 글 이미지 URL (첫 번째 = 대표·썸네일) — 신규 글은 1~5장 권장 */
  imageUrls?: string[];

  status: "open" | "closed";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface RecruitApplication {
  id: string;
  recruitId: string;
  userId: string;
  userName?: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}

export interface CreateRecruitInput {
  teamId: string;
  teamName: string;
  sport: SportType; // 🔥 필수 필드: 팀의 sportType에서 복사
  position: string[];
  slots: number;
  region: string; // ✅ 이미 존재
  trainingDays?: string[];
  level: "취미" | "아마추어" | "준선수";
  contact: "채팅" | "전화";
  description?: string;
  /** 필수: 1~5장, 첫 URL이 대표 이미지 */
  imageUrls: string[];
}
