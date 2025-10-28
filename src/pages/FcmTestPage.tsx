/**
 * 🔔 FCM 테스트 페이지
 * 브라우저에서 FCM 푸시 알림을 테스트하는 페이지
 */

import { useState, useEffect } from "react";
import { requestPermissionAndGetToken, setupForegroundMessageHandler, getCurrentToken } from "@/lib/fcm";

export default function FcmTestPage() {
    const [token, setToken] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 포그라운드 메시지 핸들러 설정
        setupForegroundMessageHandler();

        // 현재 권한 상태 확인
        if ("Notification" in window) {
            setPermission(Notification.permission);

            // 이미 권한이 있으면 토큰 가져오기 시도
            if (Notification.permission === "granted") {
                getCurrentToken().then((currentToken) => {
                    if (currentToken) {
                        setToken(currentToken);
                    }
                });
            }
        } else {
            setError("이 브라우저는 알림을 지원하지 않습니다.");
        }
    }, []);

    const handleRequestToken = async () => {
        setLoading(true);
        setError(null);

        try {
            const newToken = await requestPermissionAndGetToken();
            if (newToken) {
                setToken(newToken);
                setPermission(Notification.permission);
            } else {
                setError("FCM 토큰을 가져올 수 없습니다. 브라우저 콘솔을 확인하세요.");
            }
        } catch (err) {
            setError(`오류 발생: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert("✅ 토큰이 클립보드에 복사되었습니다!");
        } catch (err) {
            console.error("클립보드 복사 실패:", err);
            alert("클립보드 복사에 실패했습니다. 수동으로 복사해주세요.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-2xl mx-auto px-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        🔔 FCM 푸시 알림 테스트
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Firebase Cloud Messaging을 사용하여 브라우저 푸시 알림을 테스트합니다.
                    </p>

                    {/* 권한 상태 */}
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            알림 권한 상태
                        </h2>
                        <div className="flex items-center gap-2">
                            <span
                                className={`px-3 py-1 rounded-full text-sm font-semibold ${permission === "granted"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : permission === "denied"
                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                            >
                                {permission === "granted"
                                    ? "✅ 허용됨"
                                    : permission === "denied"
                                        ? "❌ 거부됨"
                                        : "⏳ 대기 중"}
                            </span>
                            {permission === "denied" && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    브라우저 설정에서 알림 권한을 허용해주세요.
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 토큰 */}
                    {token ? (
                        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                ✅ FCM 등록 토큰
                            </h2>
                            <div className="bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 mb-3">
                                <code className="text-xs text-gray-800 dark:text-gray-200 break-all">
                                    {token}
                                </code>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => copyToClipboard(token)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                                >
                                    📋 토큰 복사
                                </button>
                                <a
                                    href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/notification/compose`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm"
                                >
                                    🔥 Firebase 콘솔에서 테스트
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <p className="text-gray-700 dark:text-gray-300 text-sm">
                                FCM 토큰을 획득하려면 아래 버튼을 클릭하세요.
                            </p>
                        </div>
                    )}

                    {/* 액션 버튼 */}
                    <div className="space-y-4">
                        <button
                            onClick={handleRequestToken}
                            disabled={loading || permission === "granted"}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    <span>처리 중...</span>
                                </>
                            ) : (
                                <>
                                    <span>🔔</span>
                                    <span>알림 권한 요청 및 FCM 토큰 획득</span>
                                </>
                            )}
                        </button>

                        {token && (
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    📝 다음 단계
                                </h3>
                                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                    <li>위의 "토큰 복사" 버튼을 클릭하여 FCM 토큰을 복사합니다.</li>
                                    <li>
                                        <a
                                            href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/notification/compose`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 dark:text-blue-400 underline"
                                        >
                                            Firebase Console
                                        </a>
                                        에서 "새 알림 보내기"를 클릭합니다.
                                    </li>
                                    <li>대상 선택 → "웹 앱" 선택</li>
                                    <li>복사한 FCM 토큰을 입력합니다.</li>
                                    <li>제목과 내용을 입력하고 "보내기"를 클릭합니다.</li>
                                    <li>브라우저 오른쪽 하단에 푸시 알림이 표시되면 성공입니다! 🎉</li>
                                </ol>
                            </div>
                        )}
                    </div>

                    {/* 오류 메시지 */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* 디버그 정보 */}
                    <details className="mt-6">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-600 dark:text-gray-400">
                            🔧 디버그 정보
                        </summary>
                        <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-700 rounded text-xs font-mono">
                            <p>VAPID Key: {import.meta.env.VITE_FIREBASE_VAPID_KEY ? "✅ 설정됨" : "❌ 없음"}</p>
                            <p>Service Worker: /firebase-messaging-sw.js</p>
                            <p>브라우저: {navigator.userAgent}</p>
                            <p>권한: {Notification.permission}</p>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}

