// scripts/backfill-team-member-profile-fields.ts
// 🔄 기존 팀 멤버 문서에 신규 프로필 필드 백필
//
// 실행 예:
//   npx tsx scripts/backfill-team-member-profile-fields.ts --dry-run
//   npx tsx scripts/backfill-team-member-profile-fields.ts --team=VojZWvNb0m1kzOBDlrsn --dry-run
//   npx tsx scripts/backfill-team-member-profile-fields.ts --team=VojZWvNb0m1kzOBDlrsn
//   npx tsx scripts/backfill-team-member-profile-fields.ts --default-position=MF
//
// 기본 백필 값:
//   jerseyNumber: null
//   uniformSize: null
//   position: "" (또는 --default-position으로 지정)
//   roleDetail: ""

import * as admin from "firebase-admin";
import { getFirestore, FieldValue, type WriteBatch } from "firebase-admin/firestore";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore();
const BATCH_LIMIT = 400;

type CliArgs = {
  dryRun: boolean;
  teamIdFilter?: string;
  defaultPosition: string;
};

type BackfillTarget = {
  jerseyNumber?: null;
  uniformSize?: null;
  position?: string;
  roleDetail?: string;
  updatedAt?: FieldValue;
};

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  let teamIdFilter: string | undefined;
  let defaultPosition = "";

  for (const a of argv) {
    if (a.startsWith("--team=")) {
      const v = a.slice("--team=".length).trim();
      if (v) teamIdFilter = v;
    }
    if (a.startsWith("--default-position=")) {
      defaultPosition = a.slice("--default-position=".length).trim().toUpperCase();
    }
  }

  return { dryRun, teamIdFilter, defaultPosition };
}

function buildBackfillPatch(
  data: FirebaseFirestore.DocumentData,
  defaultPosition: string
): BackfillTarget | null {
  const patch: BackfillTarget = {};

  if (!Object.prototype.hasOwnProperty.call(data, "jerseyNumber")) {
    patch.jerseyNumber = null;
  }
  if (!Object.prototype.hasOwnProperty.call(data, "uniformSize")) {
    patch.uniformSize = null;
  }
  if (!Object.prototype.hasOwnProperty.call(data, "position")) {
    patch.position = defaultPosition;
  }
  if (!Object.prototype.hasOwnProperty.call(data, "roleDetail")) {
    patch.roleDetail = "";
  }

  const hasAny = Object.keys(patch).length > 0;
  if (!hasAny) return null;

  patch.updatedAt = FieldValue.serverTimestamp();
  return patch;
}

async function commitIfNeeded(
  batch: WriteBatch,
  count: number,
  dryRun: boolean
): Promise<{ batch: WriteBatch; count: number }> {
  if (dryRun || count < BATCH_LIMIT) {
    return { batch, count };
  }
  await batch.commit();
  return { batch: db.batch(), count: 0 };
}

async function backfillTeamMembers() {
  const { dryRun, teamIdFilter, defaultPosition } = parseArgs();

  console.log("🔄 [Backfill] 팀 멤버 신규 필드 백필 시작");
  if (dryRun) console.log("🧪 [Backfill] --dry-run (쓰기 없음)");
  if (teamIdFilter) console.log(`🎯 [Backfill] 팀 한정: ${teamIdFilter}`);
  console.log(`⚙️ [Backfill] 기본 포지션: "${defaultPosition}"`);

  let teamMembersScanned = 0;
  let teamMembersPatched = 0;
  let mirrorScanned = 0;
  let mirrorPatched = 0;
  let skipped = 0;
  let errors = 0;

  let batch = db.batch();
  let pendingWrites = 0;

  try {
    const teamSnap = teamIdFilter
      ? await db.collection("teams").doc(teamIdFilter).get().then((doc) => {
          if (!doc.exists) return [];
          return [doc];
        })
      : (await db.collection("teams").get()).docs;

    console.log(`📊 [Backfill] 대상 팀 수: ${teamSnap.length}`);

    for (const teamDoc of teamSnap) {
      const teamId = teamDoc.id;
      const membersSnap = await db.collection("teams").doc(teamId).collection("members").get();
      teamMembersScanned += membersSnap.size;

      for (const memberDoc of membersSnap.docs) {
        const patch = buildBackfillPatch(memberDoc.data(), defaultPosition);
        if (!patch) {
          skipped++;
          continue;
        }
        teamMembersPatched++;

        if (dryRun) continue;
        batch.update(memberDoc.ref, patch);
        pendingWrites++;
        const next = await commitIfNeeded(batch, pendingWrites, dryRun);
        batch = next.batch;
        pendingWrites = next.count;
      }
    }

    const mirrorQuery = teamIdFilter
      ? db.collection("team_members").where("teamId", "==", teamIdFilter)
      : db.collection("team_members");
    const mirrorSnap = await mirrorQuery.get();
    mirrorScanned = mirrorSnap.size;

    for (const mirrorDoc of mirrorSnap.docs) {
      const patch = buildBackfillPatch(mirrorDoc.data(), defaultPosition);
      if (!patch) {
        skipped++;
        continue;
      }
      mirrorPatched++;

      if (dryRun) continue;
      batch.update(mirrorDoc.ref, patch);
      pendingWrites++;
      const next = await commitIfNeeded(batch, pendingWrites, dryRun);
      batch = next.batch;
      pendingWrites = next.count;
    }

    if (!dryRun && pendingWrites > 0) {
      await batch.commit();
    }

    console.log("=".repeat(80));
    console.log("📊 [Backfill] 완료");
    console.log(`   teams/{teamId}/members 스캔: ${teamMembersScanned}건`);
    console.log(`   teams/{teamId}/members 백필: ${teamMembersPatched}건`);
    console.log(`   team_members 스캔: ${mirrorScanned}건`);
    console.log(`   team_members 백필: ${mirrorPatched}건`);
    console.log(`   변경 없음/스킵: ${skipped}건`);
    console.log(`   오류: ${errors}건`);
    console.log(`   총 백필 대상: ${teamMembersPatched + mirrorPatched}건`);
    console.log("=".repeat(80));

    if (dryRun) {
      console.log("💡 [Backfill] dry-run 확인 후 --dry-run 없이 다시 실행하세요.");
    }
  } catch (error: any) {
    errors++;
    console.error("❌ [Backfill] 실행 실패:", error?.message || error);
    throw error;
  }
}

const isMainModule = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return entry.includes("backfill-team-member-profile-fields.ts");
})();

if (isMainModule) {
  backfillTeamMembers()
    .then(() => {
      console.log("✅ [Backfill] 종료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ [Backfill] 실패:", error);
      process.exit(1);
    });
}

export { backfillTeamMembers };

