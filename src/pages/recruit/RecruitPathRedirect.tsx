import { useEffect, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSportId } from "@/constants/sports";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

function buildMarketTarget(
  sportSlug: string,
  postId: string,
  searchParams: URLSearchParams
): string {
  const base = sportMarketDetailUrl(sportSlug, postId);
  const rest = new URLSearchParams(searchParams);
  rest.delete("sport");
  const qs = rest.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * 레거시 `/recruit/:id` — 마켓 모집(`marketProducts`/`market`) 또는 레거시 `recruits` 문서로 해석
 *
 * - 마켓 글이면 canonical `/sports/:sport/market/:id`
 * - `recruits` 전용이면 팀 공개 프로필 `/teams/:teamId`
 * - 없으면 `AppMarketPostCanonicalRedirect`와 동일하게 마켓 상세 URL로 시도(상세에서 미존재 처리)
 */
export default function RecruitPathRedirect() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!id) {
        setTarget("/hub");
        return;
      }

      let sportSlug: string | null = null;
      const qSport = searchParams.get("sport");
      if (qSport) {
        const n = normalizeSportId(qSport);
        if (n) sportSlug = n;
      }

      try {
        let snap = await getDoc(doc(db, "marketProducts", id));
        if (!snap.exists()) {
          snap = await getDoc(doc(db, "market", id));
        }
        if (snap.exists() && !cancelled) {
          const raw = snap.data()?.sport;
          if (typeof raw === "string" && raw) {
            const n = normalizeSportId(raw);
            if (n) sportSlug = n;
          }
          if (!sportSlug) sportSlug = resolveLastSportId();
          setTarget(buildMarketTarget(sportSlug, id, searchParams));
          return;
        }
      } catch {
        /* ignore */
      }

      try {
        const rSnap = await getDoc(doc(db, "recruits", id));
        if (rSnap.exists() && !cancelled) {
          const teamIdRaw = rSnap.data()?.teamId;
          if (typeof teamIdRaw === "string" && teamIdRaw.trim()) {
            setTarget(`/teams/${encodeURIComponent(teamIdRaw.trim())}/play`);
            return;
          }
        }
      } catch {
        /* ignore */
      }

      if (!sportSlug) sportSlug = resolveLastSportId();
      if (cancelled) return;
      setTarget(buildMarketTarget(sportSlug, id, searchParams));
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id, searchParams]);

  if (!id) {
    return <Navigate to="/hub" replace />;
  }

  if (!target) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        이동 중…
      </div>
    );
  }

  return <Navigate to={target} replace />;
}
