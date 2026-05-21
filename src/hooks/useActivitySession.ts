/**
 * 🔥 useActivitySession - ActivitySession 상태 관리 훅
 * 
 * 역할:
 * - 사용자의 활동 세션 상태 관리
 * - 세션 생성/종료 함수 제공
 * - 실시간 세션 상태 추적
 * 
 * 상태 흐름:
 * IDLE → CREATING → ACTIVE → ENDING
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthProvider";
import { useHubContext } from "@/hooks/useHubContext";
import { 
  createActivitySession, 
  endActivitySession, 
  getCurrentSession 
} from "@/services/activitySessionService";
import { startActivity as startActivityEngine } from "@/features/activity/startActivity";
import type { ActivitySession } from "@/types/activitySession";
import type { SportId } from "@/constants/sports";
import { getCurrentPosition } from "@/services/LocationService";

/**
 * 🔥 사용자 활동 상태
 */
export type UserActivityState = 
  | "idle"        // 대기 중
  | "creating"    // 세션 생성 중
  | "active"      // 활동 중
  | "ending";     // 세션 종료 중

/**
 * 🔥 useActivitySession 반환 타입
 */
export interface UseActivitySessionReturn {
  // 상태
  state: UserActivityState;
  currentSession: ActivitySession | null;
  isLoading: boolean;
  error: string | null;
  completedSession: {
    id: string;
    sport: string;
    durationMs: number;
    locationLabel: string;
  } | null; // 🔥 최근 종료된 세션 (Toast 표시용)

  // 함수
  startActivity: (params: { sport: SportId; location?: { lat: number; lng: number } }) => Promise<string | null>;
  endActivity: (sessionId?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearCompletedSession: () => void; // 🔥 Toast 닫기용
}

/**
 * 🔥 useActivitySession 훅
 * 
 * @returns UseActivitySessionReturn
 */
export function useActivitySession(): UseActivitySessionReturn {
  const { user } = useAuth();
  const { currentLocation } = useHubContext();
  
  const [state, setState] = useState<UserActivityState>("idle");
  const [currentSession, setCurrentSession] = useState<ActivitySession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSession, setCompletedSession] = useState<{
    id: string;
    sport: string;
    durationMs: number;
    locationLabel: string;
  } | null>(null);

  // 🔥 현재 세션 조회
  const refreshSession = useCallback(async () => {
    if (!user) {
      setCurrentSession(null);
      setState("idle");
      return;
    }

    try {
      setIsLoading(true);
      const session = await getCurrentSession(user.uid);
      
      if (session) {
        setCurrentSession(session);
        setState("active");
      } else {
        setCurrentSession(null);
        setState("idle");
      }
    } catch (err: any) {
      console.error("❌ [useActivitySession] 세션 조회 실패:", err);
      setError(err.message || "세션 조회 실패");
      setCurrentSession(null);
      setState("idle");
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // 🔥 초기 로드 시 현재 세션 확인 (user?.uid로 의존성 안정화 - 무한 루프 방지)
  useEffect(() => {
    if (!user?.uid) return;
    void refreshSession();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔥 활동 시작 함수
  // 🔥 핵심 원칙: Hook은 상태를 가지지 않는다. 상태는 UI가 소유한다.
  const startActivity = useCallback(async (
    params: { sport: SportId; location?: { lat: number; lng: number } }
  ): Promise<string | null> => {
    if (!user) {
      setError("로그인이 필요합니다.");
      return null;
    }

    // 🔥 스포츠 필수 검증 (UI에서 전달받은 값 사용)
    if (!params.sport) {
      setError("스포츠를 선택해주세요.");
      return null;
    }

    // 🔥 위치 확인
    let finalLocation = params.location;
    if (!finalLocation) {
      if (currentLocation) {
        finalLocation = {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        };
      } else {
        // 🔥 위치 정보가 없으면 GPS로 가져오기
        try {
          setIsLoading(true);
          finalLocation = await getCurrentPosition();
        } catch (err: any) {
          setError("위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.");
          setIsLoading(false);
          return null;
        }
      }
    }

    if (!finalLocation) {
      setError("위치 정보가 필요합니다.");
      setIsLoading(false);
      return null;
    }

    try {
      setState("creating");
      setIsLoading(true);
      setError(null);

      console.log("🔥 [useActivitySession] ActivitySession 생성 시작:", {
        userId: user.uid,
        sport: params.sport,
        location: finalLocation,
      });

      // 🔥 세션 생성 (Presence Engine 사용)
      const sessionId = await startActivityEngine({
        userId: user.uid,
        sport: params.sport,
        location: finalLocation,
      });

      console.log("✅ [useActivitySession] ActivitySession 생성 완료:", sessionId);

      // 🔥 세션 정보 다시 조회
      await refreshSession();

      return sessionId;
    } catch (err: any) {
      console.error("❌ [useActivitySession] ActivitySession 생성 실패:", err);
      setError(err.message || "활동 시작 실패");
      setState("idle");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentLocation, refreshSession]);

  // 🔥 활동 종료 함수 (sessionId 옵션: prop으로 받은 세션 사용 시)
  const endActivity = useCallback(async (sessionIdArg?: string) => {
    const targetId = sessionIdArg ?? currentSession?.id;
    if (!targetId) {
      console.warn("⚠️ [useActivitySession] 종료할 세션이 없습니다.");
      return;
    }

    try {
      setState("ending");
      setIsLoading(true);
      setError(null);

      console.log("🛑 [useActivitySession] ActivitySession 종료 시작:", targetId);

      const completedResult = await endActivitySession(targetId);

      console.log("✅ [useActivitySession] ActivitySession 종료 완료");

      // 🔥 세션 정보 초기화
      setCurrentSession(null);
      setState("idle");

      // 🔥 종료된 세션 정보 저장 (Toast 표시용)
      if (completedResult) {
        setCompletedSession({
          id: completedResult.id,
          sport: completedResult.sport,
          durationMs: completedResult.durationMs,
          locationLabel: completedResult.location.dong,
        });
      }
    } catch (err: any) {
      console.error("❌ [useActivitySession] ActivitySession 종료 실패:", err);
      setError(err.message || "활동 종료 실패");
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  // 🔥 완료된 세션 초기화 함수 (Toast 닫기용)
  const clearCompletedSession = useCallback(() => {
    setCompletedSession(null);
  }, []);

  return {
    state,
    currentSession,
    isLoading,
    error,
    completedSession,
    startActivity,
    endActivity,
    refreshSession,
    clearCompletedSession,
  };
}
