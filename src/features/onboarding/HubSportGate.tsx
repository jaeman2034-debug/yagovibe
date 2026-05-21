import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "lastSport";

function readHasSport(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

/**
 * `lastSport` 미설정 시 온보딩으로 보냄 (직접 `/hub` 진입·북마크 대비)
 */
export function HubSportGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const hasSport = readHasSport();

  useEffect(() => {
    if (!hasSport) {
      navigate("/onboarding", { replace: true });
    }
  }, [hasSport, navigate]);

  if (!hasSport) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-gray-50">
        <div className="text-center text-sm text-gray-500">준비 중…</div>
      </div>
    );
  }

  return <>{children}</>;
}
