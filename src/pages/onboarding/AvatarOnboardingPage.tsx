import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PlayerAvatar } from "@/components/avatar/PlayerAvatar";
import { useAuth } from "@/context/AuthProvider";
import { sanitizePostLoginRedirectTarget } from "@/lib/auth/sanitizePostLoginRedirect";
import { parseAvatarStylePrompt } from "@/lib/avatar/avatarAiStylist";
import {
  AVATAR_ONBOARDING_OPTIONS,
  AVATAR_STYLE_PRESETS,
  defaultOnboardingAppearance,
} from "@/lib/avatar/onboardingOptions";
import { completeAvatarOnboarding, getAvatarDocExists, normalizeAvatarJerseyNumber, type AvatarOnboardingAppearance } from "@/services/avatarService";

type Flow = "gate" | "ai" | "edit";

const AI_EXAMPLES = [
  "빠른 윙어 느낌, 짧은 머리, 근육형",
  "깔끔한 공격수 스타일, 보라 유니폼",
  "스트리트 풋볼 느낌, 후드",
];

/**
 * PR-11D — 하이브리드 온보딩: AI 스타일(로컬 파서) 또는 직접 꾸미기, 라이브 `PlayerAvatar` 미리보기.
 */
export default function AvatarOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [flow, setFlow] = useState<Flow>("gate");
  const [displayName, setDisplayName] = useState(() => user?.displayName?.trim() ?? "");
  const [appearance, setAppearance] = useState<AvatarOnboardingAppearance>(() => defaultOnboardingAppearance());
  const [aiPrompt, setAiPrompt] = useState("");
  const [jerseyInput, setJerseyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextTarget = useMemo(() => {
    const raw = searchParams.get("next") ?? searchParams.get("redirect");
    return sanitizePostLoginRedirectTarget(raw) ?? "/hub";
  }, [searchParams]);

  const previewJersey = useMemo(() => normalizeAvatarJerseyNumber(jerseyInput.trim() || undefined), [jerseyInput]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid || user.isAnonymous) return;
    let cancelled = false;
    void (async () => {
      const exists = await getAvatarDocExists(uid);
      if (!cancelled && exists) {
        navigate(nextTarget, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, navigate, nextTarget]);

  const onSelect = useCallback((key: keyof AvatarOnboardingAppearance, value: string) => {
    setAppearance((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goEditIfName = () => {
    const name = displayName.trim();
    if (name.length < 1 || name.length > 64) {
      setError("닉네임은 1~64자로 입력해 주세요.");
      return false;
    }
    setError(null);
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const uid = user?.uid;
    if (!uid || user.isAnonymous) {
      setError("로그인이 필요합니다.");
      return;
    }
    const name = displayName.trim();
    if (name.length < 1 || name.length > 64) {
      setError("닉네임은 1~64자로 입력해 주세요.");
      return;
    }
    const jn = normalizeAvatarJerseyNumber(jerseyInput.trim() || undefined);
    if (jerseyInput.trim() !== "" && jn === undefined) {
      setError("배번은 1~99 사이로 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await completeAvatarOnboarding(uid, {
        displayName: name,
        appearance,
        ...(jn !== undefined ? { jerseyNumber: jn } : {}),
      });
      navigate(nextTarget, { replace: true });
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      if (code === "avatar_already_exists") {
        navigate(nextTarget, { replace: true });
        return;
      }
      setError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  const labelFor = (key: keyof AvatarOnboardingAppearance) => {
    switch (key) {
      case "bodyType":
        return "체형";
      case "hair":
        return "헤어";
      case "face":
        return "페이스";
      case "skinTone":
        return "스킨톤";
      case "outfit":
        return "상의 스타일";
      case "shoes":
        return "신발";
      default:
        return key;
    }
  };

  if (!user || user.isAnonymous) {
    return (
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl py-16 text-center text-slate-600">
        아바타 설정은 로그인한 계정에서만 진행할 수 있습니다.
      </div>
    );
  }

  const nameField = (
    <div>
      <label className="block text-sm font-medium text-slate-800" htmlFor="avatar-display-name">
        닉네임 (표시 이름)
      </label>
      <input
        id="avatar-display-name"
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        value={displayName}
        onChange={(ev) => setDisplayName(ev.target.value)}
        maxLength={64}
        autoComplete="nickname"
        placeholder="예: 야고킹"
      />
    </div>
  );

  if (flow === "gate") {
    return (
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-lg py-10">
        <h1 className="text-xl font-semibold text-slate-900">야고 플레이어 만들기</h1>
        <p className="mt-2 text-sm text-slate-600">
          원하는 선수 스타일을 설명하거나 직접 꾸며 보세요.
        </p>
        <div className="mt-8 space-y-6">
          {nameField}
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-left text-sm font-semibold text-indigo-900 shadow-sm transition hover:bg-indigo-100"
              onClick={() => {
                if (!goEditIfName()) return;
                setFlow("ai");
              }}
            >
              AI 스타일로 만들기
              <span className="mt-1 block text-xs font-normal text-indigo-800/80">한 줄로 추천 받기</span>
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
              onClick={() => {
                if (!goEditIfName()) return;
                setFlow("edit");
              }}
            >
              직접 꾸미기
              <span className="mt-1 block text-xs font-normal text-slate-600">미리보기 보면서 선택</span>
            </button>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    );
  }

  if (flow === "ai") {
    return (
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-lg py-10">
        <button
          type="button"
          onClick={() => setFlow("gate")}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← 돌아가기
        </button>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">AI 스타일로 만들기</h1>
        <p className="mt-2 text-sm text-slate-600">원하는 선수 스타일을 자유롭게 적어 주세요. (서버 호출 없음)</p>
        <div className="mt-6 space-y-4">
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="예: 빠른 윙어 느낌, 짧은 머리, 근육형"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {AI_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                onClick={() => setAiPrompt(ex)}
              >
                예: {ex.slice(0, 16)}…
              </button>
            ))}
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
            onClick={() => {
              setAppearance(parseAvatarStylePrompt(aiPrompt));
              setFlow("edit");
            }}
          >
            AI 추천 만들기
          </button>
        </div>
      </div>
    );
  }

  /* flow === "edit" */
  return (
    <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl px-4 py-10">
      <button
        type="button"
        onClick={() => setFlow("gate")}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        ← 시작 방식 바꾸기
      </button>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">플레이어 꾸미기</h1>
      <p className="mt-2 text-sm text-slate-600">왼쪽 미리보기는 저장될 캐릭터와 동일하게 보입니다.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-8">
        {nameField}

        <div>
          <label className="block text-sm font-medium text-slate-800" htmlFor="avatar-jersey-number">
            선호 배번 (선택)
          </label>
          <p className="mt-0.5 text-xs text-slate-500">1~99. 저지 가슴에 표시됩니다.</p>
          <input
            id="avatar-jersey-number"
            type="number"
            min={1}
            max={99}
            inputMode="numeric"
            className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={jerseyInput}
            onChange={(ev) => {
              const raw = ev.target.value;
              if (raw === "") {
                setJerseyInput("");
                return;
              }
              if (!/^\d{1,3}$/.test(raw)) return;
              setJerseyInput(raw);
            }}
            placeholder="예: 44"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-800">빠른 프리셋</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(AVATAR_STYLE_PRESETS).map(([name, preset]) => (
              <button
                key={name}
                type="button"
                onClick={() => setAppearance(preset)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-indigo-400 hover:bg-indigo-50"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex justify-center lg:sticky lg:top-24 lg:shrink-0">
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-indigo-50/40 p-4 shadow-inner">
              <PlayerAvatar
                appearance={appearance}
                variant="light"
                size="lg"
                jerseyNumber={previewJersey}
                aria-label="플레이어 미리보기"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            {(Object.keys(AVATAR_ONBOARDING_OPTIONS) as (keyof AvatarOnboardingAppearance)[]).map((key) => (
              <div key={key}>
                <span className="block text-sm font-medium text-slate-800">{labelFor(key)}</span>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={labelFor(key)}>
                  {AVATAR_ONBOARDING_OPTIONS[key].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => onSelect(key, opt)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                        appearance[key] === opt
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "저장 중…" : "시작하기"}
        </button>
      </form>
    </div>
  );
}
