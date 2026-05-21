import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useAvatarDoc } from "@/hooks/useAvatarDoc";
import { useUserBadgesDoc } from "@/hooks/useUserBadgesDoc";
import { useAcceptedFriendCount } from "@/hooks/useAcceptedFriendCount";
import { useAcceptedFriendPeerUids } from "@/hooks/useAcceptedFriendPeerUids";
import { usePkChallengeBestScores } from "@/hooks/usePkChallengeBestScores";
import { useChallengeBestScores } from "@/hooks/useChallengeBestScores";
import { AVATAR_BADGE_CATALOG } from "@/lib/badgeCatalog";
import { CHALLENGE_FRIEND_SCORE_QUERY_LIMIT, DRIBBLE_CHALLENGE_TEMPLATE_ID } from "@/lib/challenge/constants";
import { buildFriendProfileInviteAbsoluteUrl } from "@/lib/social/friendInviteUrl";
import { PlayerAvatar } from "@/components/avatar/PlayerAvatar";
import { toast } from "sonner";

const COMING_SOON_GAMES = [
  { id: "pk", title: "PK 챌린지", emoji: "🥅", blurb: "비동기 점수 · 친구와 나중에 비교", href: "/playground/pk" as const },
  { id: "dribble", title: "드리블 챌린지", emoji: "⚽", blurb: "비동기 코스 · 친구와 나중에 비교", href: "/playground/dribble" as const },
  { id: "5v5", title: "5v5 팀전", emoji: "🛡️", blurb: "친선 · 랭크" },
  { id: "8v8", title: "8v8 클럽전", emoji: "🏟️", blurb: "클럽 단위 매치" },
] as const;

/** 셸 UI: 동일 시각 해제 등에서 순서 흔들림 방지 (작은 인덱스 = 정렬 시 앞섬) */
const PLAYGROUND_BADGE_PRIORITY: Record<string, number> = {
  recruiter: 0,
  active_player: 1,
  content_creator: 2,
  first_rsvp: 3,
  first_join: 4,
};

const PLAYGROUND_BADGE_CHIP_MAX = 3;

function unlockedAtSortKey(ts: { seconds?: number; nanoseconds?: number } | undefined): number {
  const s = ts?.seconds ?? 0;
  const n = ts?.nanoseconds ?? 0;
  return s * 1e9 + n;
}

/**
 * 운동장 모드 허브 — PK·드리블·소셜 (본 필드: `/playground`)
 */
