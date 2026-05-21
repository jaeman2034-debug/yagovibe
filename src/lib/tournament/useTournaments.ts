/**
 * Tournament 데이터 로딩 훅
 * 기존 associations/{associationId}/tournaments 구조 사용
 */

import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";
import type { Tournament } from "@/types/tournament";

export function useTournaments(tenantId: string): Tournament[] {
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);

  React.useEffect(() => {
    if (!tenantId) {
      setTournaments([]);
      return;
    }

    // 기존 구조: associations/{associationId}/tournaments
    // 🔥 인덱스 문제 해결: orderBy 제거하고 클라이언트에서 정렬
    const q = query(
      collection(db, `associations/${tenantId}/tournaments`),
      where("adminStatus", "==", "published") // published만 노출
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const tournamentsData = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.title || data.name || "",
              startDate: data.dateStart?.toDate?.()?.toISOString() || new Date().toISOString(),
              endDate: data.dateEnd?.toDate?.()?.toISOString() || new Date().toISOString(),
              location: data.venue || "",
              organizer: data.organizer || "",
              teamCount: data.teamCount || 0,
              maxTeams: data.maxTeams,
              status: data.status === "upcoming" ? "registration" : data.status === "ongoing" ? "ongoing" : data.status === "ended" ? "completed" : "registration",
              description: data.content || data.description,
              rules: data.rules,
              prizes: data.prizes,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              tenantId,
            } as Tournament;
          })
          .sort((a, b) => {
            // 클라이언트에서 정렬: dateStart 기준 내림차순 (최신순)
            const aDate = new Date(a.startDate).getTime();
            const bDate = new Date(b.startDate).getTime();
            return bDate - aDate;
          });
        
        setTournaments(tournamentsData);
        
        // 🔥 실시간 업데이트를 위한 디버깅 로그
        console.log("🔥 [useTournaments] 대회 목록 업데이트:", {
          count: tournamentsData.length,
          tournaments: tournamentsData.map(t => ({ id: t.id, name: t.name, status: t.status }))
        });
      },
      (error) => {
        console.error("[useTournaments] 구독 오류:", error);
        // 인덱스 오류인 경우 orderBy 없이 재시도
        if (error.code === 'failed-precondition') {
          console.warn("[useTournaments] 인덱스 오류, orderBy 없이 재시도");
        }
        setTournaments([]);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  return tournaments;
}

