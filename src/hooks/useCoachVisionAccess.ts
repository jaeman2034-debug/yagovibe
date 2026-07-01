/**
 * Vision v6-4 — coach/admin visibility for Vision coach dashboard
 * Aligns with Firestore `isTeamVisionStaffReader` + owner/mirror axes.
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { canViewAIGrowthValidationConsole } from "@/lib/academy/aiGrowthValidationSelectors";
import { normalizeMemberRole, type AcademyMemberRole } from "@/lib/team/academyMemberRole";

const TEAM_OWNER_FIELDS = [
  "ownerUid",
  "ownerUserId",
  "ownerId",
  "leaderId",
  "createdBy",
  "captainId",
] as const;

function uidMatchesField(uid: string, value: unknown): boolean {
  if (typeof value === "string") return value.trim() === uid;
  if (value != null) return String(value).trim() === uid;
  return false;
}

function roleGrantsCoachVision(role: AcademyMemberRole | undefined): boolean {
  if (!role) return false;
  return role === "owner" || canViewAIGrowthValidationConsole(role);
}

type VisionAccessDebug = {
  uid: string;
  teamId: string;
  canViewCoachVision: boolean;
  reason: string;
  ownerUid?: unknown;
  memberRole?: string;
  fallbackMemberRole?: string;
  loading: boolean;
};

function logVisionAccessDebug(payload: VisionAccessDebug) {
  if (!import.meta.env.DEV) return;
  console.log("[useCoachVisionAccess]", payload);
}

async function resolveCoachVisionAccess(
  uid: string,
  teamId: string
): Promise<{ allowed: boolean; reason: string; ownerUid?: unknown; memberRole?: string }> {
  const teamSnap = await getDoc(doc(db, "teams", teamId));
  if (teamSnap.exists()) {
    const teamData = teamSnap.data() as Record<string, unknown>;
    const ownerUid = teamData.ownerUid ?? teamData.ownerUserId;
    for (const key of TEAM_OWNER_FIELDS) {
      if (uidMatchesField(uid, teamData[key])) {
        return { allowed: true, reason: `team.${key}`, ownerUid, memberRole: undefined };
      }
    }
    const owners = teamData.owners;
    if (Array.isArray(owners) && owners.some((v) => uidMatchesField(uid, v))) {
      return { allowed: true, reason: "team.owners[]", ownerUid, memberRole: undefined };
    }
  }

  const memberSnap = await getDoc(doc(db, "teams", teamId, "members", uid));
  if (memberSnap.exists()) {
    const rawRole = String(memberSnap.data()?.role ?? "");
    const role = normalizeMemberRole(rawRole);
    if (roleGrantsCoachVision(role)) {
      return { allowed: true, reason: "members/{uid}.role", ownerUid: undefined, memberRole: rawRole };
    }
    const accessLevel = String(memberSnap.data()?.accessLevel ?? "").toUpperCase();
    if (accessLevel === "OWNER" || accessLevel === "ADMIN") {
      return {
        allowed: true,
        reason: "members/{uid}.accessLevel",
        ownerUid: undefined,
        memberRole: rawRole,
      };
    }
    return {
      allowed: false,
      reason: `members/{uid}.role=${rawRole || "(empty)"}`,
      ownerUid: teamSnap.exists()
        ? (teamSnap.data() as Record<string, unknown>).ownerUid
        : undefined,
      memberRole: rawRole,
    };
  }

  for (const mirrorId of [`${uid}_${teamId}`, `${teamId}_${uid}`]) {
    const mirrorSnap = await getDoc(doc(db, "team_members", mirrorId));
    if (!mirrorSnap.exists()) continue;
    const md = mirrorSnap.data() as Record<string, unknown>;
    const mirrorUid = typeof md.uid === "string" ? md.uid.trim() : "";
    if (mirrorUid && mirrorUid !== uid) continue;
    const rawRole = String(md.role ?? "");
    const role = normalizeMemberRole(rawRole);
    if (roleGrantsCoachVision(role)) {
      return { allowed: true, reason: `team_members/${mirrorId}.role`, memberRole: rawRole };
    }
    const accessLevel = String(md.accessLevel ?? "").toUpperCase();
    if (accessLevel === "OWNER" || accessLevel === "ADMIN") {
      return {
        allowed: true,
        reason: `team_members/${mirrorId}.accessLevel`,
        memberRole: rawRole,
      };
    }
  }

  return {
    allowed: false,
    reason: "no owner/member/mirror match",
    ownerUid: teamSnap.exists()
      ? (teamSnap.data() as Record<string, unknown>).ownerUid
      : undefined,
    memberRole: undefined,
  };
}

export function useCoachVisionAccess(
  teamId: string | undefined,
  authUid: string | undefined | null,
  /** Legacy members/{docId} row — members/{uid} miss 보조 */
  fallbackMemberRole?: string | null
) {
  const [canView, setCanView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tid = teamId?.trim();
    const uid = typeof authUid === "string" ? authUid.trim() : "";
    if (!tid || !uid) {
      setCanView(false);
      setLoading(false);
      logVisionAccessDebug({
        uid,
        teamId: tid ?? "",
        canViewCoachVision: false,
        reason: "missing uid or teamId",
        loading: false,
      });
      return;
    }

    const fallbackRole = fallbackMemberRole
      ? normalizeMemberRole(fallbackMemberRole)
      : undefined;
    if (fallbackRole && roleGrantsCoachVision(fallbackRole)) {
      setCanView(true);
      setLoading(false);
      logVisionAccessDebug({
        uid,
        teamId: tid,
        canViewCoachVision: true,
        reason: "fallbackMemberRole",
        fallbackMemberRole: fallbackMemberRole ?? undefined,
        memberRole: fallbackMemberRole ?? undefined,
        loading: false,
      });
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const result = await resolveCoachVisionAccess(uid, tid);
        if (!cancelled) setCanView(result.allowed);
        if (!cancelled) {
          logVisionAccessDebug({
            uid,
            teamId: tid,
            canViewCoachVision: result.allowed,
            reason: result.reason,
            ownerUid: result.ownerUid,
            memberRole: result.memberRole,
            fallbackMemberRole: fallbackMemberRole ?? undefined,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) setCanView(false);
        if (!cancelled) {
          logVisionAccessDebug({
            uid,
            teamId: tid,
            canViewCoachVision: false,
            reason: "resolveCoachVisionAccess threw",
            fallbackMemberRole: fallbackMemberRole ?? undefined,
            loading: false,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, authUid, fallbackMemberRole]);

  return { canView, loading };
}
