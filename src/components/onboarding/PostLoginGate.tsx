/**
 * 🔥 PostLoginGate - 로그인 후 라우팅 가드
 * 
 * 역할:
 * - SMS 인증 성공 직후 실행
 * - 신규 유저 → 온보딩 (/profile/setup)
 * - 기존 유저 → 원래 가던 화면 (딥링크 복귀) 또는 홈
 * 
 * 판단 기준:
 * - Firestore users/{uid} 존재 여부
 * - isProfileComplete 플래그
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { FirstActionModal } from "../onboarding/FirstActionModal";
import { logLoginSuccess, logRetentionEvent } from "@/utils/retentionEvents";
import { requestNotificationPermission } from "@/utils/notificationPermission";
import { registerWebFcmIfEligible } from "@/lib/fcm/registerWebFcmIfEligible";
import { updateTrustScore } from "@/utils/trustScore";
import { sanitizePostLoginRedirectTarget } from "@/lib/auth/sanitizePostLoginRedirect";
import {
  clearPendingInviteTeamId,
  getPendingInviteTeamId,
} from "@/lib/team/pendingInviteTeam";

async function ensurePendingInviteTeamMembership(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
}) {
  const fromStorage = getPendingInviteTeamId();
  const fromUrl = (() => {
    if (typeof window === "undefined") return null;
    try {
      const url = new URL(window.location.href);
      const v = String(url.searchParams.get("teamId") || "").trim();
      if (!v) return null;
      if (v.includes("/") || v.includes("\\") || v === "." || v === "..") return null;
      return v;
    } catch {
      return null;
    }
  })();
  const teamId = fromStorage || fromUrl;
  if (!teamId) return;
  const uid = user.uid;
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) {
    sessionStorage.setItem("inviteAutoJoinStatus", "invalid_team");
    clearPendingInviteTeamId();
    return;
  }
  const memberRef = doc(db, "teams", teamId, "members", uid);
  const memberSnap = await getDoc(memberRef);
  const emailLocal = (user.email?.split("@")[0] || "").trim();
  const name =
    user.displayName?.trim() ||
    emailLocal ||
    "사용자";
  if (!memberSnap.exists()) {
    const batch = writeBatch(db);
    batch.set(
      memberRef,
      {
        userId: uid,
        uid,
        name,
        displayName: name,
        role: "member",
        status: "active",
        joinedVia: "invite_link",
        createdAt: serverTimestamp(),
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batch.set(
      doc(db, "team_members", `${uid}_${teamId}`),
      {
        teamId,
        userId: uid,
        uid,
        role: "member",
        status: "active",
        joinedVia: "invite_link",
        joinedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batch.set(
      doc(db, "users", uid, "teamMemberships", teamId),
      {
        teamId,
        role: "member",
        status: "active",
        joinedVia: "invite_link",
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await batch.commit();
    sessionStorage.setItem("inviteAutoJoinStatus", "joined");
  } else {
    sessionStorage.setItem("inviteAutoJoinStatus", "already_member");
    const batch = writeBatch(db);
    batch.set(
      doc(db, "team_members", `${uid}_${teamId}`),
      {
        teamId,
        userId: uid,
        uid,
        role: "member",
        status: "active",
        joinedVia: "invite_link",
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batch.set(
      doc(db, "users", uid, "teamMemberships", teamId),
      {
        teamId,
        role: "member",
        status: "active",
        joinedVia: "invite_link",
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    await batch.commit();
  }
  clearPendingInviteTeamId();
}

export function PostLoginGate() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasCheckedRef = useRef(false);
  const [showFirstActionModal, setShowFirstActionModal] = useState(false); // 중복 체크 방지

  useEffect(() => {
    // 로딩 중이거나 유저가 없으면 스킵
    if (loading || !user || user.isAnonymous) {
      return;
    }

    // 이미 체크했으면 스킵 (중복 실행 방지)
    if (hasCheckedRef.current) {
      return;
    }

    // 🔥 공개 페이지 또는 Admin 페이지에서는 실행하지 않음 (무한 루프 방지)
    const publicPaths = ["/login", "/signup", "/start", "/profile/setup", "/qr-login", "/login/qr-phone"];
    const isAdminPath = location.pathname.startsWith("/app/admin") || 
                       location.pathname.startsWith("/admin") ||
                       location.pathname.startsWith("/app/dashboard");
    
    if (publicPaths.includes(location.pathname) || isAdminPath) {
      return;
    }

    // 🔥 로그인 전 저장된 딥링크 복귀 경로 확인
    const afterLogin = sessionStorage.getItem("afterLogin");
    
    // 🔥 프로필 완성도 확인
    const checkProfileAndRedirect = async () => {
      try {
        hasCheckedRef.current = true; // 체크 시작 표시

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // 🔥 로그인 성공 이벤트 로깅
        await logLoginSuccess(user);
        try {
          await ensurePendingInviteTeamMembership(user);
        } catch (e) {
          console.warn("⚠️ [PostLoginGate] pending invite team auto-join 실패:", e);
        }

        // 🔥 알림 권한 요청 (로그인 직후 최적 타이밍) + 웹 FCM 토큰 등록
        void requestNotificationPermission(user).then(() => {
          void registerWebFcmIfEligible();
        });

        // 🔥 마지막 로그인 시간 업데이트
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp(),
        });

        // 🔥 신뢰도 스코어 업데이트 (재방문 체크 포함)
        // 🔥 배포 안정화: trustScore 업데이트 실패 시 graceful 처리
        updateTrustScore(user.uid, userSnap.data()).catch((error) => {
          // 권한 오류는 조용히 처리 (기본값으로 동작)
          if (error?.code === 'permission-denied' || error?.code === 'missing-or-insufficient-permissions') {
            console.warn("⚠️ [PostLoginGate] trustScore 업데이트 권한 오류 (무시):", error?.message);
          } else {
            console.error("❌ [PostLoginGate] trustScore 업데이트 실패:", error);
          }
        });

        // 🔥 신규 유저 또는 프로필 미완성 → 온보딩
        const userData = userSnap.data();
        const isProfileComplete = userData?.isProfileComplete ?? false;
        const onboardingCompleted = userData?.onboardingCompleted ?? false;
        
        // 🔥 온보딩 분기: 프로필 미완성 또는 온보딩 미완료
        if (!userSnap.exists() || !isProfileComplete || !onboardingCompleted) {
          console.log("🎯 [PostLoginGate] 신규 유저 또는 온보딩 미완료 → 온보딩");
          
          // 딥링크 경로 저장 (온보딩 후 복귀용)
          if (afterLogin) {
            const safe = sanitizePostLoginRedirectTarget(afterLogin);
            if (safe) sessionStorage.setItem("afterOnboarding", safe);
          } else if (location.pathname !== "/onboarding" && location.pathname !== "/login") {
            // 현재 경로가 온보딩/로그인 페이지가 아니면 저장
            sessionStorage.setItem("afterOnboarding", location.pathname + location.search);
          }
          
          navigate("/onboarding", { replace: true });
          return;
        }

        // 🔥 기존 유저: 첫 행동 확인
        const hasFirstAction = !!userData?.firstAction;

        // 🔥 첫 행동이 없으면 모달 표시
        if (!hasFirstAction) {
          console.log("🎯 [PostLoginGate] 첫 행동 없음 → 첫 행동 모달 표시");
          setShowFirstActionModal(true);
          
          // 딥링크가 있으면 저장 (모달 닫은 후 이동)
          if (afterLogin) {
            const safe = sanitizePostLoginRedirectTarget(afterLogin);
            if (safe) sessionStorage.setItem("afterFirstAction", safe);
          } else if (location.pathname !== "/hub" && location.pathname !== "/login") {
            sessionStorage.setItem("afterFirstAction", location.pathname + location.search);
          }
          
          return;
        }

        // 🔥 기존 유저 (프로필 완성) → 원래 가던 화면 또는 홈
        console.log("✅ [PostLoginGate] 기존 유저 (프로필 완성) → 원래 화면 또는 홈");
        
        // 딥링크 복귀
        if (afterLogin) {
          sessionStorage.removeItem("afterLogin");
          const safe = sanitizePostLoginRedirectTarget(afterLogin);
          navigate(safe ?? "/hub", { replace: true });
        } else {
          // 기본 홈 화면
          navigate("/hub", { replace: true });
        }
      } catch (error) {
        console.error("❌ [PostLoginGate] 프로필 확인 실패:", error);
        // 에러 발생 시 기본 홈 화면으로
        navigate("/hub", { replace: true });
      }
    };

    checkProfileAndRedirect();
  }, [user, loading, navigate, location]);

  const handleFirstActionClose = () => {
    setShowFirstActionModal(false);
    
    // 🔥 첫 행동 모달 닫은 후 딥링크 복귀 또는 홈으로
    const afterFirstAction = sessionStorage.getItem("afterFirstAction");
    sessionStorage.removeItem("afterFirstAction");
    const safeAfter = sanitizePostLoginRedirectTarget(afterFirstAction);

    if (safeAfter) {
      navigate(safeAfter, { replace: true });
    } else {
      navigate("/hub", { replace: true });
    }
  };

  return (
    <>
      {showFirstActionModal && (
        <FirstActionModal onClose={handleFirstActionClose} />
      )}
    </>
  );
}
