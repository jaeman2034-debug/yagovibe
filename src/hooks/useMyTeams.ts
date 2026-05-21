/**
 * 🔥 useMyTeams - 내가 속한 팀 조회 훅 (안정화 완료 버전)
 *
 * Canonical authority source: teams/{teamId}/members/{uid}.role
 * 조회 소스 (앞이 우선, 같은 teamId는 먼저 온 항목 유지):
 * 1. collectionGroup("members") + where("userId", "==", uid) — SoT
 * 2. collectionGroup("members") + where("uid", "==", uid) — 레거시 SoT
 * 3. teams/{teamId}/members/{uid} direct check fallback
 * 4. teams where ownerUid == uid
 * 5. teams where ownerUserId == uid (신규 스키마 fallback)
 * 6. teams where ownerId == uid (레거시·시드 팀 문서)
 */

import { useEffect, useState, useMemo, useRef } from "react";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { backfillMyTeamMemberships } from "@/lib/team/backfillMyTeamMemberships";

export interface TeamMember {
  id: string;
  teamId: string;
  uid: string;
  role?: string;
  accessLevel?: string;
  status: string;
  createdAt?: any;
}

function memberStatusActive(raw: unknown): boolean {
  if (raw === undefined || raw === null || raw === "") return true;
  return String(raw).trim().toLowerCase() === "active";
}

const isDev = import.meta.env.DEV;

function firestoreErrCode(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code?: unknown }).code ?? "");
  }
  return "";
}

function normalizeTeamId(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim();
}

/** Firestore가 동일 페이로드로 onSnapshot을 여러 번 줄 때 불필요한 setState·리렌더 방지 */
function signatureForTeamMembers(teams: TeamMember[]): string {
  return JSON.stringify(
    [...teams]
      .map((t) => ({
        teamId: normalizeTeamId(t.teamId),
        role: t.role ?? "",
        uid: t.uid,
        status: t.status,
      }))
      .sort((a, b) => a.teamId.localeCompare(b.teamId))
  );
}

function mergeTeamMembersByTeamId(
  a: TeamMember[],
  b: TeamMember[]
): TeamMember[] {
  const map = new Map<string, TeamMember>();
  for (const t of a) {
    const tid = normalizeTeamId(t.teamId);
    if (!tid) continue;
    map.set(tid, { ...t, teamId: tid });
  }
  for (const t of b) {
    const tid = normalizeTeamId(t.teamId);
    if (!tid || map.has(tid)) continue;
    map.set(tid, { ...t, teamId: tid });
  }
  return Array.from(map.values());
}

function parseTeamsPathMemberDocs(
  snapshot: {
    docs: Array<{
      ref: { path: string; parent?: { parent?: { id?: string } } };
      data: () => Record<string, unknown>;
    }>;
  },
  uid: string
): { teams: TeamMember[]; skippedWrongPath: number; skippedInactive: number } {
  const teams: TeamMember[] = [];
  let skippedWrongPath = 0;
  let skippedInactive = 0;
  for (const docSnap of snapshot.docs) {
    const directTeamId =
      typeof docSnap.ref.parent?.parent?.id === "string"
        ? docSnap.ref.parent?.parent?.id
        : "";
    let teamId = directTeamId.trim();
    if (!teamId) {
      // 안전망: parent.parent 접근이 어려운 환경에서는 path 파싱으로 복구
      const segs = docSnap.ref.path.split("/");
      const teamsIdx = segs.lastIndexOf("teams");
      const membersIdx = segs.lastIndexOf("members");
      if (
        teamsIdx < 0 ||
        membersIdx < 0 ||
        membersIdx !== teamsIdx + 2 ||
        membersIdx + 1 >= segs.length
      ) {
        skippedWrongPath += 1;
        continue;
      }
      teamId = segs[teamsIdx + 1]?.trim() ?? "";
    }
    if (!teamId) continue;
    const data = docSnap.data();
    if (!memberStatusActive(data.status)) {
      skippedInactive += 1;
      continue;
    }

    teams.push({
      id: `${uid}_${teamId}`,
      teamId,
      uid:
        typeof data.userId === "string" && data.userId
          ? data.userId
          : typeof data.uid === "string" && data.uid
            ? data.uid
            : uid,
      role: typeof data.role === "string" ? data.role : "",
      accessLevel:
        typeof data.accessLevel === "string" ? data.accessLevel : "",
      status: typeof data.status === "string" ? data.status : "active",
      createdAt: data.createdAt,
    });
  }
  return { teams, skippedWrongPath, skippedInactive };
}

