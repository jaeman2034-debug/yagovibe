import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LOGIN_REQUIRED_EVENT,
  LOGIN_REQUIRED_MESSAGES,
  type LoginRequiredDetail,
  type LoginRequiredReason,
} from "@/lib/auth/loginRequiredGate";

/**
 * 기능 사용 시점 로그인 유도 모달 (허브 선노출 정책)
 */
export function LoginRequiredModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [reason, setReason] = useState<LoginRequiredReason>("default");

  useEffect(() => {
    const onLoginRequired = (event: Event) => {
      const detail = (event as CustomEvent<LoginRequiredDetail>).detail;
      setReturnTo(detail?.returnTo ?? null);
      setReason(detail?.reason ?? "default");
      setOpen(true);
    };
    window.addEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
    return () => window.removeEventListener(LOGIN_REQUIRED_EVENT, onLoginRequired);
  }, []);

  if (!open) return null;

  const message = LOGIN_REQUIRED_MESSAGES[reason] ?? LOGIN_REQUIRED_MESSAGES.default;
  const nextQuery =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? `?next=${encodeURIComponent(returnTo)}`
      : "";

  const close = () => {
    setOpen(false);
    setReturnTo(null);
    setReason("default");
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="login-required-title" className="text-lg font-semibold text-gray-900">
          🔒 로그인이 필요합니다.
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              close();
              navigate(`/login${nextQuery}`);
            }}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              navigate(`/signup${nextQuery}`);
            }}
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            회원가입
          </button>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
