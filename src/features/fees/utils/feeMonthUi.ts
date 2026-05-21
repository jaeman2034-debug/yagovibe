import type { Timestamp } from "firebase/firestore";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import { teamFeeCurrentSeoulMonthKey, teamFeeSeoulMonthKey } from "@/lib/fees/seoulFeeMonthKey";
import type { TeamFee } from "../types";

function dueMs(d: Timestamp | undefined): number {
  const dt = firestoreLikeToDate(d);
  return dt ? dt.getTime() : 0;
}

function createdMs(c: Timestamp | undefined): number {
  const dt = firestoreLikeToDate(c);
  return dt ? dt.getTime() : 0;
}

/**
 * `2026-9`, `2026-09` 등 입력 혼선 방지 — 출력은 항상 zero-pad된 `YYYY-MM` 한 형태.
 *
 * **Contract:** 저장·비교에 쓰이는 월 식별자는 이 형태로만 다룬다. 정렬·집합은 문자열 비교에 의존하므로
 * `"2026-9"` 같은 비정규 형태가 그대로 저장되면 안 된다(생성 시점에 반드시 normalize).
 */
export function normalizeYmKey(raw: string): string | null {
  const s = raw.trim();
  const patterns = [/^(\d{4})-(\d{1,2})$/, /^(\d{4})[./](\d{1,2})$/];
  for (const re of patterns) {
    const m = re.exec(s);
    if (!m) continue;
    const month = Number.parseInt(m[2]!, 10);
    if (month < 1 || month > 12) continue;
    return `${m[1]}-${String(month).padStart(2, "0")}`;
  }
  return null;
}

/**
 * UI·피커 공통 월키 — dedupe/선택 강조/ensure 판단의 단일 소스.
 * - `autoMonthKey`: 문자열 `YYYY-MM`만 사용(타임존 없음·의도한 회차 월).
 * - 없을 때 `dueDate`: `teamFeeSeoulMonthKey(toDate())` — 절대 시각 → 서울 달력 월.
 * - 둘 다 없으면 `null` → `syntheticMonthKey`는 `__nok_${id}` (월키 미부여 건만 id로 구분).
 * (`createdAt`은 회차 월에 쓰지 않음 — 업로드 시각이 달력 월과 어긋나는 것 방지)
 */
export function feeMonthKeyForPicker(fee: TeamFee): string | null {
  const raw = typeof fee.autoMonthKey === "string" ? fee.autoMonthKey.trim() : "";
  const normalized = normalizeYmKey(raw);
  if (normalized) return normalized;
  const dueDt = firestoreLikeToDate(fee.dueDate);
  if (dueDt) return teamFeeSeoulMonthKey(dueDt);
  return null;
}

/** 로그·범위 요약 — 달력 `YYYY-MM` 우선, 월키 미부여 시 문서 id */
export function feePickerMonthKeyOrId(fee: TeamFee): string {
  return feeMonthKeyForPicker(fee) ?? fee.id;
}

/** `feeMonthKeyForPicker` 또는 월 미부여 식별자 — 전 구간에서 동일 규칙 */
export function syntheticMonthKey(fee: TeamFee): string {
  return feeMonthKeyForPicker(fee) ?? `__nok_${fee.id}`;
}

/** 서울 기준 오늘의 `YYYY-MM` */
export function seoulYmNow(): string {
  return teamFeeCurrentSeoulMonthKey();
}

export function seoulCalendarYearNow(): number {
  return Number.parseInt(seoulYmNow().split("-")[0]!, 10);
}

