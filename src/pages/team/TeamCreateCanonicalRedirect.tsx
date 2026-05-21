import { Navigate, useSearchParams } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";

/**
 * `/team/create` → `/sports/:sport/team/create` (실제 생성 플로우)
 *
 * - `?sport=` 로 종목 지정 (기본 soccer)
 * - 그 외 쿼리(`mode`, 향후 `type=normal|academy` 등)는 그대로 전달
 * - 레거시: 종목만 적을 때는 `/sports/:sport/team/create` 를 직접 쓰는 것이 가장 명확함
 */
export default function TeamCreateCanonicalRedirect() {
  const [searchParams] = useSearchParams();
  const sportRaw = searchParams.get("sport");
  const normalized = normalizeSportId(sportRaw);
  const sport = normalized ?? "soccer";

  const next = new URLSearchParams(searchParams);
  next.delete("sport");

  const qs = next.toString();
  const to = `/sports/${encodeURIComponent(sport)}/team/create${qs ? `?${qs}` : ""}`;
  return <Navigate to={to} replace />;
}
