/**
 * ProtectedRoute·온보딩 등에서 쓰는 훅.
 * ⚠️ Auth 상태는 AuthProvider에서 onAuthStateChanged + getRedirectResultOnce 처리.
 * 여기서는 Context의 user/loading을 따르고, users/{uid} 실시간 반영만 onSnapshot으로 맞춘다.
 */

import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";

export function useAuthUser() {
  const { user, loading: authLoading } = useAuth();
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(null);
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    profileUnsubRef.current?.();
    profileUnsubRef.current = null;

    if (authLoading) return;
    const uid = user?.uid ?? auth.currentUser?.uid;
    if (!uid) {
      setLiveProfile(null);
      return;
    }

    const userRef = doc(db, "users", uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setLiveProfile(null);
          return;
        }
        const data = snap.data() as UserProfile;
        setLiveProfile(data);
      },
      (err) => {
        console.error("❌ [useAuthUser] users onSnapshot 실패:", err);
      }
    );
    profileUnsubRef.current = unsub;
    return () => {
      unsub();
      profileUnsubRef.current = null;
    };
  }, [authLoading, user?.uid]);

  return {
    authUser: authLoading ? null : (user ?? auth.currentUser),
    profile: liveProfile,
    loading: authLoading,
  };
}
