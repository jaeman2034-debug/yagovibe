import { useAuth } from "@/context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { UserCircle } from "lucide-react";
import InstallAppButton from "@/components/InstallAppButton";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      // 필요하면 여기서 홈이나 로그인 페이지로 이동
      navigate("/login");
    } catch (err) {
      console.error("❌ 로그아웃 실패:", err);
      alert("로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm dark:bg-gray-800/90">
      <div className="flex items-center justify-between px-4 py-2 w-full">
        <div className="flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-800">YAGO VIBE</span>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <InstallAppButton />

          {user ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
              <span>
                {user.displayName || user.email?.split("@")[0] || "익명 사용자"}{" "}
                <span className="text-xs text-gray-400">
                  ({user.isAnonymous
                    ? "익명 로그인"
                    : user.email
                    ? user.email
                    : "로그인 유지 중"})
                </span>
              </span>

              {/* 🔥 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="text-xs px-2 py-1 border border-gray-300 rounded-full hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap font-medium"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
