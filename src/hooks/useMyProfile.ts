/**
 * 🔥 useMyProfile - 사용자 프로필 조회 훅 (PR 1)
 * 
 * PR 1 설계 원칙:
 * - 훅은 절대 throw 하지 않는다
 * - 항상 기본값을 반환한다 (return null)
 * - enabled 가드로 신규/비로그인 안전
 * - 프로필 없음 = null (정상)
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: "USER" | "ADMIN";
  profileCompleted?: boolean;
  [key: string]: any;
}

/**
 * 🔥 사용자 프로필 조회 훅
 * 
 * PR 1 완료 조건:
 * - enabled: !!userId
 * - try/catch + 기본값
 * - throw 없음
 * - undefined 반환 없음
 */
export function useMyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 🔥 PR 1: enabled 가드 패턴
    const enabled = !!user?.uid;
    
    if (!enabled) {
      // 사용자 없음 = 정상 상태 (프로필 없음)
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        
        // 🔥 PR 1: 프로필 없음 = null (정상)
        if (snap.exists()) {
          setProfile({
            id: snap.id,
            ...snap.data(),
          } as UserProfile);
        } else {
          setProfile(null); // 프로필 없음 = 정상 상태
        }
        setError(null);
      } catch (err) {
        // 🔥 PR 1: 권한 오류는 정상 상태로 처리
        const isPermissionError = err instanceof Error && (
          err.message?.includes('permission') ||
          err.message?.includes('Permission')
        );
        
        if (isPermissionError) {
          console.warn("[useMyProfile] 권한 없음 (정상 상태):", err);
          setProfile(null); // 프로필 없음 = 정상 상태
          setError(null); // 에러로 처리하지 않음
        } else {
          console.warn("[useMyProfile] 프로필 조회 실패 (정상 상태로 처리):", err);
          setProfile(null); // 기본값
          setError(null); // 에러로 처리하지 않음
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.uid]);

  // 🔥 PR 1: 최종 반환값 보장 (절대 undefined 금지)
  return {
    profile: profile ?? null, // null 또는 UserProfile
    loading: typeof loading === 'boolean' ? loading : false, // 항상 boolean
    error: error instanceof Error ? error : null, // null 또는 Error 객체
    hasProfile: profile !== null && profile.profileCompleted === true, // profileCompleted 확인
  };
}
