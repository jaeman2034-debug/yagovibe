import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { POPULAR_SPORTS, SPORTS, normalizeSportId, type SportId } from "@/constants/sports";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "lastSport";

export default function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) {
        navigate("/hub", { replace: true });
      }
    } catch {
      /* ignore */
    }
  }, [navigate]);

  const choose = (id: SportId) => {
    const n = normalizeSportId(id);
    if (!n) return;
    try {
      localStorage.setItem(STORAGE_KEY, n);
    } catch {
      /* ignore */
    }
    navigate("/hub", { replace: true });
  };

  const skipSoccer = () => {
    choose("soccer");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 px-4 py-10">
      <div className="mx-auto w-full max-w-none md:max-w-3xl">
        <h1 className="text-center text-xl font-bold text-gray-900">어떤 스포츠를 하시나요?</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          홈·마켓 추천에 쓰이며, 언제든 허브에서 바꿀 수 있어요.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {POPULAR_SPORTS.map((id) => {
            const cfg = SPORTS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-6 shadow-sm transition hover:border-gray-300 hover:shadow"
              >
                <span className="text-3xl" aria-hidden>
                  {cfg.icon}
                </span>
                <span className="mt-2 text-sm font-semibold text-gray-900">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button type="button" variant="ghost" size="sm" className="text-gray-600" onClick={skipSoccer}>
            기본(축구)으로 시작
          </Button>
        </div>
      </div>
    </div>
  );
}
