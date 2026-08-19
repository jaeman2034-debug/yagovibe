/**
 * LEGACY_ROUTE — `/sports-hub` → `/hub` (or `/sports/:sport` when ?category=).
 * Do not build new features on SportsHubPage.
 */

import { Navigate, useLocation } from "react-router-dom";
import { resolveLegacySportsHubRedirect } from "@/lib/routes/legacySportsHub";

export default function LegacySportsHubRedirect() {
  const { search } = useLocation();
  const to = resolveLegacySportsHubRedirect(search);
  return <Navigate to={to} replace />;
}
