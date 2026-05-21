// functions/scripts/backfill-team-member-profile-fields.js
// 🔄 기존 팀 멤버 문서에 신규 프로필 필드 백필
//
// 실행 예:
//   npm --prefix functions run backfill:team-member-profile-fields -- --dry-run
//   npm --prefix functions run backfill:team-member-profile-fields -- --team=VojZWvNb0m1kzOBDlrsn --dry-run
//   npm --prefix functions run backfill:team-member-profile-fields -- --team=VojZWvNb0m1kzOBDlrsn
//   npm --prefix functions run backfill:team-member-profile-fields -- --default-position=MF

const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const BATCH_LIMIT = 400;

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  let teamIdFilter;
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

function buildBackfillPatch(data, defaultPosition) {
  const patch = {};
  if (!Object.prototype.hasOwnProperty.call(data, "jerseyNumber")) patch.jerseyNumber = null;
  if (!Object.prototype.hasOwnProperty.call(data, "uniformSize")) patch.uniformSize = null;
  if (!Object.prototype.hasOwnProperty.call(data, "position")) patch.position = defaultPosition;
  if (!Object.prototype.hasOwnProperty.call(data, "roleDetail")) patch.roleDetail = "";

  if (Object.keys(patch).length === 0) return null;
  patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  return patch;
}

async function commitIfNeeded(batch, count, dryRun) {
  if (dryRun || count < BATCH_LIMIT) return { batch, count };
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

  let batch = db.batch();
  let pendingWrites = 0;

  const teams = teamIdFilter
    ? await db.collection("teams").doc(teamIdFilter).get().then((doc) => (doc.exists ? [doc] : []))
    : (await db.collection("teams").get()).docs;

  console.log(`📊 [Backfill] 대상 팀 수: ${teams.length}`);

  for (const teamDoc of teams) {
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
  console.log(`   총 백필 대상: ${teamMembersPatched + mirrorPatched}건`);
  console.log("=".repeat(80));
}

backfillTeamMembers()
  .then(() => {
    console.log("✅ [Backfill] 종료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ [Backfill] 실패:", error);
    process.exit(1);
  });

