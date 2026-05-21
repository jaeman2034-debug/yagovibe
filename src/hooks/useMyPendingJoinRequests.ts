/**
 * 🔥 useMyPendingJoinRequests - 내가 보낸 가입 요청 중 pending 상태 조회
 * 
 * P1-W 상태 판단용 훅
 * - 내가 보낸 요청 중 status="pending"인 것만 조회
 * - 실시간 구독으로 즉시 반영
 */

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { TeamJoinRequest } from "@/lib/team/teamJoinRequest";

export function useMyPendingJoinRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TeamJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Firestore INTERNAL ASSERTION(Watch stream) 회피:
    // 이 화면은 실시간성이 덜 중요하므로 단건 조회 + 마운트 상태 가드로 안정화한다.
    let alive = true;
    const run = async () => {
      try {
        const q = query(
          collection(db, "teamJoinRequests"),
          where("userId", "==", user.uid),
          where("status", "==", "pending")
        );
        const snapshot = await getDocs(q);
        if (!alive) return;
        const requestsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TeamJoinRequest[];
        setRequests(requestsData);
      } catch (err) {
        if (!alive) return;
        console.warn("[useMyPendingJoinRequests] 조회 실패:", err);
        setRequests([]);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void run();

    return () => {
      alive = false;
    };
  }, [user?.uid]);

  return {
    requests,
    loading,
    hasPendingRequest: requests.length > 0,
    pendingRequest: requests[0] || null, // 첫 번째 요청 (보통 1개)
  };
}
