import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type PublicTeamStaffRow = {
  uid: string;
  displayName: string;
  roleKey: string;
  roleLabel: string;
  photoUrl: string | null;
  /** 직책 한 줄(총무 등) — Callable `subtitle` */
  subtitle?: string | null;
};

export async function getPublicTeamStaffCallable(teamId: string): Promise<PublicTeamStaffRow[]> {
  const tid = teamId.trim();
  if (!tid) return [];
  const fn = httpsCallable<{ teamId: string }, { staff?: PublicTeamStaffRow[] }>(functions, "getPublicTeamStaff");
  const result = await fn({ teamId: tid });
  const staff = result.data?.staff;
  return Array.isArray(staff) ? staff : [];
}
