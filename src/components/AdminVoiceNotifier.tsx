import { useEffect, useRef } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 🎧 관리자 음성 알림 컴포넌트
 * Firestore 리포트 업데이트 시 자동으로 TTS로 알림 발송
 */
export default function AdminVoiceNotifier() {
    const hasNotifiedRef = useRef(false);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "reports", "weekly", "data", "summary"), (snap) => {
            if (snap.exists() && !hasNotifiedRef.current) {
                const data = snap.data();
                
                const summaryText = `신규 가입자: ${data.newUsers}명. ` +
                    `활성 사용자: ${data.activeUsers}명. ` +
                    `성장률: ${data.growthRate}. ` +
                    `${data.highlight}. ` +
                    `${data.recommendation}`;

                const fullMessage = `이번 주 AI 리포트가 업데이트되었습니다. ${summaryText}`;

                const synth = window.speechSynthesis;
                const utter = new SpeechSynthesisUtterance(fullMessage);
                utter.lang = "ko-KR";
                utter.rate = 1.5; // 최적 속도
                utter.pitch = 1.0;

                synth.speak(utter);
                hasNotifiedRef.current = true;

                console.log("🎧 음성 알림 발송:", fullMessage);

                // 5분 후 다시 알림 가능하도록 리셋
                setTimeout(() => {
                    hasNotifiedRef.current = false;
                }, 5 * 60 * 1000);
            }
        });

        return () => unsub();
    }, []);

    return null; // UI 없음 (백그라운드 음성 알림만)
}

