/**
 * 🌍 도착 컨텍스트 결정 훅
 * 
 * 도착 시 자동으로 컨텍스트를 결정하고 전환
 */

import { useMemo } from "react";
import type { ArrivalContext, MovementSession } from "@/types/movement";

interface Destination {
  lat: number;
  lng: number;
  name: string;
  type?: "venue" | "team" | "competition" | "custom";
  id?: string;
}

/**
 * 도착 컨텍스트 결정
 */
export function determineArrivalContext(
  destination: Destination,
  session?: MovementSession
): ArrivalContext | null {
  // 1. 세션의 의도 기반 결정
  if (session) {
    if (session.intent === "team_practice" && destination.id) {
      return {
        type: "team",
        teamId: destination.id,
        activity: "practice",
      };
    }

    if (session.intent === "competition" && destination.id) {
      return {
        type: "competition",
        tournamentId: destination.id,
        phase: "ongoing", // 실제로는 대회 상태 확인 필요
      };
    }

    if (session.intent === "solo_play") {
      return {
        type: "solo",
        activity: "workout",
      };
    }

    if (session.intent === "recovery") {
      return {
        type: "solo",
        activity: "recovery",
      };
    }
  }

  // 2. 목적지 타입 기반 결정
  if (destination.type === "team" && destination.id) {
    return {
      type: "team",
      teamId: destination.id,
      activity: "practice",
    };
  }

  if (destination.type === "competition" && destination.id) {
    return {
      type: "competition",
      tournamentId: destination.id,
      phase: "ongoing",
    };
  }

  // 3. 기본값: 탐험
  return {
    type: "exploration",
    placeId: destination.id || destination.name,
  };
}

/**
 * useArrivalContext 훅
 */
export function useArrivalContext(
  destination: Destination | null,
  session?: MovementSession
) {
  return useMemo(() => {
    if (!destination) return null;
    return determineArrivalContext(destination, session);
  }, [destination, session]);
}
