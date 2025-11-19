import { useAuth } from "@/context/AuthProvider";
import { UserCircle } from "lucide-react";
import InstallAppButton from "@/components/InstallAppButton";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm dark:bg-gray-800/90">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <UserCircle className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-800">YAGO VIBE</span>
        </div>

        <div className="flex items-center gap-3">
          <InstallAppButton />
          <div className="text-sm text-gray-600">
            {user ? (
              <span>
                {user.displayName || "익명 사용자"}{" "}
                <span className="text-xs text-gray-400">
                  ({user.email ? user.email : "로그인 유지 중"})
                </span>
              </span>
            ) : (
              <span className="text-gray-400">로그인되지 않음</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
