import { useSearchParams } from "react-router-dom";
import AcademyCreateFlow from "./AcademyCreateFlow";
import NormalTeamCreateFlow from "./NormalTeamCreateFlow";

type TeamCreateShellProps = {
  mode: "non-member" | "member-request";
};

/**
 * Phase A A1 — split create UX by teams.type (query teamKind=academy).
 * createTeam callable remains single SoT; no new routes/collections.
 */
export default function TeamCreateShell({ mode }: TeamCreateShellProps) {
  const [searchParams] = useSearchParams();
  const teamKind = searchParams.get("teamKind");

  if (teamKind === "academy") {
    return <AcademyCreateFlow />;
  }

  return <NormalTeamCreateFlow mode={mode} />;
}
