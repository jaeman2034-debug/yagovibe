import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlayMainPosition, PlayPlayerStatsDoc } from "@/utils/playerStats";
import SuperStrikerBadge from "./SuperStrikerBadge";

type Props = {
  title?: string;
  players: readonly PlayPlayerStatsDoc[];
  limit?: number;
  highlightMemberId?: string;
  /** 같은 포지션만 (포지션 랭킹용) */
  position?: PlayMainPosition;
};

export default function RankingList({
  title = "팀 랭킹",
  players,
  limit = 5,
  highlightMemberId,
  position,
}: Props) {
  const list = useMemo(
    () =>
      [...players]
        .filter((p) => (position ? p.mainPosition === position : true))
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, limit),
    [players, position, limit]
  );
  const [superBadgeCountByUid, setSuperBadgeCountByUid] = useState<Record<string, number>>({});

  const userIds = useMemo(
    () =>
      [...new Set(list.map((p) => (typeof p.userId === "string" ? p.userId.trim() : "")).filter(Boolean))] as string[],
    [list]
  );
  const userIdsKey = useMemo(() => userIds.join("|"), [userIds]);

  useEffect(() => {
    const ids = userIdsKey ? userIdsKey.split("|").filter(Boolean) : [];
    if (ids.length === 0) {
      setSuperBadgeCountByUid((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (uid) => {
          const ref = doc(db, "users", uid, "badges", "super7");
          const snap = await getDoc(ref);
          const count = snap.exists() ? Math.max(1, Math.floor(Number(snap.data().count ?? 1))) : 0;
          return [uid, count] as const;
        })
      );
      if (cancelled) return;
      setSuperBadgeCountByUid((prev) => {
        const next = Object.fromEntries(entries);
        const same =
          Object.keys(prev).length === Object.keys(next).length &&
          Object.entries(next).every(([k, v]) => prev[k] === v);
        return same ? prev : next;
      });
    })().catch(() => {
      if (!cancelled) {
        setSuperBadgeCountByUid((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userIdsKey]);

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center text-sm text-gray-500">
        표시할 선수가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-bold text-gray-900">{title}</h4>}
      <ul className="space-y-2">
        {list.map((p, idx) => {
          const rank = idx + 1;
          const isMe = highlightMemberId && p.memberId === highlightMemberId;
          return (
            <li
              key={p.memberId}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm transition-colors ${
                isMe
                  ? "border-indigo-300 bg-gradient-to-r from-indigo-50/90 to-violet-50/50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums ${
                  rank === 1
                    ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow"
                    : rank === 2
                      ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                      : rank === 3
                        ? "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {rank}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{p.displayName}</p>
                <div className="mt-1">
                  <SuperStrikerBadge
                    compact
                    count={superBadgeCountByUid[p.userId ?? ""] ?? (p.badges.includes("super7") ? 1 : 0)}
                  />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700">
                    {p.mainPosition ?? "—"}
                  </span>
                  <span>No. {p.number ?? "—"}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">OVR</p>
                <p className="text-xl font-black tabular-nums text-indigo-900">{p.ovr}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
