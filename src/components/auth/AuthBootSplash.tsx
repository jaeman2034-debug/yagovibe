/**
 * Auth 초기화·리다이렉트 복구 동안 로그인 화면 깜빡임 방지용 스플래시
 */
export function AuthBootSplash({
  message = "자동 로그인 확인 중…",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-white px-4 ${className}`.trim()}
    >
      <div
        className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        aria-hidden
      />
      <p className="mt-4 text-center text-sm text-gray-600">{message}</p>
    </div>
  );
}
