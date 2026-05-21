// 🔥 채팅 알림 ON/OFF 토글 컴포넌트

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../context/AuthProvider";

interface ChatNotificationToggleProps {
    className?: string;
}

export function ChatNotificationToggle({ className = "" }: ChatNotificationToggleProps) {
    const { user } = useAuth();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    // 🔥 사용자 알림 설정 로드
    useEffect(() => {
        if (!user) {
            setPushEnabled(true); // 기본값: 켜짐
            setLoading(false);
            return;
        }

        const loadSettings = async () => {
            try {
                const settingsRef = doc(db, "users", user.uid, "settings", "notifications");
                const settingsSnap = await getDoc(settingsRef);
                
                // 🔥 문서가 없으면 기본값 사용 (정상 흐름)
                if (!settingsSnap.exists()) {
                    setPushEnabled(true); // 기본값: 켜짐
                    setLoading(false);
                    return;
                }
                
                const data = settingsSnap.data();
                setPushEnabled(data.chatNotificationsEnabled !== false); // 기본값: true
            } catch (error: any) {
                // 🔥 permission-denied는 완전히 무시 (선택적 기능, 문서 없음 = 기본값 사용)
                if (error?.code === "permission-denied") {
                    setPushEnabled(true); // 기본값: 켜짐
                } else {
                    // 다른 에러는 경고만 (치명적이지 않음)
                    console.warn("⚠️ 알림 설정 로드 실패 (무시):", error);
                    setPushEnabled(true); // 에러 시 기본값: 켜짐
                }
            } finally {
                setLoading(false);
            }
        };

        void loadSettings();
    }, [user]);

    // 🔥 알림 설정 저장
    const handleToggle = async () => {
        if (!user) return;

        const newValue = !pushEnabled;
        setPushEnabled(newValue);

        try {
            const settingsRef = doc(db, "users", user.uid, "settings", "notifications");
            await setDoc(settingsRef, {
                chatNotificationsEnabled: newValue,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            
            console.log(`✅ 채팅 알림 ${newValue ? "켜짐" : "꺼짐"}`);
        } catch (error: any) {
            // 🔥 permission-denied는 조용히 무시 (선택적 기능)
            if (error?.code === "permission-denied") {
                // 조용히 무시 (UI는 이미 업데이트됨)
            } else {
                console.warn("⚠️ 알림 설정 저장 실패 (무시):", error);
                setPushEnabled(!newValue); // 실패 시 롤백
            }
        }
    };

    if (loading) {
        return (
            <button
                className={`px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 transition-colors ${className}`}
                disabled
            >
                로딩 중...
            </button>
        );
    }

    return (
        <button
            onClick={handleToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors active:scale-95 ${
                pushEnabled
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    : "bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400"
            } ${className}`}
            title={pushEnabled ? "채팅 알림 켜짐" : "채팅 알림 꺼짐"}
            aria-label={pushEnabled ? "채팅 알림 켜짐" : "채팅 알림 꺼짐"}
        >
            {pushEnabled ? "🔔 알림 켜짐" : "🔕 알림 꺼짐"}
        </button>
    );
}

