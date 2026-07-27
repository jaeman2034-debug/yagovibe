/**
 * 로그인 후 /hub·협회 홈 등으로 떨어져도
 * pendingInviteToken 이 있으면 `/invite?token=...` 로 강제 복귀.
 */
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import {
  getPendingInviteReturnPath,
  isPendingInviteReturn,
} from "@/lib/auth/pendingInviteReturn";

export function PendingInviteRestoreGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastNavRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user || user.isAnonymous) return;

    const pending = getPendingInviteReturnPath();
    if (!isPendingInviteReturn(pending) || !pending) return;

    const here = `${location.pathname}${location.search}`;
    // 이미 올바른 invite URL 이면 유지
    if (here.startsWith("/invite?") || here === "/invite") {
      const hereToken = new URLSearchParams(location.search).get("token");
      const pendingToken = new URL(pending, "https://yago-vibe-spt.web.app").searchParams.get(
        "token"
      );
      if (hereToken && pendingToken && hereToken === pendingToken) return;
      if (!hereToken && pending.includes("token=")) {
        if (lastNavRef.current === pending) return;
        lastNavRef.current = pending;
        console.log("[PendingInviteRestoreGate] restore missing token →", pending);
        navigate(pending, { replace: true });
      }
      return;
    }

    // 로그인/온보딩 중에는 AuthProvider/PublicRoute가 next 처리
    if (
      location.pathname.startsWith("/login") ||
      location.pathname.startsWith("/signup") ||
      location.pathname.startsWith("/onboarding")
    ) {
      return;
    }

    // Hub·홈·온보딩·협회는 pending으로 뺏지 않음 — 사용완료 초대 루프 방지.
    if (
      location.pathname === "/hub" ||
      location.pathname.startsWith("/hub/") ||
      location.pathname === "/home" ||
      location.pathname.startsWith("/home/") ||
      location.pathname.startsWith("/onboarding") ||
      location.pathname.startsWith("/federations")
    ) {
      return;
    }

    if (lastNavRef.current === pending) return;
    lastNavRef.current = pending;
    console.log("[PendingInviteRestoreGate] steal-back from", here, "→", pending);
    navigate(pending, { replace: true });
  }, [user, loading, location.pathname, location.search, navigate]);

  return null;
}
