/**
 * 팀 ownerUid + teams/{teamId}/members SoT + team_members 캐시를 한 UID로 정렬
 *
 * 사전: Firebase 콘솔 → Auth에서 "jaeman2034" (또는 대상) 계정의 UID를 복사 (문자열 username ≠ UID)
 *
 *   npx tsx functions/scripts/reassignTeamOwnerAdmin.ts --teamId=XXXX --newOwnerUid=YYYY --dry-run
 *   npx tsx functions/scripts/reassignTeamOwnerAdmin.ts --teamId=XXXX --newOwnerUid=YYYY --prod
 *
 * --demoteTo=member|manager|staff|admin  (기본 member) — demoted 이전 owner 역할
 */

import * as admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const TEAM_MEMBERS = "team_members";
const MAX_BATCH = 400;

type DemoteRole = "member" | "manager" | "staff" | "admin" | "owner";

function parseArgs() {
  const argv = process.argv.slice(2);
  const get = (k: string) => {
    const hit = argv.find((a) => a.startsWith(`${k}=`));
    return hit ? hit.slice(k.length + 1) : undefined;
  };
  return {
    teamId: get("teamId") || "",
    newOwnerUid: get("newOwnerUid") || "",
    demoteTo: (get("demoteTo") as DemoteRole) || "member",
    dryRun: argv.includes("--dry-run"),
    prod: argv.includes("--prod"),
  };
}

const OWNER_ROLES = new Set(["owner", "LEADER", "admin", "administrator"]);

function isOwnerLikeRole(role: unknown): boolean {
  if (typeof role !== "string") return false;
  return OWNER_ROLES.has(role);
}

async function main() {
  const { teamId, newOwnerUid, demoteTo, dryRun, prod } = parseArgs();
  if (prod) {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  }
  if (!teamId || !newOwnerUid) {
    console.error("필수: --teamId=... --newOwnerUid=...");
    process.exit(1);
  }
  if (demoteTo === "owner") {
    console.error("demoteTo cannot be owner");
    process.exit(1);
  }

  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  const db = getFirestore();
  const teamRef = db.doc(`teams/${teamId}`);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    console.error("team not found");
    process.exit(1);
  }
  const team = teamSnap.data() as { ownerUid?: string };
  const oldOwnerUid = typeof team.ownerUid === "string" ? team.ownerUid : "";

  const membersRef = teamRef.collection("members");
  const membersSnap = await membersRef.get();

  const updates: { path: string; data: Record<string, unknown> }[] = [];
  const pathsToSet: { path: string; data: Record<string, unknown>; merge: boolean }[] = [];

  if (oldOwnerUid && oldOwnerUid !== newOwnerUid) {
    const oldM = membersRef.doc(oldOwnerUid);
    updates.push({
      path: oldM.path,
      data: {
        role: demoteTo,
        userId: oldOwnerUid,
        updatedAt: FieldValue.serverTimestamp(),
      },
    });
    const oldId = `${oldOwnerUid}_${teamId}`;
    const oldIndexSnap = await db.doc(`${TEAM_MEMBERS}/${oldId}`).get();
    if (oldIndexSnap.exists) {
      pathsToSet.push({
        path: `${TEAM_MEMBERS}/${oldId}`,
        data: {
          teamId,
          userId: oldOwnerUid,
          uid: oldOwnerUid,
          role: demoteTo,
          status: "active",
          updatedAt: FieldValue.serverTimestamp(),
        },
        merge: true,
      });
    }
  }

  for (const d of membersSnap.docs) {
    const data = d.data() as { role?: string; userId?: string; status?: string };
    if (d.id === newOwnerUid) continue;
    if (d.id === oldOwnerUid) continue;
    if (isOwnerLikeRole(data.role)) {
      updates.push({
        path: d.ref.path,
        data: {
          role: demoteTo,
          userId: d.id,
          updatedAt: FieldValue.serverTimestamp(),
        },
      });
      const mId = `${d.id}_${teamId}`;
      const idxExists = (await db.doc(`${TEAM_MEMBERS}/${mId}`).get()).exists;
      if (idxExists) {
        pathsToSet.push({
          path: `${TEAM_MEMBERS}/${mId}`,
          data: {
            teamId,
            userId: d.id,
            uid: d.id,
            role: demoteTo,
            status: data.status || "active",
            updatedAt: FieldValue.serverTimestamp(),
          },
          merge: true,
        });
      }
    }
  }

  const newMemberRef = membersRef.doc(newOwnerUid);
  pathsToSet.push({
    path: newMemberRef.path,
    data: {
      userId: newOwnerUid,
      role: "owner",
      status: "active",
      joinedAt: FieldValue.serverTimestamp(),
    },
    merge: true,
  });
  const newIndexId = `${newOwnerUid}_${teamId}`;
  pathsToSet.push({
    path: `${TEAM_MEMBERS}/${newIndexId}`,
    data: {
      teamId,
      userId: newOwnerUid,
      uid: newOwnerUid,
      role: "owner",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      joinedAt: FieldValue.serverTimestamp(),
    },
    merge: true,
  });

  updates.unshift({
    path: teamRef.path,
    data: { ownerUid: newOwnerUid, updatedAt: FieldValue.serverTimestamp() },
  });

  console.log("--- reassign team owner (plan) ---");
  console.log({ teamId, oldOwnerUid, newOwnerUid, demoteTo, dryRun, memberCount: membersSnap.size });
  console.log("team update:", JSON.stringify(updates[0], null, 0));
  console.log("member+index ops:", updates.length - 1 + pathsToSet.length);

  if (dryRun) {
    console.log("[dry-run] no writes");
    return;
  }

  let batch = db.batch();
  let n = 0;
  const commit = async () => {
    if (n > 0) {
      await batch.commit();
    }
    batch = db.batch();
    n = 0;
  };

  for (const u of updates) {
    const ref = db.doc(u.path);
    batch.set(ref, u.data, { merge: true });
    n++;
    if (n >= MAX_BATCH) await commit();
  }
  for (const p of pathsToSet) {
    batch.set(db.doc(p.path), p.data, { merge: p.merge });
    n++;
    if (n >= MAX_BATCH) await commit();
  }
  if (n > 0) await commit();

  console.log("ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
