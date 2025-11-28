// src/pages/DebugPage.tsx
/**
 * 🔥 디버그 패널 (Debug Panel)
 * 
 * 테스트 모드에서 앱의 상태를 확인하고 디버깅할 수 있는 도구
 * - 사용자 정보 확인
 * - FCM 토큰 관리
 * - 라우팅 테스트
 * - 로컬 스토리지 관리
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { registerPushNotifications } from "@/lib/pushNotifications";
import { saveDeviceToken } from "@/lib/saveDeviceToken";
import { Device } from "@capacitor/device";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LogOut, RefreshCw, Trash2, Navigation, TestTube, User, Smartphone, Database } from "lucide-react";

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [deviceId, setDeviceId] = useState<string>("");
  const [fcmToken, setFcmToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 사용자 상태 감지
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        loadDeviceToken(u.uid);
      } else {
        setFcmToken("");
      }
    });

    // 디바이스 정보 가져오기
    Device.getInfo()
      .then((info) => {
        setDeviceInfo(info);
      })
      .catch((err) => {
        console.error("디바이스 정보 가져오기 실패:", err);
      });

    // 디바이스 ID 가져오기
    Device.getId()
      .then((info) => {
        setDeviceId(info.identifier || info.uuid || "N/A");
      })
      .catch((err) => {
        console.error("디바이스 ID 가져오기 실패:", err);
        // localStorage에서 device_id 가져오기
        const storedDeviceId = localStorage.getItem("device_id");
        if (storedDeviceId) {
          setDeviceId(storedDeviceId);
        }
      });

    return () => unsub();
  }, []);

  // Firestore에서 FCM 토큰 가져오기
  const loadDeviceToken = async (uid: string) => {
    try {
      const storedDeviceId = localStorage.getItem("device_id");
      if (!storedDeviceId) {
        setFcmToken("디바이스 ID 없음");
        return;
      }

      const deviceRef = doc(db, `users/${uid}/devices/${storedDeviceId}`);
      const deviceSnap = await getDoc(deviceRef);

      if (deviceSnap.exists()) {
        const data = deviceSnap.data();
        setFcmToken(data.token || "토큰 없음");
      } else {
        setFcmToken("Firestore에 토큰 없음");
      }
    } catch (error) {
      console.error("토큰 로드 실패:", error);
      setFcmToken("로드 실패");
    }
  };

  // FCM 토큰 강제 갱신
  const refreshToken = async () => {
    setLoading(true);
    try {
      console.log("🔄 FCM 토큰 갱신 시도");
      await registerPushNotifications();
      
      // 잠시 후 토큰 다시 로드
      setTimeout(() => {
        if (user) {
          loadDeviceToken(user.uid);
        }
      }, 2000);
      
      alert("✅ FCM 토큰 갱신 완료! (2초 후 자동 새로고침)");
    } catch (error) {
      console.error("토큰 갱신 실패:", error);
      alert("❌ 토큰 갱신 실패: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 푸시 클릭 시뮬레이션
  const simulatePushClick = (route: string) => {
    console.log(`🧪 Simulate push click: ${route}`);
    window.location.href = route;
  };

  // 로컬 스토리지 초기화
  const clearLocal = () => {
    if (window.confirm("⚠️ 로컬 스토리지를 모두 삭제하시겠습니까?\n\n(로그인 정보도 삭제됩니다)")) {
      console.log("🧹 Local storage cleared");
      localStorage.clear();
      sessionStorage.clear();
      alert("✅ 로컬 스토리지 초기화 완료!");
      window.location.reload();
    }
  };

  // 강제 로그아웃
  const forceLogout = async () => {
    if (window.confirm("⚠️ 강제 로그아웃하시겠습니까?")) {
      try {
        await signOut(auth);
        alert("✅ 로그아웃 완료!");
        navigate("/login");
      } catch (error) {
        console.error("로그아웃 실패:", error);
        alert("❌ 로그아웃 실패: " + (error as Error).message);
      }
    }
  };

  // 라우팅 테스트
  const testRoute = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Debug Panel</h1>
          <p className="text-gray-600 text-sm">
            테스트 모드 전용 디버깅 도구 - 실서비스에서는 숨겨집니다
          </p>
        </div>

        {/* 사용자 정보 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">사용자 정보</h2>
          </div>
          {user ? (
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {JSON.stringify(
                  {
                    uid: user.uid,
                    email: user.email || "없음",
                    phone: user.phoneNumber || "없음",
                    displayName: user.displayName || "없음",
                    isAnonymous: user.isAnonymous,
                    providers: user.providerData.map((p: any) => p.providerId),
                    emailVerified: user.emailVerified,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">❌ 로그인되지 않음</p>
            </div>
          )}
        </section>

        {/* 디바이스 정보 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">디바이스 정보</h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {JSON.stringify(
                {
                  ...deviceInfo,
                  deviceId: deviceId || localStorage.getItem("device_id") || "N/A",
                },
                null,
                2
              )}
            </pre>
          </div>
        </section>

        {/* FCM 토큰 정보 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">FCM 토큰 정보</h2>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">디바이스 ID:</span>
                <p className="text-sm text-gray-800 font-mono break-all">
                  {deviceId || localStorage.getItem("device_id") || "N/A"}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">FCM 토큰:</span>
                <p className="text-sm text-gray-800 font-mono break-all">
                  {fcmToken || "로딩 중..."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 액션 버튼들 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">디버그 액션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* FCM 토큰 갱신 */}
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={refreshToken}
              disabled={loading || !user}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "갱신 중..." : "FCM 토큰 갱신"}
            </button>

            {/* 강제 로그아웃 */}
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
              onClick={forceLogout}
              disabled={!user}
            >
              <LogOut className="w-4 h-4" />
              강제 로그아웃
            </button>

            {/* 로컬 스토리지 초기화 */}
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              onClick={clearLocal}
            >
              <Trash2 className="w-4 h-4" />
              로컬 스토리지 초기화
            </button>

            {/* 푸시 클릭 시뮬레이션 */}
            <button
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              onClick={() => simulatePushClick("/facility/123")}
            >
              <TestTube className="w-4 h-4" />
              푸시 클릭 시뮬레이션
            </button>
          </div>
        </section>

        {/* 라우팅 테스트 */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">라우팅 테스트</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
              onClick={() => testRoute("/login")}
            >
              /login
            </button>
            <button
              className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
              onClick={() => testRoute("/sports-hub")}
            >
              /sports-hub
            </button>
            <button
              className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
              onClick={() => testRoute("/facility/123")}
            >
              /facility/123
            </button>
            <button
              className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm"
              onClick={() => testRoute("/app/settings")}
            >
              /app/settings
            </button>
          </div>
        </section>

        {/* 로컬 스토리지 내용 (선택사항) */}
        <section className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">로컬 스토리지 내용</h2>
          <div className="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-800">
              {Object.keys(localStorage).length > 0
                ? JSON.stringify(
                    Object.fromEntries(
                      Object.keys(localStorage).map((key) => [
                        key,
                        localStorage.getItem(key)?.substring(0, 100) || "",
                      ])
                    ),
                    null,
                    2
                  )
                : "로컬 스토리지가 비어있습니다"}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}

