import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export type UserRole = "owner" | "coach" | "editor" | "viewer" | "secops";

export interface RoleAccess {
    role: UserRole | null;
    loading: boolean;
    isOwner: boolean;
    isEditor: boolean;
    isCoach: boolean;
    isViewer: boolean;
    canEdit: boolean;
    canView: boolean;
}

/**
 * Step 43: 역할 기반 권한 체크 Hook
 * reports/{reportId}/roles/{uid}에서 사용자 역할을 로드
 */
export function useRoleAccess(reportId: string): RoleAccess {
    const [role, setRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setRole(null);
                setLoading(false);
                return;
            }

            try {
                const rid = String(reportId ?? "").trim();
                if (!rid) {
                    setRole("viewer");
                    return;
                }
                // reports/{reportId}/roles/{uid}에서 역할 확인
                const { db } = await import("@/lib/firebase");
                const roleRef = doc(db, "reports", rid, "roles", user.uid);
                const roleSnap = await getDoc(roleRef);

                if (roleSnap.exists()) {
                    const roleData = roleSnap.data();
                    setRole(roleData.role || "viewer");
                } else {
                    setRole("viewer");
                }
            } catch (error: unknown) {
                const code =
                    error && typeof error === "object" && "code" in error
                        ? String((error as { code?: string }).code)
                        : "";
                if (code === "permission-denied" || code === "missing-or-insufficient-permissions") {
                    if (import.meta.env.DEV) {
                        console.debug(
                            "[useRoleAccess] reports 역할 문서 읽기 거부(경로·Rules 확인):",
                            { reportId, code }
                        );
                    }
                } else {
                    console.error("역할 로드 실패:", error);
                }
                setRole("viewer");
            } finally {
                setLoading(false);
            }
        });

        return unsub;
    }, [reportId]);

    const isOwner = role === "owner";
    const isCoach = role === "coach";
    const isEditor = role === "editor" || isOwner;
    const isViewer = role === "viewer" || isCoach || isEditor;
    const canEdit = isEditor;
    const canView = isViewer;

    return {
        role,
        loading,
        isOwner,
        isEditor,
        isCoach,
        isViewer,
        canEdit,
        canView,
    };
}

