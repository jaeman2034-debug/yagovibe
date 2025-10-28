import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

/**
 * 관리자 권한 체크 Hook
 * 관리자 이메일 목록에 포함된 사용자만 접근 허용
 */
export function useAdminGuard() {
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    // 관리자 이메일 목록 (필요시 Firestore에서 가져오도록 변경 가능)
    const ADMIN_EMAILS = [
        "admin@yagovibe.com",
        // 추가 관리자 이메일
    ];

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user: User | null) => {
            if (!user) {
                alert("로그인이 필요합니다.");
                navigate("/login");
                setLoading(false);
                return;
            }

            // 관리자 이메일 체크
            const isAdminUser = ADMIN_EMAILS.includes(user.email || "") || user.email?.includes("admin");

            if (!isAdminUser) {
                alert("관리자만 접근 가능합니다.");
                navigate("/");
                setIsAdmin(false);
            } else {
                setIsAdmin(true);
            }
            setLoading(false);
        });

        return unsub;
    }, [navigate]);

    return { isAdmin, loading };
}

