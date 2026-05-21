// src/pages/SettingsPage.tsx
import { ResetSessionButton } from "@/components/ResetSessionButton";
import { useAuth } from "@/context/AuthProvider";
import { Settings, User, LogOut } from "lucide-react";

const stroke = 1.5 as const;

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div
      className="-mx-4 min-h-[calc(100dvh-10rem)] bg-zinc-950 px-4 py-8 text-zinc-50 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      aria-label="설정"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-4">
          <Settings
            className="h-6 w-6 shrink-0 text-zinc-300"
            strokeWidth={stroke}
            aria-hidden
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">설정</h1>
            <p className="mt-0.5 text-sm text-zinc-400">계정과 앱 환경을 관리합니다</p>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-4 border-b border-zinc-800 px-4 py-4">
            <User
              className="h-5 w-5 shrink-0 text-zinc-400"
              strokeWidth={stroke}
              aria-hidden
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white">계정 정보</h2>
              <p className="text-sm text-zinc-400">로그인된 프로필</p>
            </div>
          </div>
          <div className="space-y-3 px-4 py-5">
            {user ? (
              <>
                <p className="text-sm text-zinc-300">
                  <span className="font-medium text-zinc-200">이메일</span>
                  <span className="mx-2 text-zinc-600">·</span>
                  {user.email || "없음"}
                </p>
                <p className="text-sm text-zinc-300">
                  <span className="font-medium text-zinc-200">이름</span>
                  <span className="mx-2 text-zinc-600">·</span>
                  {user.displayName || "없음"}
                </p>
                <p className="text-sm text-zinc-500">
                  {user.isAnonymous ? "익명 계정" : "정식 계정"}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">로그인되지 않음</p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-red-900/40 bg-red-950/25">
          <div className="flex items-center gap-4 border-b border-red-900/35 px-4 py-4">
            <LogOut
              className="h-5 w-5 shrink-0 text-red-400"
              strokeWidth={stroke}
              aria-hidden
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-red-100">세션 관리</h2>
              <p className="text-sm text-red-300/80">
                로그아웃하고 로컬 세션 데이터를 초기화합니다
              </p>
            </div>
          </div>
          <div className="px-4 py-5">
            <ResetSessionButton
              variant="outline"
              className="border-red-500/40 text-red-200 hover:border-red-400/60 hover:bg-red-950/50"
            />
          </div>
        </section>

        <p className="pt-2 text-center text-xs text-zinc-600">YAGO SPORTS v1.0.0</p>
      </div>
    </div>
  );
}
