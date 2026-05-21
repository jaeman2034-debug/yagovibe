/**
 * 동일 서울 월(`autoMonthKey` 또는 없을 때 `dueDate`→YYYY-MM)에 여러 `teams/{teamId}/fees` 문서가 있을 때,
 * payments 레코드가 많은 문서 1개를 남기고, 나머지 중 **payments가 0건인 문서만** 삭제합니다.
 *
 * =============================================================================
 * 커서 실행 지시문 (복붙용) — 프로젝트 루트 yago-vibe-spt 에서 실행
 * =============================================================================
 * 목표: 각 YYYY-MM당 회차 1개만 남기고 중복 삭제
 *
 * 1) URL에서 teamId 정확히 복사 (/teams/XXXXXXXX)
 *
 * 2) DRY RUN (삭제 없음, 필수)
 *    npm run dedupe:team-fees -- --teamId=TEAM_ID --dry-run
 *    (기본: 프로덕션 DB — 셸에 FIRESTORE_EMULATOR_HOST 가 있어도 자동 제거. 에뮬만 쓸 때만 --use-emulator)
 *
 * 3) 콘솔에서 [KEEP] / [DELETE] / [SKIP] 확인 — DELETE만 실제 삭제 대상(payments 0건)
 *
 * 4) 확인 후 실행
 *    npm run dedupe:team-fees -- --teamId=TEAM_ID --execute
 *
 * 5) UI에서 월당 1개·누락 월 없는지 검증
 *
 * 주의: teamId 오타 금지 · dry-run 없이 execute 금지 · 되돌리기 어려움
 *
 * `functions` 폴더에 있을 때도 동일: npm run dedupe:team-fees -- --teamId=... --dry-run
 * =============================================================================
 *
 * 재발 방지: 클라이언트 `ensureAnnualFeeRounds`는 트랜잭션 + 인플라이트 락·연납 버튼 ref 락 적용됨 (`src/lib/team/teamFees.ts` 등)
 */

import * as admin from "firebase-admin";
import { getFirestore, type QueryDocumentSnapshot } from "firebase-admin/firestore";

function parseArgs() {
  const argv = process.argv.slice(2);
  let teamId = "";
  let dryRun = true;
  /** 레거시 호환 — 예전에는 프로덕션 연결에 필요했음 */
  let prodLegacy = false;
  /** 에뮬레이터 사용 (미지정 시 프로덕션: FIRESTORE_EMULATOR_HOST 등 제거) */
  const useEmulator = argv.includes("--use-emulator");
  for (const a of argv) {
    if (a.startsWith("--teamId=")) teamId = a.slice("--teamId=".length).trim();
    if (a === "--execute") dryRun = false;
    if (a === "--dry-run") dryRun = true;
    if (a === "--prod") prodLegacy = true;
  }
  return { teamId, dryRun, prodLegacy, useEmulator };
}

/** 중복 정리는 보통 프로덕션 대상 — 에뮬 env만 남아 있으면 127.0.0.1:8210 연결 거부로 실패하기 쉬움 */
function prepareFirestoreConnection(useEmulator: boolean): void {
  if (useEmulator) {
    console.log("📍 모드: Firestore 에뮬레이터 (--use-emulator)");
    return;
  }
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  console.log("📍 모드: 프로덕션 Firestore (로컬 에뮬레이터 env 제거됨)");
}

function seoulMonthKeyFromDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(d);
}

function occupancyKey(data: Record<string, unknown>): string | null {
  const raw = String(data.autoMonthKey ?? "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  const due = data.dueDate as admin.firestore.Timestamp | undefined;
  if (due?.toDate) return seoulMonthKeyFromDate(due.toDate());
  return null;
}

function createdMs(data: Record<string, unknown>): number {
  const c = data.createdAt as admin.firestore.Timestamp | undefined;
  return c?.toMillis?.() ?? 0;
}

async function main() {
  const { teamId, dryRun, prodLegacy, useEmulator } = parseArgs();
  if (!teamId) {
    console.error("❌ --teamId= 가 필요합니다.");
    process.exit(1);
  }
  if (prodLegacy && !useEmulator) {
    console.log("(참고) --prod 는 선택 사항입니다. 기본이 프로덕션 연결입니다.");
  }
  prepareFirestoreConnection(useEmulator);

  if (!admin.apps.length) admin.initializeApp();
  const db = getFirestore();

  const feesSnap = await db.collection("teams").doc(teamId).collection("fees").orderBy("createdAt", "desc").get();

  const paySnap = await db.collection("teams").doc(teamId).collection("payments").get();
  const paymentCountByFeeId = new Map<string, number>();
  for (const d of paySnap.docs) {
    const fid = String((d.data() as Record<string, unknown>).feeId ?? "").trim();
    if (!fid) continue;
    paymentCountByFeeId.set(fid, (paymentCountByFeeId.get(fid) ?? 0) + 1);
  }

  const byKey = new Map<string, QueryDocumentSnapshot[]>();
  for (const doc of feesSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const key = occupancyKey(data);
    if (!key) {
      console.warn("[skip] month key 없음:", doc.id);
      continue;
    }
    const arr = byKey.get(key) ?? [];
    arr.push(doc);
    byKey.set(key, arr);
  }

  let duplicateGroups = 0;
  let toDelete: QueryDocumentSnapshot[] = [];
  let skippedHasPayments = 0;

  for (const [monthKey, docs] of byKey) {
    if (docs.length <= 1) continue;
    duplicateGroups += 1;

    const sorted = [...docs].sort((a, b) => {
      const da = a.data() as Record<string, unknown>;
      const db_ = b.data() as Record<string, unknown>;
      const pa = paymentCountByFeeId.get(a.id) ?? 0;
      const pb = paymentCountByFeeId.get(b.id) ?? 0;
      if (pb !== pa) return pb - pa;
      return createdMs(da) - createdMs(db_);
    });

    const keeper = sorted[0]!;
    const losers = sorted.slice(1);
    const keepPc = paymentCountByFeeId.get(keeper.id) ?? 0;
    console.log(`[KEEP] ${monthKey} -> ${keeper.id} (payments 레코드 ${keepPc}건)`);

    for (const loser of losers) {
      const pc = paymentCountByFeeId.get(loser.id) ?? 0;
      if (pc > 0) {
        console.warn(`[SKIP] ${monthKey} -> ${loser.id}: payments ${pc}건 — 삭제 안 함, 수동 검토`);
        skippedHasPayments += 1;
        continue;
      }
      console.log(`[DELETE] ${monthKey} -> ${loser.id}`);
      toDelete.push(loser);
    }
  }

  console.log("\n--- 요약 ---");
  console.log(`중복 월 키 그룹: ${duplicateGroups}`);
  console.log(`삭제 예정(결제 0건): ${toDelete.length}`);
  console.log(`삭제 스킵(결제 있음): ${skippedHasPayments}`);
  console.log(`모드: ${dryRun ? "DRY-RUN (삭제 안 함)" : "EXECUTE"}`);

  if (!dryRun && toDelete.length > 0) {
    let batch = db.batch();
    let ops = 0;
    const flush = async () => {
      if (ops === 0) return;
      await batch.commit();
      batch = db.batch();
      ops = 0;
    };
    for (const d of toDelete) {
      batch.delete(d.ref);
      ops++;
      if (ops >= 400) await flush();
    }
    await flush();
    console.log("✅ 삭제 커밋 완료");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
