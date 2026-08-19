/**
 * AI Growth Validation Console — visibility (validation-only UI, no CF).
 */
import { isTeamAdminBundle, type AcademyMemberRole } from "@/lib/team/academyMemberRole";

/** Coach + admin bundle only; guardian/player hidden. */
export function canViewAIGrowthValidationConsole(role: AcademyMemberRole | undefined): boolean {
  if (!role) return false;
  return isTeamAdminBundle(role) || role === "coach";
}
