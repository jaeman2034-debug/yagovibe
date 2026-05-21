/**
 * 🔥 마켓 분석 서비스
 * 
 * Firestore 기반 지표 집계
 */

import type { QueryDocumentSnapshot } from "firebase/firestore";
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TodayMetrics {
  posts: number;
  chats: number;
  completed: number;
  avgPrice: number;
}

export interface TopSport {
  sport: string;
  count: number;
}

export interface TopSearchKeyword {
  keyword: string;
  count: number;
}

/**
 * 🔥 오늘 지표 조회
 */
export async function getTodayMetrics(): Promise<TodayMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayStartTimestamp = Timestamp.fromDate(todayStart);
  const todayEndTimestamp = Timestamp.fromDate(todayEnd);

  // 🔥 오늘 게시글 수
  const postsQuery = query(
    collection(db, "marketPosts"),
    where("createdAt", ">=", todayStartTimestamp),
    where("createdAt", "<", todayEndTimestamp)
  );
  const postsSnap = await getDocs(postsQuery);
  const posts = postsSnap.size;

  // 🔥 오늘 채팅 시작 수
  let chats = 0;
  try {
    const chatRoomsQuery = query(
      collection(db, "chatRooms"),
      where("createdAt", ">=", todayStartTimestamp),
      where("createdAt", "<", todayEndTimestamp)
    );
    const chatRoomsSnap = await getDocs(chatRoomsQuery);
    chats = chatRoomsSnap.size;
  } catch (err) {
    console.warn("⚠️ 채팅 데이터 조회 실패:", err);
  }

  // 🔥 오늘 거래 완료 수
  const completedQuery = query(
    collection(db, "marketPosts"),
    where("status", "==", "completed"),
    where("completedAt", ">=", todayStartTimestamp),
    where("completedAt", "<", todayEndTimestamp)
  );
  const completedSnap = await getDocs(completedQuery);
  const completed = completedSnap.size;

  // 🔥 평균 거래 가격
  let totalPrice = 0;
  let priceCount = 0;
  completedSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.price && typeof data.price === "number" && data.price > 0) {
      totalPrice += data.price;
      priceCount++;
    }
  });
  const avgPrice = priceCount > 0 ? Math.round(totalPrice / priceCount) : 0;

  return {
    posts,
    chats,
    completed,
    avgPrice,
  };
}

/**
 * 🔥 인기 종목 TOP N
 */
export async function getTopSports(limitCount: number = 3): Promise<TopSport[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const todayStartTimestamp = Timestamp.fromDate(todayStart);
  const todayEndTimestamp = Timestamp.fromDate(todayEnd);

  const postsQuery = query(
    collection(db, "marketPosts"),
    where("createdAt", ">=", todayStartTimestamp),
    where("createdAt", "<", todayEndTimestamp)
  );
  const postsSnap = await getDocs(postsQuery);

  const sportCounts = new Map<string, number>();
  postsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const sport = data.sport || "unknown";
    sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
  });

  return Array.from(sportCounts.entries())
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limitCount);
}

/**
 * 🔥 검색어 TOP N (v1: 임시 구현, v2에서 analytics 이벤트 로그 기반으로 개선)
 */
export async function getTopSearchKeywords(limitCount: number = 5): Promise<TopSearchKeyword[]> {
  // TODO: v2에서 analytics 이벤트 로그 기반으로 구현
  // 현재는 빈 배열 반환
  return [];
}
