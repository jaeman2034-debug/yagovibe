/**
 * 🔥 Guest Player (용병) 타입 정의
 */

import { Timestamp } from "firebase/firestore";
import type { SportType } from "./sport";

export interface GuestPlayer {
  id: string;
  authorId: string; // 팀 없어도 작성 가능
  
  sport: SportType; // 🔥 필수 필드: 멀티 스포츠 지원
  date: Timestamp;
  time: string;
  region: string; // ✅ 이미 존재
  stadium?: string;
  
  position: string[]; // 필요한 포지션
  slots: number; // 필요한 인원
  
  fee?: number;
  description?: string;
  
  status: "open" | "closed";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface GuestPlayerApplication {
  id: string;
  guestId: string;
  userId: string;
  userName?: string;
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}

export interface CreateGuestPlayerInput {
  sport: SportType; // 🔥 필수 필드: 사용자가 선택
  date: Date;
  time: string;
  region: string; // ✅ 이미 존재
  stadium?: string;
  position: string[];
  slots: number;
  fee?: number;
  description?: string;
}
