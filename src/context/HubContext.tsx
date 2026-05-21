/**
 * 🔥 Hub Context - 허브의 뇌
 * 
 * 역할:
 * - 허브 전역 상태 관리
 * - Activity 중심 플랫폼 상태
 * - 사용자 컨텍스트 (위치, 선호 종목, 시간 등)
 * 
 * 설계 원칙:
 * - Activity 중심 플랫폼의 상태 머신
 * - 모든 Activity가 이 컨텍스트를 참조
 * - 실시간 동기화 (Firestore 연동 가능)
 */

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { useUserLocation } from "@/hooks/useUserLocation";
import type { LatLng } from "@/utils/geo";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 🔥 허브 상태 타입 정의
export type SportType = 
  | "baseball" | "soccer" | "basketball" | "volleyball" 
  | "golf" | "tennis" | "running" | "hiking" 
  | "badminton" | "table-tennis" | "swimming" 
  | "fitness" | "yoga" | "climbing" | "billiards" 
  | "misc" | "other" | "all" | null;

export type TimeContext = "morning" | "afternoon" | "evening" | "night" | null;

export type ActivityFocus = 
  | "trading"      // 중고거래
  | "team"         // 팀 활동
  | "events"       // 대회/이벤트
  | "venues"       // 시설/장소
  | "social"       // 소셜
  | null;

export interface HubContextValue {
  // 🔥 위치 컨텍스트
  currentLocation: LatLng | null;
  locationAccuracy: number | null;
  
  // 🔥 종목 컨텍스트
  preferredSports: SportType[];
  activeSport: SportType;
  setActiveSport: (sport: SportType) => void;
  
  // 🔥 시간 컨텍스트
  timeContext: TimeContext;
  
  // 🔥 Activity 포커스
  activityFocus: ActivityFocus;
  setActivityFocus: (focus: ActivityFocus) => void;
  
  // 🔥 허브 상태
  isHubActive: boolean;
  lastActivity: string | null;
  
  // 🔥 업데이트 함수
  updateLocation: (location: LatLng, accuracy?: number) => void;
  updatePreferredSports: (sports: SportType[]) => void;
  resetHub: () => void;
}

const HubContext = createContext<HubContextValue | null>(null);

export const useHubContext = () => {
  const context = useContext(HubContext);
  if (!context) {
    throw new Error("useHubContext must be used within HubProvider");
  }
  return context;
};

interface HubProviderProps {
  children: ReactNode;
}

/**
 * 🔥 Hub Provider
 * 
 * 역할:
 * - 허브 전역 상태 제공
 * - 사용자 위치 자동 감지
 * - 시간 컨텍스트 자동 계산
 * - 선호 종목 관리
 */
