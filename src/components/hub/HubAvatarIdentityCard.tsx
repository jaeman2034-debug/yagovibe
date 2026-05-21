import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ChevronDown, Share2 } from "lucide-react";
import { PlayerAvatar } from "@/components/avatar/PlayerAvatar";
import { useAuth } from "@/context/AuthProvider";
import { useAvatarDoc } from "@/hooks/useAvatarDoc";
import { useUserBadgesDoc } from "@/hooks/useUserBadgesDoc";
import { db } from "@/lib/firebase";
import { avatarXpBarState } from "@/lib/avatar/avatarLevelUi";
import { AVATAR_BADGE_CATALOG } from "@/lib/badgeCatalog";
import { buildFriendProfileInviteAbsoluteUrl } from "@/lib/social/friendInviteUrl";
import { normalizeAvatarJerseyNumber } from "@/services/avatarService";
import { toast } from "sonner";

/**
 * PR-11A.1 + PR-10A.6 — 허브 플레이어 카드: 좌측 아바타 앵커 + 우측 정체성/진행/인라인 CTA.
 * 모바일: 세로 스택, sm+: 2열 히어로.
 */
export function HubAvatarIdentityCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const uid = user?.uid;
  const isAnon = user?.isAnonymous;
  const { avatar, loading } = useAvatarDoc(uid, isAnon);
  const { badgesDoc, loading: badgesLoading } = useUserBadgesDoc(uid, isAnon);
  const [statsOpen, setStatsOpen] = useState(false);
  const [jerseyEditing, setJerseyEditing] = useState(false);
  const [jerseyDraft, setJerseyDraft] = useState("");
  const [jerseyBusy, setJerseyBusy] = useState(false);

  useEffect(() => {
    if (jerseyEditing) return;
    if (!avatar) {
      setJerseyDraft("");
      return;
    }
    const r = normalizeAvatarJerseyNumber(avatar.jerseyNumber);
    setJerseyDraft(r != null ? String(r) : "");
  }, [avatar, jerseyEditing]);

  const topBadges = (() => {
    if (!badgesDoc?.unlocked) return [];
    const rows = Object.entries(badgesDoc.unlocked).map(([badgeId, entry]) => ({
      badgeId,
      entry,
    }));
    rows.sort((a, b) => {
      const as = a.entry.unlockedAt?.seconds ?? 0;
      const bs = b.entry.unlockedAt?.seconds ?? 0;
      if (bs !== as) return bs - as;
      return (b.entry.unlockedAt?.nanoseconds ?? 0) - (a.entry.unlockedAt?.nanoseconds ?? 0);
    });
    return rows.slice(0, 3);
  })();

  if (!user || isAnon) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full animate-pulse rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="h-3 w-36 rounded bg-slate-200" />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="mx-auto h-[6.75rem] w-[5.5rem] shrink-0 rounded-2xl bg-slate-100 sm:mx-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="mx-auto h-5 w-28 rounded bg-slate-200 sm:mx-0" />
            <div className="mx-auto h-3 w-16 rounded bg-slate-100 sm:mx-0" />
            <div className="h-2 w-full max-w-full rounded-full bg-slate-100" />
            <div className="mx-auto h-3 w-40 rounded bg-slate-100 sm:mx-0" />
            <div className="mt-2 flex gap-2">
              <div className="h-10 flex-1 rounded-xl bg-slate-100" />
              <div className="h-10 flex-1 rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div className="w-full rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-amber-950">플레이어 프로필이 없어요</p>
        <p className="mt-1 text-xs text-amber-900/80">
          팀 가입·일정 참여 전에 한 번만 설정하면 됩니다.
        </p>
        <Link
          to={`/onboarding/avatar?next=${encodeURIComponent("/hub")}`}
          className="mt-3 inline-flex rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
        >
          프로필 만들기
        </Link>
      </div>
    );
  }

  const level = avatar.progression?.level ?? 1;
  const xp = Math.max(0, Math.floor(Number(avatar.progression?.xp ?? 0) || 0));
  const name = avatar.displayName?.trim() || user.displayName || "플레이어";
  const st = avatar.stats ?? {};
  const statDefs: { label: string; key: keyof typeof st }[] = [
    { label: "슛", key: "shooting" },
    { label: "패스", key: "passing" },
    { label: "드리블", key: "dribbling" },
    { label: "수비", key: "defense" },
    { label: "스피드", key: "speed" },
  ];
  const statRows = statDefs.map(({ label, key }) => ({
    label,
    v: Math.max(0, Math.floor(Number(st[key] ?? 0) || 0)),
  }));
  const allStatsZero = statRows.every(({ v }) => v === 0);
  const visibleStats = statRows.filter(({ v }) => v > 0);
  const bar = avatarXpBarState(xp);
  const xpToNext =
    bar.nextThreshold != null ? Math.max(0, bar.nextThreshold - xp) : null;
  const xpLabel =
    xpToNext != null
      ? `다음 레벨까지 ${xpToNext} XP`
      : `${xp} XP · 최고 레벨`;

  const resolvedJersey = normalizeAvatarJerseyNumber(avatar.jerseyNumber);

  const onSaveJersey = async () => {
    if (!uid) return;
    const n = normalizeAvatarJerseyNumber(jerseyDraft);
    if (n === undefined) {
      toast.error("배번은 1~99 숫자로 입력해 주세요.");
      return;
    }
    setJerseyBusy(true);
    try {
      await updateDoc(doc(db, "avatars", uid), { jerseyNumber: n, updatedAt: serverTimestamp() });
      toast.success("배번을 저장했어요.");
      setJerseyEditing(false);
    } catch {
      toast.error("저장에 실패했어요.");
    } finally {
      setJerseyBusy(false);
    }
  };

  const shareProfile = async () => {
    const url = buildFriendProfileInviteAbsoluteUrl(user.uid);
    const text = `${name}님이 YAGO에서 함께해요`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "YAGO 친구 초대", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("초대 링크를 복사했어요.");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("링크를 복사했어요.");
      } catch {
        toast.error("공유에 실패했어요.");
      }
    }
  };

  return (
    <div className="w-full rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/50 p-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600/90">
        내 스포츠 아이덴티티
      </p>

      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex shrink-0 flex-col items-center overflow-visible pt-2 sm:items-start">
          <PlayerAvatar
            appearance={avatar.appearance ?? {}}
            variant="light"
            size="hub"
            jerseyNumber={resolvedJersey}
          />
          {resolvedJersey == null || jerseyEditing ? (
            <div className="mt-2 flex w-full max-w-[12rem] flex-col gap-1 sm:max-w-[9.5rem]">
              <span className="text-center text-[10px] font-medium text-slate-500 sm:text-left">저지 배번 (1~99)</span>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={99}
                  inputMode="numeric"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center text-xs tabular-nums shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={jerseyDraft}
                  onChange={(e) => setJerseyDraft(e.target.value)}
                  aria-label="저지 배번"
                />
                <button
                  type="button"
                  disabled={jerseyBusy}
                  className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm disabled:opacity-50"
                  onClick={() => void onSaveJersey()}
                >
                  저장
                </button>
              </div>
              {resolvedJersey != null && jerseyEditing ? (
                <button
                  type="button"
                  className="text-center text-[10px] text-slate-500 underline sm:text-left"
                  onClick={() => setJerseyEditing(false)}
                >
                  취소
                </button>
              ) : null}
            </div>
          ) : (
            <button
              type="button"
              className="mt-1.5 text-[10px] font-medium text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
              onClick={() => {
                setJerseyDraft(resolvedJersey != null ? String(resolvedJersey) : "");
                setJerseyEditing(true);
              }}
            >
              배번 변경
            </button>
          )}
        </div>

        <div className="w-full min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-lg font-bold leading-tight text-slate-900">{name}</h2>
          <p className="mt-0.5 text-xs font-semibold text-indigo-800">Lv {level}</p>

          <div className="mt-2 w-full max-w-full sm:max-w-[280px]">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-300"
                style={{ width: `${Math.round(Math.min(1, Math.max(0, bar.ratio)) * 100)}%` }}
              />
            </div>
            <p className="mt-1 font-mono text-[11px] font-medium text-slate-600">{xpLabel}</p>
          </div>

          {badgesLoading ? (
            <div className="mt-2 h-6 max-w-[12rem] animate-pulse rounded-full bg-indigo-100/60 sm:mx-0 mx-auto" aria-hidden />
          ) : topBadges.length > 0 ? (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {topBadges.map(({ badgeId }) => {
                const cat = AVATAR_BADGE_CATALOG[badgeId];
                const label = cat?.short ?? badgeId;
                const emoji = cat?.emoji ?? "🏅";
                return (
                  <span
                    key={badgeId}
                    title={cat?.title ?? badgeId}
                    className="inline-flex max-w-[7rem] items-center gap-0.5 truncate rounded-full border border-amber-200/90 bg-amber-50/90 px-2 py-0.5 text-[10px] font-semibold text-amber-950"
                  >
                    <span aria-hidden>{emoji}</span>
                    {label}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[11px] font-medium text-slate-500 sm:text-left">
              첫 배지를 획득해 보세요
            </p>
          )}

          <div className="mt-3 flex w-full flex-row gap-2 sm:max-w-[320px] sm:justify-start">
            <button
              type="button"
              onClick={() => navigate("/playground")}
              className="min-h-[44px] min-w-0 flex-1 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-900/15 transition hover:bg-indigo-500 active:scale-[0.99] sm:flex-initial sm:min-w-[9.5rem]"
            >
              운동장 입장
            </button>
            <button
              type="button"
              onClick={() => void shareProfile()}
              className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:flex-initial sm:min-w-[7.5rem]"
            >
              <Share2 className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              <span className="truncate">프로필 공유</span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setStatsOpen((o) => !o)}
        className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-700 sm:justify-end"
        aria-expanded={statsOpen}
      >
        내 플레이 스타일 보기
        <ChevronDown
          className={`h-4 w-4 transition-transform ${statsOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {statsOpen ? (
        <div className="mt-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 py-2.5">
          {allStatsZero ? (
            <p className="text-center text-xs leading-relaxed text-slate-500 sm:text-left">
              첫 활동 후 플레이 스타일이 표시됩니다
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleStats.map(({ label, v }) => (
                <div
                  key={label}
                  className="rounded-lg bg-white/90 px-2 py-1.5 text-center shadow-sm ring-1 ring-slate-100"
                >
                  <div className="text-[10px] font-medium text-slate-500">{label}</div>
                  <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
