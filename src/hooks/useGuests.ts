/**
 * 🔥 useGuests - 용병 모집글 조회 훅
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, limit as firestoreLimit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GuestPlayer } from "@/types/guest";
import type { SportType } from "@/types/sport";

interface UseGuestsOptions {
  status?: "open" | "closed";
  sport?: SportType; // 🔥 멀티 스포츠 필터 추가
  region?: string; // ✅ 이미 존재
  date?: Date; // 특정 날짜의 용병만 조회
  limit?: number;
}

export function useGuests(options: UseGuestsOptions = {}) {
  const [guests, setGuests] = useState<GuestPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const conditions: any[] = [];

    if (options.status) {
      conditions.push(where("status", "==", options.status));
    }

    if (options.sport) {
      conditions.push(where("sport", "==", options.sport));
    }

    if (options.region) {
      conditions.push(where("region", "==", options.region));
    }

    if (options.date) {
      const startOfDay = Timestamp.fromDate(new Date(options.date.setHours(0, 0, 0, 0)));
      const endOfDay = Timestamp.fromDate(new Date(options.date.setHours(23, 59, 59, 999)));
      conditions.push(where("date", ">=", startOfDay));
      conditions.push(where("date", "<=", endOfDay));
    }

    conditions.push(orderBy("date", "asc"));
    conditions.push(orderBy("time", "asc"));

    if (options.limit) {
      conditions.push(firestoreLimit(options.limit));
    }

    const q = query(collection(db, "guest_players"), ...conditions);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const guestsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GuestPlayer[];

        setGuests(guestsList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ [useGuests] 조회 실패:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [options.status, options.sport, options.region, options.date, options.limit]);

  return { guests, loading, error };
}
