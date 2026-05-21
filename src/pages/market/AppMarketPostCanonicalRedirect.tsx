import { useEffect, useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeSportId } from "@/constants/sports";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

/**
 * 레거시 `/app/market/:id` → `/sports/:sport/market/:id` 무중단 이전
 *
 * sport 결정 순서: ① 쿼리 ?sport ② marketProducts.sport ③ resolveLastSportId
 */
export default function AppMarketPostCanonicalRedirect() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!id) {
        setTarget("/app/market");
        return;
      }

      let sportSlug: string | null = null;
      const qSport = searchParams.get("sport");
      if (qSport) {
        const n = normalizeSportId(qSport);
        if (n) sportSlug = n;
      }

      if (!sportSlug) {
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
          }
        } catch {
          /* ignore */
        }
      }

      if (!sportSlug) sportSlug = resolveLastSportId();

      if (cancelled) return;

      const base = sportMarketDetailUrl(sportSlug, id);
      const rest = new URLSearchParams(searchParams);
      rest.delete("sport");
      const qs = rest.toString();
      setTarget(qs ? `${base}?${qs}` : base);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [id, searchParams]);

  if (!id) {
    return <Navigate to="/app/market" replace />;
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