export function useMyTeams() {
  const { user } = useAuth();
  const [fromSot, setFromSot] = useState<TeamMember[]>([]);
  const [fromSotUid, setFromSotUid] = useState<TeamMember[]>([]);
  const [fromTeamMemberDoc, setFromTeamMemberDoc] = useState<TeamMember[]>([]);
  const [fromOwner, setFromOwner] = useState<TeamMember[]>([]);
  const [fromOwnerUserId, setFromOwnerUserId] = useState<TeamMember[]>([]);
  const [fromOwnerId, setFromOwnerId] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [backfillRequested, setBackfillRequested] = useState(false);

  const fromSotSigRef = useRef("");
  const fromSotUidSigRef = useRef("");
  const fromTeamMemberDocSigRef = useRef("");
  const fromOwnerSigRef = useRef("");
  const fromOwnerUserIdSigRef = useRef("");
  const fromOwnerIdSigRef = useRef("");

  const teamMembers = useMemo(() => {
    const merged = mergeTeamMembersByTeamId(fromSot, fromSotUid);
    const mergedUid = mergeTeamMembersByTeamId(merged, fromTeamMemberDoc);
    const mergedOwnerUid = mergeTeamMembersByTeamId(mergedUid, fromOwner);
    const mergedOwnerUserId = mergeTeamMembersByTeamId(mergedOwnerUid, fromOwnerUserId);
    return mergeTeamMembersByTeamId(mergedOwnerUserId, fromOwnerId);
  }, [fromSot, fromSotUid, fromTeamMemberDoc, fromOwner, fromOwnerUserId, fromOwnerId]);

  const mergeDebugKey = useMemo(() => {
    if (!user?.uid) return "";
    return JSON.stringify({
      uid: user.uid,
      sot: signatureForTeamMembers(fromSot),
      sotUid: signatureForTeamMembers(fromSotUid),
      memberDoc: signatureForTeamMembers(fromTeamMemberDoc),
      owner: signatureForTeamMembers(fromOwner),
      ownerUserId: signatureForTeamMembers(fromOwnerUserId),
      ownerId: signatureForTeamMembers(fromOwnerId),
      merged: signatureForTeamMembers(teamMembers),
    });
  }, [
    user?.uid,
    fromSot,
    fromSotUid,
    fromTeamMemberDoc,
    fromOwner,
    fromOwnerUserId,
    fromOwnerId,
    teamMembers,
  ]);

  useEffect(() => {
    if (!isDev || !user?.uid || !mergeDebugKey) return;
    console.log("[useMyTeams] 병합 요약", {
      uid: user.uid,
      sot_userId: fromSot.length,
      sot_uid: fromSotUid.length,
      sot_memberDoc: fromTeamMemberDoc.length,
      ownerUid: fromOwner.length,
      ownerUserId: fromOwnerUserId.length,
      ownerId: fromOwnerId.length,
      merged: teamMembers.length,
      mergedTeamIds: teamMembers.map((t) => t.teamId),
      sourceTeamIds: {
        fromSot: fromSot.map((t) => normalizeTeamId(t.teamId)).filter(Boolean),
        fromSotUid: fromSotUid.map((t) => normalizeTeamId(t.teamId)).filter(Boolean),
        fromTeamMemberDoc: fromTeamMemberDoc
          .map((t) => normalizeTeamId(t.teamId))
          .filter(Boolean),
        fromOwner: fromOwner.map((t) => normalizeTeamId(t.teamId)).filter(Boolean),
        fromOwnerUserId: fromOwnerUserId
          .map((t) => normalizeTeamId(t.teamId))
          .filter(Boolean),
        fromOwnerId: fromOwnerId.map((t) => normalizeTeamId(t.teamId)).filter(Boolean),
      },
    });
    // mergeDebugKey에 소스·병합 시그니처가 모두 포함됨 → 실제 데이터 변경 시에만 로그
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeDebugKey]);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      setFromSot([]);
      setFromSotUid([]);
      setFromTeamMemberDoc([]);
      setFromOwner([]);
      setFromOwnerUserId([]);
      setFromOwnerId([]);
      fromSotSigRef.current = "";
      fromSotUidSigRef.current = "";
      fromTeamMemberDocSigRef.current = "";
      fromOwnerSigRef.current = "";
      fromOwnerUserIdSigRef.current = "";
      fromOwnerIdSigRef.current = "";
      return;
    }

    const uid = user.uid;
    fromSotSigRef.current = "";
    fromSotUidSigRef.current = "";
    fromTeamMemberDocSigRef.current = "";
    fromOwnerSigRef.current = "";
    fromOwnerUserIdSigRef.current = "";
    fromOwnerIdSigRef.current = "";
    let disposed = false;
    let sotSeen = false;
    let sotUidSeen = false;
    let memberDocSeen = false;
    let ownerSeen = false;
    let ownerUserIdSeen = false;
    let ownerIdSeen = false;

    const tryFinishLoading = () => {
      if (
        disposed ||
        !sotSeen ||
        !sotUidSeen ||
        !memberDocSeen ||
        !ownerSeen ||
        !ownerUserIdSeen ||
        !ownerIdSeen
      )
        return;
      window.clearTimeout(bootWatch);
      setLoading(false);
    };

    const bootWatch = window.setTimeout(() => {
      if (!disposed) {
        console.warn(
          "[useMyTeams] 스냅샷 지연 — 로딩 강제 해제 (네트워크·규칙·인덱스 확인)"
        );
        setLoading(false);
      }
    }, 12000);

    console.log("🔍 [useMyTeams] 쿼리 실행:", {
      uid,
      sources: [
        'collectionGroup("members") userId',
        'collectionGroup("members") uid(레거시)',
        "teams/*/members/{uid} 직접 조회",
        "teams ownerUid",
        "teams ownerUserId",
        "teams ownerId",
      ],
    });

    const qSot = query(
      collectionGroup(db, "members"),
      where("userId", "==", uid)
    );
    const qSotUid = query(collectionGroup(db, "members"), where("uid", "==", uid));

    const unsubscribeSot = onSnapshot(
      qSot,
      (snapshot) => {
        if (disposed) return;
        sotSeen = true;
        try {
          const { teams, skippedWrongPath, skippedInactive } =
            parseTeamsPathMemberDocs(snapshot, uid);

          const sig = signatureForTeamMembers(teams);
          if (fromSotSigRef.current === sig) {
            tryFinishLoading();
            return;
          }
          if (isDev) {
            console.log("📋 [useMyTeams] SoT members (userId):", {
              rawDocs: snapshot.docs.length,
              activeParsed: teams.length,
              skippedWrongPath,
              skippedInactive,
              teamIds: teams.map((t) => t.teamId),
              rawStatuses: snapshot.docs.map((d) => d.data().status),
              memberTeamIds: snapshot.docs
                .map((d) =>
                  typeof d.ref.parent?.parent?.id === "string"
                    ? d.ref.parent?.parent?.id
                    : ""
                )
                .filter((id) => Boolean(id)),
            });
          }
          fromSotSigRef.current = sig;

          if (!disposed) {
            setFromSot(teams);
            setError(null);
          }
        } catch (err) {
          console.warn("[useMyTeams] SoT 파싱 실패:", err);
          if (!disposed) {
            fromSotSigRef.current = signatureForTeamMembers([]);
            setFromSot([]);
          }
        }
        tryFinishLoading();
      },
      (err) => {
        if (disposed) return;
        sotSeen = true;
        const code = firestoreErrCode(err);
        if (code !== "permission-denied" && code !== "missing-or-insufficient-permissions") {
          console.warn(
            "[useMyTeams] collectionGroup(members)+userId 구독 실패:",
            code || "(no code)",
            err
          );
        }
        if (isDev && code === "failed-precondition") {
          console.info(
            "[useMyTeams] 인덱스 필요 가능성 — 오류 메시지의 URL로 인덱스 생성 또는 firebase deploy --only firestore:indexes"
          );
        }
        if (!disposed) {
          fromSotSigRef.current = signatureForTeamMembers([]);
          setFromSot([]);
        }
        tryFinishLoading();
      }
    );

    const unsubscribeSotUid = onSnapshot(
      qSotUid,
      (snapshot) => {
        if (disposed) return;
        sotUidSeen = true;
        try {
          const { teams } = parseTeamsPathMemberDocs(snapshot, uid);
          const sig = signatureForTeamMembers(teams);
          if (fromSotUidSigRef.current === sig) {
            tryFinishLoading();
            return;
          }
          fromSotUidSigRef.current = sig;
          if (!disposed) setFromSotUid(teams);
        } catch {
          if (!disposed) {
            fromSotUidSigRef.current = signatureForTeamMembers([]);
            setFromSotUid([]);
          }
        }
        tryFinishLoading();
      },
      () => {
        if (disposed) return;
        sotUidSeen = true;
        if (!disposed) {
          fromSotUidSigRef.current = signatureForTeamMembers([]);
          setFromSotUid([]);
        }
        tryFinishLoading();
      }
    );

    const qOwner = query(collection(db, "teams"), where("ownerUid", "==", uid));
    const qOwnerUserId = query(collection(db, "teams"), where("ownerUserId", "==", uid));
    const qOwnerId = query(collection(db, "teams"), where("ownerId", "==", uid));

    /** 마지막 안전망: collectionGroup 실패/누락 시에도 teams/{teamId}/members/{uid} 직접 확인 */
    void (async () => {
      try {
        const allTeamsSnap = await getDocs(collection(db, "teams"));
        if (disposed) return;
        const rows: TeamMember[] = [];
        for (const teamDoc of allTeamsSnap.docs) {
          const teamId = teamDoc.id;
          const memberSnap = await getDoc(doc(db, "teams", teamId, "members", uid));
          if (!memberSnap.exists()) continue;
          const data = memberSnap.data() as Record<string, unknown>;
          if (!memberStatusActive(data.status)) continue;
          rows.push({
            id: `${uid}_${teamId}_memberDoc`,
            teamId,
            uid:
              (typeof data.userId === "string" && data.userId) ||
              (typeof data.uid === "string" && data.uid) ||
              uid,
            role: typeof data.role === "string" ? data.role : "",
            accessLevel: typeof data.accessLevel === "string" ? data.accessLevel : "",
            status: typeof data.status === "string" ? data.status : "active",
            createdAt: data.createdAt,
          });
        }
        if (!disposed) {
          const sig = signatureForTeamMembers(rows);
          if (fromTeamMemberDocSigRef.current !== sig) {
            fromTeamMemberDocSigRef.current = sig;
            setFromTeamMemberDoc(rows);
            if (isDev) {
              console.log("📋 [useMyTeams] teams/*/members/{uid}:", {
                count: rows.length,
                teamIds: rows.map((t) => t.teamId),
              });
            }
          }
          memberDocSeen = true;
          tryFinishLoading();
        }
      } catch (e) {
        if (!disposed) {
          fromTeamMemberDocSigRef.current = signatureForTeamMembers([]);
          setFromTeamMemberDoc([]);
          memberDocSeen = true;
          tryFinishLoading();
        }
        if (isDev) console.warn("[useMyTeams] teams/*/members/{uid} 조회 실패:", e);
      }
    })();

    const unsubscribeOwner = onSnapshot(
      qOwner,
      (snapshot) => {
        if (disposed) return;
        ownerSeen = true;
        try {
          const teams: TeamMember[] = snapshot.docs.map((d) => ({
            id: `${uid}_${d.id}_owner`,
            teamId: d.id,
            uid,
            role: "owner",
            status: "active",
          }));
          const sig = signatureForTeamMembers(teams);
          if (fromOwnerSigRef.current === sig) {
            tryFinishLoading();
            return;
          }
          if (isDev) {
            console.log("📋 [useMyTeams] teams(ownerUid):", {
              count: teams.length,
              teamIds: teams.map((t) => t.teamId),
            });
          }
          fromOwnerSigRef.current = sig;
          if (!disposed) {
            setFromOwner(teams);
            setError(null);
          }
        } catch (err) {
          console.warn("[useMyTeams] ownerUid 파싱 실패:", err);
          if (!disposed) {
            fromOwnerSigRef.current = signatureForTeamMembers([]);
            setFromOwner([]);
          }
        }
        tryFinishLoading();
      },
      (err) => {
        if (disposed) return;
        ownerSeen = true;
        console.warn("[useMyTeams] teams ownerUid 구독 실패:", err);
        if (!disposed) {
          fromOwnerSigRef.current = signatureForTeamMembers([]);
          setFromOwner([]);
        }
        tryFinishLoading();
      }
    );

    const unsubscribeOwnerUserId = onSnapshot(
      qOwnerUserId,
      (snapshot) => {
        if (disposed) return;
        ownerUserIdSeen = true;
        try {
          const teams: TeamMember[] = snapshot.docs.map((d) => ({
            id: `${uid}_${d.id}_ownerUserId`,
            teamId: d.id,
            uid,
            role: "owner",
            status: "active",
          }));
          const sig = signatureForTeamMembers(teams);
          if (fromOwnerUserIdSigRef.current === sig) {
            tryFinishLoading();
            return;
          }
          fromOwnerUserIdSigRef.current = sig;
          if (!disposed) {
            setFromOwnerUserId(teams);
            setError(null);
          }
        } catch (err) {
          console.warn("[useMyTeams] ownerUserId 파싱 실패:", err);
          if (!disposed) {
            fromOwnerUserIdSigRef.current = signatureForTeamMembers([]);
            setFromOwnerUserId([]);
          }
        }
        tryFinishLoading();
      },
      (err) => {
        if (disposed) return;
        ownerUserIdSeen = true;
        console.warn("[useMyTeams] teams ownerUserId 구독 실패:", err);
        if (!disposed) {
          fromOwnerUserIdSigRef.current = signatureForTeamMembers([]);
          setFromOwnerUserId([]);
        }
        tryFinishLoading();
      }
    );

    const unsubscribeOwnerId = onSnapshot(
      qOwnerId,
      (snapshot) => {
        if (disposed) return;
        ownerIdSeen = true;
        try {
          const teams: TeamMember[] = snapshot.docs.map((d) => ({
            id: `${uid}_${d.id}_ownerId`,
            teamId: d.id,
            uid,
            role: "owner",
            status: "active",
          }));
          const sig = signatureForTeamMembers(teams);
          if (fromOwnerIdSigRef.current === sig) {
            tryFinishLoading();
            return;
          }
          fromOwnerIdSigRef.current = sig;
          if (!disposed) {
            setFromOwnerId(teams);
            setError(null);
          }
        } catch (err) {
          console.warn("[useMyTeams] ownerId 파싱 실패:", err);
          if (!disposed) {
            fromOwnerIdSigRef.current = signatureForTeamMembers([]);
            setFromOwnerId([]);
          }
        }
        tryFinishLoading();
      },
      (err) => {
        if (disposed) return;
        ownerIdSeen = true;
        console.warn("[useMyTeams] teams ownerId 구독 실패:", err);
        if (!disposed) {
          fromOwnerIdSigRef.current = signatureForTeamMembers([]);
          setFromOwnerId([]);
        }
        tryFinishLoading();
      }
    );

    return () => {
      disposed = true;
      window.clearTimeout(bootWatch);
      unsubscribeSot();
      unsubscribeSotUid();
      unsubscribeOwner();
      unsubscribeOwnerUserId();
      unsubscribeOwnerId();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || backfillRequested) return;
    if (loading) return;
    if (teamMembers.length > 0) return;

    const onceKey = `myteams_backfill_once_${user.uid}`;
    if (sessionStorage.getItem(onceKey) === "done") return;

    setBackfillRequested(true);
    sessionStorage.setItem(onceKey, "done");
    void backfillMyTeamMemberships()
      .then((res) => {
        if (isDev) {
          console.log("[useMyTeams] backfillMyTeamMemberships result", res);
        }
      })
      .catch((e) => {
        console.warn(
          "[useMyTeams] backfillMyTeamMemberships 실패 (상세: [backfillMyTeamMemberships] callable 실패 로그 참고):",
          e instanceof Error ? e.message : e
        );
      });
  }, [user?.uid, backfillRequested, loading, teamMembers.length]);

  const safeTeamMembers = Array.isArray(teamMembers) ? teamMembers : [];

  const validTeamIds = useMemo(
    () =>
      safeTeamMembers
        .map((tm) => tm.teamId)
        .filter((id): id is string => Boolean(id) && id.trim() !== ""),
    [safeTeamMembers]
  );

  return {
    teamMembers: safeTeamMembers,
    teams: safeTeamMembers,
    teamIds: validTeamIds,
    loading: typeof loading === "boolean" ? loading : false,
    error: null,
    hasTeams: validTeamIds.length > 0,
    teamCount: validTeamIds.length,
  };
}