export default function PlaygroundHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid;
  const isAnon = user?.isAnonymous;
  const { avatar, loading: avatarLoading } = useAvatarDoc(uid, isAnon);
  const { badgesDoc, loading: badgesLoading } = useUserBadgesDoc(uid, isAnon);
  const { count: acceptedFriendCount, loading: friendsLoading } = useAcceptedFriendCount(uid, isAnon);
  const { peerUids, loading: peersLoading } = useAcceptedFriendPeerUids(uid, isAnon);
  const { myBest: pkMyBest, scoresLoading: pkScoresLoading, scoresError: pkScoresError } = usePkChallengeBestScores(
    uid,
    isAnon,
    peerUids,
    peersLoading,
  );
  const {
    myBest: dribbleMyBest,
    scoresLoading: dribbleScoresLoading,
    scoresError: dribbleScoresError,
  } = useChallengeBestScores(DRIBBLE_CHALLENGE_TEMPLATE_ID, uid, isAnon, peerUids, peersLoading);

  const displayName = avatar?.displayName?.trim() || user?.displayName || "플레이어";
  const level = avatar?.progression?.level ?? 1;
  const xp = avatar?.progression?.xp ?? 0;

  const badgeChips = (() => {
    if (!badgesDoc?.unlocked) return [];
    return Object.entries(badgesDoc.unlocked)
      .map(([badgeId, entry]) => ({ badgeId, unlockedAt: entry.unlockedAt }))
      .sort((a, b) => {
        const tb = unlockedAtSortKey(b.unlockedAt);
        const ta = unlockedAtSortKey(a.unlockedAt);
        if (tb !== ta) return tb - ta;
        const pa = PLAYGROUND_BADGE_PRIORITY[a.badgeId] ?? 99;
        const pb = PLAYGROUND_BADGE_PRIORITY[b.badgeId] ?? 99;
        if (pa !== pb) return pa - pb;
        return a.badgeId.localeCompare(b.badgeId);
      })
      .slice(0, PLAYGROUND_BADGE_CHIP_MAX);
  })();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-slate-50">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            ← 뒤로
          </button>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200/90">YAGO</span>
          <span className="w-[72px]" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-4 pb-16 pt-6">
        {/* 1. Hero */}
        <section className="text-center">
          <p className="text-sm font-semibold text-indigo-300">스포츠 소셜의 한가운데</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">야고 운동장</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
            2D 필드에서 움직이고 슛해 보세요. PK·드리블 챌린지는 아래에서 이어집니다.
          </p>
          <Link
            to="/playground"
            className="mt-5 inline-flex min-h-[48px] w-full max-w-xs items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/40"
          >
            필드 입장 · 플레이
          </Link>
        </section>

        {/* 2b. PR-9A — PK 비동기 요약 (라이브 리더보드 아님) */}
        {uid && !isAnon ? (
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-200/90">PK 챌린지</h2>
            {pkScoresError ? (
              <p className="mt-3 text-xs text-rose-300/90">점수를 불러오지 못했어요.</p>
            ) : pkScoresLoading ? (
              <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/5" aria-hidden />
            ) : (
              <p className="mt-3 text-sm text-slate-200">
                내 최고 점수:{" "}
                <span className="font-mono font-bold text-white">{pkMyBest != null ? `${pkMyBest}점` : "아직 없음"}</span>
              </p>
            )}
            <Link
              to="/playground/pk"
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-emerald-500/90 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-400"
            >
              PK 열기 · 기록 남기기
            </Link>
            <p className="mt-2 text-center text-[10px] text-slate-500">
              실시간 대전 없음 · XP 미연동 · 친구 비교는 각 챌린지 화면에서 최대 {CHALLENGE_FRIEND_SCORE_QUERY_LIMIT}명
            </p>
          </section>
        ) : null}

        {/* 2c. PR-10B — 드리블 비동기 요약 */}
        {uid && !isAnon ? (
          <section className="rounded-2xl border border-violet-500/25 bg-violet-950/25 p-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-violet-200/90">드리블 챌린지</h2>
            {dribbleScoresError ? (
              <p className="mt-3 text-xs text-rose-300/90">점수를 불러오지 못했어요.</p>
            ) : dribbleScoresLoading ? (
              <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/5" aria-hidden />
            ) : (
              <p className="mt-3 text-sm text-slate-200">
                내 최고 점수:{" "}
                <span className="font-mono font-bold text-white">
                  {dribbleMyBest != null ? `${dribbleMyBest}점` : "아직 없음"}
                </span>
              </p>
            )}
            <Link
              to="/playground/dribble"
              className="mt-4 flex w-full items-center justify-center rounded-xl bg-violet-500/90 py-2.5 text-sm font-bold text-violet-50 hover:bg-violet-400"
            >
              드리블 열기 · 기록 남기기
            </Link>
            <p className="mt-2 text-center text-[10px] text-slate-500">
              비보상 · 친구 최대 {CHALLENGE_FRIEND_SCORE_QUERY_LIMIT}명 비교
            </p>
          </section>
        ) : null}

        {/* 2. My Avatar Summary */}
        <section className="rounded-2xl border border-indigo-400/25 bg-indigo-950/40 p-5 shadow-lg ring-1 ring-white/5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-200">내 아바타</h2>
          {avatarLoading ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-white/5" />
          ) : !avatar ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-left">
              <p className="text-sm font-medium text-amber-100">플레이어 프로필을 먼저 만들면 운동장 기록이 쌓여요.</p>
              <Link
                to={`/onboarding/avatar?next=${encodeURIComponent("/playground")}`}
                className="mt-3 inline-flex rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-400"
              >
                프로필 만들기
              </Link>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0">
                <PlayerAvatar
                  appearance={avatar.appearance ?? {}}
                  variant="dark"
                  size="md"
                  jerseyNumber={avatar.jerseyNumber ?? undefined}
                  aria-label={`${displayName} 아바타`}
                />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-xl font-bold text-white">{displayName}</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-200 sm:justify-start">
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-indigo-100">
                    Lv {level}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>
                    XP <span className="font-mono font-semibold text-white">{xp}</span>
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">배지</p>
                  {badgesLoading ? (
                    <div className="mt-2 h-8 w-40 animate-pulse rounded-lg bg-white/5" />
                  ) : badgeChips.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">아직 해제된 배지가 없어요. 팀에 참여해 보세요.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                      {badgeChips.map(({ badgeId }) => {
                        const cat = AVATAR_BADGE_CATALOG[badgeId];
                        return (
                          <span
                            key={badgeId}
                            title={cat?.title ?? badgeId}
                            className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-50"
                          >
                            <span aria-hidden>{cat?.emoji ?? "🏅"}</span>
                            {cat?.short ?? badgeId}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 3. Coming soon game cards */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wide text-indigo-200">모드</h2>
          <p className="mt-1 text-sm text-slate-400">곧 순서대로 연결됩니다.</p>
          <ul className="mt-4 grid gap-3">
            {COMING_SOON_GAMES.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <span className="text-3xl" aria-hidden>
                  {g.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white">{g.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{g.blurb}</p>
                </div>
                <div className="shrink-0">
                  {"href" in g && g.href ? (
                    <Link
                      to={g.href}
                      className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/30"
                    >
                      열기
                    </Link>
                  ) : (
                    <span className="rounded-full border border-slate-500/50 bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      준비 중
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Social — 수락 친구 수 + 초대 CTA */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">소셜</h2>
          {friendsLoading ? (
            <div className="mt-3 h-10 animate-pulse rounded-lg bg-white/5" aria-hidden />
          ) : acceptedFriendCount > 0 ? (
            <p className="mt-3 text-center text-sm text-slate-200">
              친구 <span className="font-bold text-white">{acceptedFriendCount}</span>명과 연결되어 있어요.
            </p>
          ) : (
            <p className="mt-3 text-center text-sm text-slate-300">
              아직 친구가 없어요. 링크를 보내 첫 친구를 초대해 보세요.
            </p>
          )}
          {uid && !isAnon ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(buildFriendProfileInviteAbsoluteUrl(uid));
                  toast.success("초대 링크를 복사했어요.");
                } catch {
                  toast.error("복사에 실패했어요.");
                }
              }}
              className="mt-4 w-full rounded-xl border border-indigo-400/40 bg-indigo-500/20 py-2.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/30"
            >
              내 친구 초대 링크 복사
            </button>
          ) : null}
        </section>

        {/* 5. CTA */}
        <section className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/hub")}
            className="w-full rounded-2xl bg-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-400"
          >
            친구 초대
          </button>
          <button
            type="button"
            onClick={() => navigate("/teams")}
            className="w-full rounded-2xl border border-white/20 bg-white/5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            팀원 초대
          </button>
          <p className="text-center text-[11px] text-slate-500">
            실시간 로비·매치메이킹은 포함되지 않습니다.
          </p>
        </section>

        <p className="text-center text-[11px] text-slate-600">
          베타 연습장(미니슛 필드)은{" "}
          <Link to="/playground/mini-shot" className="text-indigo-400 underline-offset-2 hover:underline">
            여기
          </Link>
          에서만 열립니다.
        </p>
      </main>
    </div>
  );
}