/** `YYYY-MM`에 월 더하기 */
export function addMonthsYm(ym: string, delta: number): string {
  const [yStr, mStr] = ym.split("-");
  const y = Number.parseInt(yStr!, 10);
  const m = Number.parseInt(mStr!, 10);
  const d = new Date(y, m - 1 + delta, 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

/** monthKey desc → dueDate desc → createdAt desc → id asc (`__nok_*`는 월키 없음으로 맨 뒤) */
export function sortFeesStable(fees: TeamFee[]): TeamFee[] {
  return [...fees].sort((a, b) => {
    const ka = syntheticMonthKey(a);
    const kb = syntheticMonthKey(b);
    const aNorm = /^\d{4}-\d{2}$/.test(ka);
    const bNorm = /^\d{4}-\d{2}$/.test(kb);
    if (aNorm && bNorm) {
      const mk = kb.localeCompare(ka);
      if (mk !== 0) return mk;
    } else if (aNorm !== bNorm) {
      return aNorm ? -1 : 1;
    } else {
      const nk = kb.localeCompare(ka);
      if (nk !== 0) return nk;
    }
    const dd = dueMs(b.dueDate) - dueMs(a.dueDate);
    if (dd !== 0) return dd;
    const cc = createdMs(b.createdAt) - createdMs(a.createdAt);
    if (cc !== 0) return cc;
    return a.id.localeCompare(b.id);
  });
}

/** 동일 YYYY-MM 내 대표 1건 — 운영 혼선 방지: 가장 늦은 due → 최신 created → id */
function compareRepresentativeWhenNoSelection(a: TeamFee, b: TeamFee): number {
  const dd = dueMs(b.dueDate) - dueMs(a.dueDate);
  if (dd !== 0) return dd;
  const cc = createdMs(b.createdAt) - createdMs(a.createdAt);
  if (cc !== 0) return cc;
  return a.id.localeCompare(b.id);
}

/**
 * 같은 monthKey(YYYY-MM) 그룹에 문서가 여러 개일 때만 대표 1건 — selectedFeeId가 그룹 안에 있으면 그 문서.
 */
export function pickRepresentativeFeeForMonthKey(group: TeamFee[], selectedFeeId: string | undefined): TeamFee {
  if (group.length === 0) {
    throw new Error("[pickRepresentativeFeeForMonthKey] empty group");
  }
  if (group.length === 1) return group[0]!;
  if (selectedFeeId) {
    const hit = group.find((f) => f.id === selectedFeeId);
    if (hit) return hit;
  }
  return [...group].sort(compareRepresentativeWhenNoSelection)[0]!;
}

export function chipSortKeyOrder(ka: string, kb: string): number {
  if (ka.startsWith("__nok") && !kb.startsWith("__nok")) return 1;
  if (!ka.startsWith("__nok") && kb.startsWith("__nok")) return -1;
  const na = normalizeYmKey(ka) ?? ka;
  const nb = normalizeYmKey(kb) ?? kb;
  if (/^\d{4}-\d{2}$/.test(na) && /^\d{4}-\d{2}$/.test(nb)) return nb.localeCompare(na);
  return kb.localeCompare(ka);
}

/** 칩 행 정렬(월키 desc …) */
export function sortDisplayFeesChips(fees: TeamFee[]): TeamFee[] {
  return [...fees].sort((a, b) => chipSortKeyOrder(syntheticMonthKey(a), syntheticMonthKey(b)));
}

/** 보조 칩 리스트 — 타임라인 메인 전제 하에 월 단위 대표만 상한(과다 노출 방지) */
export const FEE_CHIP_ASSIST_MAX = 24;

/**
 * `filterPickerFeesByScope` 등으로 이미 걸러진 목록에 적용.
 * 월 desc 정렬 후 **상단 N건만** 유지(`ensureSelectedFeeInChipList` 전에 호출).
 */
export function capFeeAssistChipList(fees: TeamFee[]): TeamFee[] {
  const sorted = sortDisplayFeesChips(fees);
  if (sorted.length <= FEE_CHIP_ASSIST_MAX) return sorted;
  return sorted.slice(0, FEE_CHIP_ASSIST_MAX);
}

/**
 * 범위 필터 후에도 **현재 선택 회차(월)** 가 칩에서 빠지지 않게 대표 문서를 끼워 넣음.
 * 같은 synthetic 월키가 이미 목록에 있으면(대표 id가 달라도) 추가하지 않음 — 동일 월 칩 중복 방지.
 * 반환 전 항상 `sortDisplayFeesChips` 적용 — 보정 행이 맨 뒤에 붙어도 월 역순 위치로 정렬됨.
 */
export function ensureSelectedFeeInChipList(
  visibleFees: TeamFee[],
  selectedFeeId: string | undefined,
  allFees: TeamFee[],
  dedupedRepresentatives: TeamFee[]
): TeamFee[] {
  if (!selectedFeeId) return sortDisplayFeesChips(visibleFees);

  const selected = allFees.find((f) => f.id === selectedFeeId);
  if (!selected) return sortDisplayFeesChips(visibleFees);

  const mk = syntheticMonthKey(selected);
  if (visibleFees.some((f) => syntheticMonthKey(f) === mk)) {
    return sortDisplayFeesChips(visibleFees);
  }

  let rep = dedupedRepresentatives.find((f) => syntheticMonthKey(f) === mk);
  if (!rep) {
    const grp = allFees.filter((f) => syntheticMonthKey(f) === mk);
    if (grp.length === 0) return sortDisplayFeesChips(visibleFees);
    rep = pickRepresentativeFeeForMonthKey(grp, selectedFeeId);
  }

  return sortDisplayFeesChips([...visibleFees, rep]);
}

export function buildFeesForPeriodPicker(fees: TeamFee[], selectedFeeId: string | undefined): {
  displayFees: TeamFee[];
  droppedFeeIds: string[];
  monthKeysOrdered: string[];
} {
  const sorted = sortFeesStable(fees);
  const byKey = new Map<string, TeamFee[]>();
  for (const f of sorted) {
    const k = syntheticMonthKey(f);
    const arr = byKey.get(k) ?? [];
    arr.push(f);
    byKey.set(k, arr);
  }

  const monthKeysOrdered = [...byKey.keys()].sort(chipSortKeyOrder);
  const displayFees = monthKeysOrdered.map((k) => pickRepresentativeFeeForMonthKey(byKey.get(k)!, selectedFeeId));
  const kept = new Set(displayFees.map((f) => f.id));
  const droppedFeeIds = sorted.filter((f) => !kept.has(f.id)).map((f) => f.id);

  return { displayFees, droppedFeeIds, monthKeysOrdered };
}

/**
 * 기본: 선택 회차 기준 ±12개월 **또는** 최근 24개월(서울 달력)에 해당하는 월키만 표시.
 * `expand`: 전체(대표만 유지).
 * - 달력 `YYYY-MM` 키가 **하나도 없으면**(`__nok_*`만) — 보조 칩 폭주 방지로 `FEE_CHIP_ASSIST_MAX`건만.
 * - `anchorYm` 없음 — `nowYm`을 앵커로 사용(전체 반환 금지).
 * 월키 없음(`__nok_*`)은 달력 구간에도 하단에 유지(건수 적을 때 대비).
 */
export function filterPickerFeesByScope(
  displayFees: TeamFee[],
  monthKeysOrdered: string[],
  opts: { expand: boolean; anchorYm: string | null; nowYm: string }
): { visibleFees: TeamFee[]; visibleMonthKeys: string[] } {
  if (opts.expand) {
    return { visibleFees: sortDisplayFeesChips(displayFees), visibleMonthKeys: monthKeysOrdered };
  }
  const { anchorYm, nowYm } = opts;
  const normKeys = monthKeysOrdered.filter((k) => /^\d{4}-\d{2}$/.test(k));

  if (normKeys.length === 0) {
    const sorted = sortDisplayFeesChips(displayFees);
    const capped = sorted.slice(0, FEE_CHIP_ASSIST_MAX);
    const keys = capped.map((f) => syntheticMonthKey(f));
    return { visibleFees: capped, visibleMonthKeys: keys };
  }

  const effectiveAnchor = anchorYm ?? nowYm;

  const lowA = addMonthsYm(effectiveAnchor, -12);
  const highA = addMonthsYm(effectiveAnchor, 12);
  const lowB = addMonthsYm(nowYm, -23);
  const highB = nowYm;

  const allowed = new Set<string>();
  for (const k of normKeys) {
    const inAnchor = k >= lowA && k <= highA;
    const inRecent = k >= lowB && k <= highB;
    if (inAnchor || inRecent) allowed.add(k);
  }

  const visibleFees = displayFees.filter((f) => {
    const sk = syntheticMonthKey(f);
    if (sk.startsWith("__nok")) return true;
    return allowed.has(sk);
  });

  const visibleMonthKeys = monthKeysOrdered.filter((k) => {
    if (k.startsWith("__nok")) return true;
    return allowed.has(k);
  });

  const sortedVisible = sortDisplayFeesChips(visibleFees);

  return { visibleFees: sortedVisible, visibleMonthKeys };
}

export function resolveEffectiveSelectedFeeId(fees: TeamFee[], preferred: string | undefined): string | undefined {
  if (fees.length === 0) return undefined;
  const sorted = sortFeesStable(fees);
  let anchor = preferred ? fees.find((f) => f.id === preferred) : undefined;
  if (!anchor) anchor = sorted[0];
  if (!anchor) return undefined;
  const k = syntheticMonthKey(anchor);
  const group = fees.filter((f) => syntheticMonthKey(f) === k);
  return pickRepresentativeFeeForMonthKey(group, preferred).id;
}

/**
 * 스코프 앵커용 `YYYY-MM`. 선택 회차에 달력 월키가 없으면 **서울 당월**로 대체해
 * `filterPickerFeesByScope`가 전체 목록을 그대로 풀어버리지 않게 함.
 */
export function anchorYmFromFeeId(fees: TeamFee[], feeId: string | undefined): string | null {
  if (!feeId) return null;
  const hit = fees.find((f) => f.id === feeId);
  if (!hit) return null;
  return feeMonthKeyForPicker(hit) ?? seoulYmNow();
}

/**
 * 회차 칩 — **항상 연도 포함**(`YYYY년 M월 회비`)으로 표시해 여러 해의 동일 월이 겹쳐 보이지 않게 함.
 * 월키 없음(`__nok_*`)만 제목 fallback.
 */
export function formatFeeChipLabel(fee: TeamFee, monthKey: string): string {
  const amt = Math.max(0, Math.floor(Number(fee.amount) || 0));
  const won = new Intl.NumberFormat("ko-KR").format(amt);
  if (monthKey.startsWith("__nok_")) {
    const t = String(fee.title ?? "").trim() || "회비";
    const titleYm = /^(\d{4})년\s*(\d{1,2})월\s*회비/i.exec(t);
    if (titleYm) {
      const y = titleYm[1]!;
      const mo = Number.parseInt(titleYm[2]!, 10);
      return `${y}년 ${mo}월 회비 · ${won}원`;
    }
    const moOnly = /^(\d{1,2})월\s*회비\s*$/i.exec(t);
    const created = firestoreLikeToDate(fee.createdAt);
    if (moOnly && created) {
      const y = teamFeeSeoulMonthKey(created).split("-")[0]!;
      const mo = Number.parseInt(moOnly[1]!, 10);
      const createdLabel = created.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return `${y}년 ${mo}월 회비 · ${won}원 (${createdLabel})`;
    }
    const createdLabel = created
      ? created.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "";
    return createdLabel ? `${t} · ${won}원 (${createdLabel})` : `${t} · ${won}원`;
  }
  const parts = monthKey.split("-");
  const y = Number.parseInt(parts[0]!, 10);
  const m = Number.parseInt(parts[1] || "1", 10);
  return `${y}년 ${m}월 회비 · ${won}원`;
}

/** 디버그·대시보드용 */
export function analyzeFeeMonthKeysDebug(fees: TeamFee[]): {
  rawFeesCount: number;
  uniqueMonthKeyCount: number;
  duplicatedMonthKeys: string[];
  firstMonthKey: string | null;
  lastMonthKey: string | null;
} {
  const keys = fees.map((f) => feeMonthKeyForPicker(f)).filter((k): k is string => !!k && /^\d{4}-\d{2}$/.test(k));
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  const uniq = [...new Set(keys)].sort();
  const duplicatedMonthKeys = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([k]) => k)
    .sort()
    .reverse();
  const asc = [...uniq].sort((a, b) => a.localeCompare(b));
  return {
    rawFeesCount: fees.length,
    uniqueMonthKeyCount: uniq.length,
    duplicatedMonthKeys,
    /** 연도·월 기준 가장 이른 YYYY-MM */
    firstMonthKey: asc[0] ?? null,
    /** 연도·월 기준 가장 늦은 YYYY-MM */
    lastMonthKey: asc[asc.length - 1] ?? null,
  };
}
