import React from "react";
import { useFCM } from "@/hooks/useFCM";

export default function FCMTest() {
    const { requestPermission } = useFCM();

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 text-gray-800">
            <h1 className="text-2xl font-bold mb-4">🔔 FCM 브라우저 푸시 테스트</h1>
            <button
                onClick={requestPermission}
                className="px-6 py-3 bg-indigo-500 text-white rounded-xl shadow hover:bg-indigo-600 transition"
            >
                알림 권한 요청 및 토큰 재발급
            </button>
            <p className="mt-4 text-sm text-gray-500">
                콘솔에서 <b>토큰</b>을 확인하고 Functions로 테스트 메시지를 전송하세요.
            </p>
        </div>
    );
}
