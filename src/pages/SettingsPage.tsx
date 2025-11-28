// src/pages/SettingsPage.tsx
import { ResetSessionButton } from "@/components/ResetSessionButton";
import { useAuth } from "@/context/AuthProvider";
import { Settings, User, LogOut } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">설정</h1>
          </div>

          {/* 사용자 정보 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">계정 정보</h2>
            </div>
            {user ? (
              <div className="ml-8 space-y-1">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">이메일:</span> {user.email || "없음"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">이름:</span> {user.displayName || "없음"}
                </p>
                <p className="text-sm text-gray-500">
                  {user.isAnonymous ? "익명 계정" : "정식 계정"}
                </p>
              </div>
            ) : (
              <p className="ml-8 text-sm text-gray-500">로그인되지 않음</p>
            )}
          </div>

          {/* 세션 관리 */}
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <LogOut className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-900">세션 관리</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4 ml-8">
              로그아웃하고 모든 세션 데이터를 초기화합니다.
            </p>
            <div className="ml-8">
              <ResetSessionButton variant="outline" />
            </div>
          </div>

          {/* 앱 정보 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 text-center">
              YAGO VIBE v1.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