export function HubProvider({ children }: HubProviderProps) {
  const { user } = useAuth();
  const { loc: userLoc } = useUserLocation();
  
  // 🔥 상태 초기화
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [preferredSports, setPreferredSports] = useState<SportType[]>([]);
  const [activeSport, setActiveSport] = useState<SportType>(null);
  const [timeContext, setTimeContext] = useState<TimeContext>(null);
  const [activityFocus, setActivityFocus] = useState<ActivityFocus>(null);
  const [isHubActive, setIsHubActive] = useState(true);
  const [lastActivity, setLastActivity] = useState<string | null>(null);

  // 🔥 사용자 위치 자동 동기화
  useEffect(() => {
    if (userLoc) {
      console.log("✅ [HubContext] 사용자 위치 설정:", userLoc);
      setCurrentLocation(userLoc);
      // 정확도는 기본값으로 설정 (실제로는 useUserLocation에서 가져올 수 있음)
      setLocationAccuracy(100); // meters
    } else {
      console.log("⚠️ [HubContext] 사용자 위치 없음 (userLoc:", userLoc, ")");
    }
  }, [userLoc]);

  // 🔥 시간 컨텍스트 자동 계산
  useEffect(() => {
    const updateTimeContext = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setTimeContext("morning");
      } else if (hour >= 12 && hour < 17) {
        setTimeContext("afternoon");
      } else if (hour >= 17 && hour < 22) {
        setTimeContext("evening");
      } else {
        setTimeContext("night");
      }
    };

    updateTimeContext();
    const interval = setInterval(updateTimeContext, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 🔥 사용자 선호 종목 로드 (Firestore에서)
  useEffect(() => {
    if (!user?.uid) {
      setPreferredSports([]);
      setActiveSport(null);
      return;
    }

    const fetchPreferredSports = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const sports = (data.preferredSports || []) as SportType[];
          setPreferredSports(sports);
          
          // 🔥 초기 활성 종목 설정: 선호 종목이 있으면 첫 번째 종목 자동 선택
          if (sports.length > 0 && !activeSport) {
            setActiveSport(sports[0] as SportType);
          }
        } else {
          // Firestore에 데이터 없으면 localStorage에서 로드 (레거시 호환)
          const stored = localStorage.getItem(`hub_preferredSports_${user.uid}`);
          if (stored) {
            try {
              const sports = JSON.parse(stored) as SportType[];
              setPreferredSports(sports);
              
              if (sports.length > 0 && !activeSport) {
                setActiveSport(sports[0] as SportType);
              }
            } catch {
              // 파싱 실패 시 무시
            }
          }
        }
      } catch (err) {
        console.warn("⚠️ [HubContext] 선호 종목 로드 실패:", err);
        // 에러 시 localStorage에서 로드 시도
        const stored = localStorage.getItem(`hub_preferredSports_${user.uid}`);
        if (stored) {
          try {
            const sports = JSON.parse(stored) as SportType[];
            setPreferredSports(sports);
            
            if (sports.length > 0 && !activeSport) {
              setActiveSport(sports[0] as SportType);
            }
          } catch {
            // 파싱 실패 시 무시
          }
        }
      }
    };

    void fetchPreferredSports();
  }, [user?.uid]);

  // 🔥 선호 종목 변경 시 활성 종목 자동 설정 (추가 보호 로직)
  useEffect(() => {
    // activeSport가 없고 preferredSports가 있으면 첫 번째 종목 자동 선택
    if (!activeSport && preferredSports.length > 0) {
      setActiveSport(preferredSports[0] as SportType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredSports]); // activeSport는 의존성에서 제외 (무한 루프 방지)

  // 🔥 선호 종목 저장 (Firestore + 로컬)
  const updatePreferredSports = async (sports: SportType[]) => {
    setPreferredSports(sports);
    
    if (user?.uid) {
      try {
        // Firestore에 저장
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          preferredSports: sports
        }, { merge: true });
        
        // 로컬 스토리지에도 저장 (백업)
        localStorage.setItem(`hub_preferredSports_${user.uid}`, JSON.stringify(sports));
      } catch (err) {
        console.warn("⚠️ [HubContext] 선호 종목 저장 실패:", err);
        // 에러 시에도 로컬 스토리지에 저장
        localStorage.setItem(`hub_preferredSports_${user.uid}`, JSON.stringify(sports));
      }
    }
  };

  // 🔥 위치 업데이트
  const updateLocation = (location: LatLng, accuracy?: number) => {
    setCurrentLocation(location);
    if (accuracy !== undefined) {
      setLocationAccuracy(accuracy);
    }
  };

  // 🔥 허브 리셋
  const resetHub = () => {
    setActiveSport(null);
    setActivityFocus(null);
    setLastActivity(null);
  };

  // 🔥 Activity 변경 시 로깅
  useEffect(() => {
    if (activityFocus) {
      setLastActivity(activityFocus);
      console.log(`🔥 [HubContext] Activity Focus: ${activityFocus}`);
    }
  }, [activityFocus]);

  // 🔥 useMemo로 value 안정화 - 불필요한 컨텍스트 리렌더/무한 루프 방지
  const value = useMemo<HubContextValue>(
    () => ({
      currentLocation,
      locationAccuracy,
      preferredSports,
      activeSport,
      setActiveSport,
      timeContext,
      activityFocus,
      setActivityFocus,
      isHubActive,
      lastActivity,
      updateLocation,
      updatePreferredSports,
      resetHub,
    }),
    [
      currentLocation,
      locationAccuracy,
      preferredSports,
      activeSport,
      timeContext,
      activityFocus,
      isHubActive,
      lastActivity,
    ]
  );

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}
