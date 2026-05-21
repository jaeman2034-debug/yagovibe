import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { checkUserRole, getLastRoleCheckDebugSnapshot, type RoleCheckDebugSnapshot } from "@/lib/checkUserRole";

export type UserRole = "admin" | "manager" | "viewer" | "guest" | "loading";

export function useRoleGate() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>("loading");
  const [debug, setDebug] = useState<RoleCheckDebugSnapshot | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (!currentUser) {
        setRole("guest");
        setLoading(false);
        return;
      }

      // Custom Claims에서 역할 확인
      try {
        const userRole = await checkUserRole();
        setRole(userRole);
        setDebug(getLastRoleCheckDebugSnapshot());
      } catch (error) {
        console.error("역할 확인 오류:", error);
        setRole("guest");
        setDebug(getLastRoleCheckDebugSnapshot());
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    role,
    /** 플랫폼 운영자(KPI·Callable·Rules `isGlobalAdmin` 과 동일 기준) — {@link checkUserRole} → portalRole */
    isPlatformAdmin: role === "admin",
    isAdmin: role === "admin",
    isManager: role === "manager" || role === "admin",
    isViewer: role === "viewer" || role === "manager" || role === "admin",
    canEdit: role === "admin", // admin만 전체 기능 접근 가능
    canManage: role === "admin" || role === "manager", // manager는 리포트 확인/Slack 전송만 가능
    canView: role !== "guest" && role !== "loading",
    loading: loading || role === "loading",
    user,
    debug,
  };
}

