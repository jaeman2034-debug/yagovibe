/**
 * 팀 다가오는 일정 + RSVP — teams/{teamId}/scheduled_matches/{fixtureId}
 * participants: teams/{teamId}/scheduled_matches/{fixtureId}/participants/{uid}
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { startOfWeek, endOfWeek, format } from "date-fns";
import type { CreateScheduledMatchInput, RSVPStatus, ScheduledMatch } from "@/types/scheduledMatch";
import { createNotification } from "@/services/platformNotificationService";

const COL = "scheduled_matches";

function asStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asTs(v: unknown): Timestamp | null {
  if (v instanceof Timestamp) return v;
  return null;
}

function parseScheduledMatch(teamId: string, id: string, raw: Record<string, unknown>): ScheduledMatch | null {
  const title = asStr(raw.title);
  const startAt = asTs(raw.startAt);
  if (!title || !startAt) return null;
  const vis = raw.visibility === "team" ? "team" : "public";
  const createdAt = asTs(raw.createdAt) ?? startAt;
  const updatedAt = asTs(raw.updatedAt) ?? createdAt;
  return {
    id,
    teamId,
    title,
    description: asStr(raw.description),
    location: asStr(raw.location),
    startAt,
    endAt: asTs(raw.endAt),
    visibility: vis,
    goingCount: typeof raw.goingCount === "number" && Number.isFinite(raw.goingCount) ? Math.max(0, raw.goingCount) : 0,
    maybeCount: typeof raw.maybeCount === "number" && Number.isFinite(raw.maybeCount) ? Math.max(0, raw.maybeCount) : 0,
    noCount: typeof raw.noCount === "number" && Number.isFinite(raw.noCount) ? Math.max(0, raw.noCount) : 0,
    createdBy: asStr(raw.createdBy),
    createdAt,
    updatedAt,
  };
}

function matchesCol(teamId: string) {
  return collection(db, "teams", teamId.trim(), COL);
}

function participantRef(teamId: string, fixtureId: string, uid: string) {
  return doc(db, "teams", teamId.trim(), COL, fixtureId.trim(), "participants", uid.trim());
}

function fixtureRef(teamId: string, fixtureId: string) {
  return doc(db, "teams", teamId.trim(), COL, fixtureId.trim());
}

/**
 * 다가오는 일정 목록.
 * - 비팀원·비로그인: `visibility == "public"` 만 (쿼리·규칙 정합)
 * - 활성 팀원: `public` + `team` 모두
 */
export async function getUpcomingScheduledMatches(
  teamId: string,
  opts: { forActiveMember: boolean; limit?: number }
): Promise<ScheduledMatch[]> {
  const tid = teamId.trim();
  if (!tid) return [];
  const now = Timestamp.now();
  const col = matchesCol(tid);
  const lim =
    typeof opts.limit === "number" && Number.isFinite(opts.limit) ? Math.min(Math.max(1, opts.limit), 50) : 20;
  const qy = opts.forActiveMember
    ? query(col, where("startAt", ">=", now), orderBy("startAt", "asc"), limit(lim))
    : query(
        col,
        where("visibility", "==", "public"),
        where("startAt", ">=", now),
        orderBy("startAt", "asc"),
        limit(lim)
      );
  const snap = await getDocs(qy);
  const out: ScheduledMatch[] = [];
  snap.forEach((d) => {
    const m = parseScheduledMatch(tid, d.id, d.data() as Record<string, unknown>);
    if (m) out.push(m);
  });
  return out;
}

export async function getMyParticipantStatus(
  teamId: string,
  fixtureId: string,
  uid: string
): Promise<RSVPStatus | null> {
  const snap = await getDoc(participantRef(teamId, fixtureId, uid));
  if (!snap.exists()) return null;
  const s = (snap.data() as { status?: unknown }).status;
  return s === "going" || s === "maybe" || s === "no" ? s : null;
}

/**
 * RSVP 미응답 인원 (운영진 nudge).
 * 활성 멤버 수 − (참석 + 미정 + 불참 합). 카운트와 멤버 SoT가 어긋나면 0으로 클램프.
 */
export function getUnrespondedCount(activeMemberCount: number, fixture: ScheduledMatch): number {
  if (!Number.isFinite(activeMemberCount) || activeMemberCount < 0) return 0;
  const responded = fixture.goingCount + fixture.maybeCount + fixture.noCount;
  return Math.max(0, activeMemberCount - responded);
}

/**
 * teams/{teamId}/members 활성 인원 수 — 미응답 nudge용.
 * 호출부에서 일정마다 반복 호출하지 말 것(섹션·페이지당 1회 권장).
 */
export async function countActiveTeamMembersForRsvp(teamId: string): Promise<number> {
  const tid = teamId.trim();
  if (!tid) return 0;
  const snap = await getDocs(collection(db, "teams", tid, "members"));
  let n = 0;
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    if (data.isDeleted === true) return;
    const status = String(data.status ?? "active").toLowerCase();
    if (status === "active") n += 1;
  });
  return n;
}

/** 이번 주(월 시작) 기준 KPI — 대시보드 strip용. `includeStaffUnresponded`일 때만 멤버 SoT 1회 조회 */
export type WeekScheduleKpis = {
  weekFixtureCount: number;
  weekGoingSum: number;
  /** 운영진만; 비운영진은 null */
  weekUnrespondedSum: number | null;
};

export async function getWeekScheduleKpis(
  teamId: string,
  opts: { forActiveMember: boolean; includeStaffUnresponded: boolean }
): Promise<WeekScheduleKpis> {
  const tid = teamId.trim();
  if (!tid) {
    return { weekFixtureCount: 0, weekGoingSum: 0, weekUnrespondedSum: opts.includeStaffUnresponded ? 0 : null };
  }
  let activeCount: number | null = null;
  if (opts.includeStaffUnresponded) {
    try {
      activeCount = await countActiveTeamMembersForRsvp(tid);
    } catch {
      activeCount = null;
    }
  }
  const matches = await getUpcomingScheduledMatches(tid, { forActiveMember: opts.forActiveMember, limit: 40 });
  const now = new Date();
  const w0 = startOfWeek(now, { weekStartsOn: 1 });
  const w1 = endOfWeek(now, { weekStartsOn: 1 });
  const t0 = w0.getTime();
  const t1 = w1.getTime();
  const inWeek = matches.filter((m) => {
    const x = m.startAt.toMillis();
    return x >= t0 && x <= t1;
  });
  const weekFixtureCount = inWeek.length;
  const weekGoingSum = inWeek.reduce((a, m) => a + m.goingCount, 0);
  const weekUnrespondedSum =
    opts.includeStaffUnresponded && activeCount != null
      ? inWeek.reduce((a, m) => a + getUnrespondedCount(activeCount, m), 0)
      : null;
  return { weekFixtureCount, weekGoingSum, weekUnrespondedSum };
}

function countDelta(old: RSVPStatus | null, next: RSVPStatus): { g: number; m: number; n: number } {
  const dec = (x: RSVPStatus | null) => ({
    g: x === "going" ? -1 : 0,
    m: x === "maybe" ? -1 : 0,
    n: x === "no" ? -1 : 0,
  });
  const inc = (x: RSVPStatus) => ({
    g: x === "going" ? 1 : 0,
    m: x === "maybe" ? 1 : 0,
    n: x === "no" ? 1 : 0,
  });
  const a = dec(old);
  const b = inc(next);
  return { g: a.g + b.g, m: a.m + b.m, n: a.n + b.n };
}

/** 활성 팀원 RSVP — 참가 문서 + fixture 카운트를 트랜잭션으로 갱신 */
export async function respondToScheduledMatch(
  teamId: string,
  fixtureId: string,
  uid: string,
  status: RSVPStatus
): Promise<void> {
  const tid = teamId.trim();
  const fid = fixtureId.trim();
  const u = uid.trim();
  if (!tid || !fid || !u) throw new Error("teamId, fixtureId, uid가 필요합니다.");

  const fRef = fixtureRef(tid, fid);
  const pRef = participantRef(tid, fid, u);

  await runTransaction(db, async (tx) => {
    const fSnap = await tx.get(fRef);
    if (!fSnap.exists()) throw new Error("일정을 찾을 수 없습니다.");
    const f = fSnap.data() as Record<string, unknown>;
    const pSnap = await tx.get(pRef);
    const prevRaw = pSnap.exists() ? (pSnap.data() as { status?: unknown }).status : null;
    const prev: RSVPStatus | null =
      prevRaw === "going" || prevRaw === "maybe" || prevRaw === "no" ? prevRaw : null;

    const d = countDelta(prev, status);
    const goingCount =
      (typeof f.goingCount === "number" && Number.isFinite(f.goingCount) ? f.goingCount : 0) + d.g;
    const maybeCount =
      (typeof f.maybeCount === "number" && Number.isFinite(f.maybeCount) ? f.maybeCount : 0) + d.m;
    const noCount = (typeof f.noCount === "number" && Number.isFinite(f.noCount) ? f.noCount : 0) + d.n;

    tx.set(pRef, {
      uid: u,
      status,
      respondedAt: serverTimestamp(),
    });

    tx.update(fRef, {
      goingCount: Math.max(0, goingCount),
      maybeCount: Math.max(0, maybeCount),
      noCount: Math.max(0, noCount),
      updatedAt: serverTimestamp(),
    });
  });
}

/** 팀장·운영진(owner/admin)만 생성 */
export async function createScheduledMatch(
  teamId: string,
  createdBy: string,
  input: CreateScheduledMatchInput
): Promise<string> {
  const tid = teamId.trim();
  const uid = createdBy.trim();
  const title = input.title.trim();
  if (!tid || !uid) throw new Error("teamId와 작성자가 필요합니다.");
  if (!title) throw new Error("제목을 입력해 주세요.");
  if (!input.location.trim()) throw new Error("장소를 입력해 주세요.");

  const startAt = Timestamp.fromDate(input.startAt);
  const endAt = input.endAt ? Timestamp.fromDate(input.endAt) : null;
  const vis = input.visibility === "team" ? "team" : "public";

  const ref = await addDoc(matchesCol(tid), {
    title,
    description: (input.description ?? "").trim(),
    location: input.location.trim(),
    startAt,
    ...(endAt ? { endAt } : {}),
    visibility: vis,
    goingCount: 0,
    maybeCount: 0,
    noCount: 0,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

const RSVP_COACH_REMINDER_MESSAGE = "다가오는 팀 일정 참석 여부를 확인해 주세요.";

function profileUidFromMemberData(data: Record<string, unknown>, memberDocId: string): string {
  return asStr(data.userId) || asStr(data.uid) || memberDocId;
}

/** 활성 멤버의 Auth UID 목록(RSVP SoT와 동일 규칙) */
export async function listActiveMemberProfileUidsForRsvp(teamId: string): Promise<string[]> {
  const tid = teamId.trim();
  if (!tid) return [];
  const snap = await getDocs(collection(db, "teams", tid, "members"));
  const out: string[] = [];
  const seen = new Set<string>();
  snap.forEach((d) => {
    const data = d.data() as Record<string, unknown>;
    if (data.isDeleted === true) return;
    const status = String(data.status ?? "active").toLowerCase();
    if (status !== "active") return;
    const uid = profileUidFromMemberData(data, d.id);
    if (!uid || seen.has(uid)) return;
    seen.add(uid);
    out.push(uid);
  });
  return out;
}

function upcomingFixturesInCurrentWeek(matches: ScheduledMatch[]): ScheduledMatch[] {
  const now = new Date();
  const w0 = startOfWeek(now, { weekStartsOn: 1 });
  const t0 = w0.getTime();
  const t1 = endOfWeek(now, { weekStartsOn: 1 }).getTime();
  return matches.filter((m) => {
    const x = m.startAt.toMillis();
    return x >= t0 && x <= t1;
  });
}

/** 이번 주 일정 중 한 번이라도 RSVP 미제출인 멤버 UID(중복 제거) */
export async function collectUnrespondedMemberUidsThisCalendarWeek(
  teamId: string,
  opts: { forActiveMember: boolean }
): Promise<string[]> {
  const tid = teamId.trim();
  if (!tid) return [];
  const activeUids = await listActiveMemberProfileUidsForRsvp(tid);
  if (activeUids.length === 0) return [];
  const matches = await getUpcomingScheduledMatches(tid, { forActiveMember: opts.forActiveMember, limit: 40 });
  const inWeek = upcomingFixturesInCurrentWeek(matches);
  const need = new Set<string>();
  for (const m of inWeek) {
    const pSnap = await getDocs(collection(db, "teams", tid, COL, m.id, "participants"));
    const responded = new Set<string>();
    pSnap.forEach((doc) => {
      const st = (doc.data() as { status?: unknown }).status;
      if (st === "going" || st === "maybe" || st === "no") responded.add(doc.id);
    });
    for (const uid of activeUids) {
      if (!responded.has(uid)) need.add(uid);
    }
  }
  return [...need];
}

/**
 * 운영 코치 — 미응답 멤버에게 인앱 알림 + FCM(문서 status queued).
 * 주·팀·멤버당 1회 dedup(`pushDedupKey`).
 */
export async function sendUnrespondedRsvpCoachReminders(input: {
  teamId: string;
  teamName: string;
  forActiveMember: boolean;
}): Promise<{ recipientCount: number }> {
  const tid = input.teamId.trim();
  if (!tid) return { recipientCount: 0 };

  const recipients = await collectUnrespondedMemberUidsThisCalendarWeek(tid, {
    forActiveMember: input.forActiveMember,
  });
  if (recipients.length === 0) return { recipientCount: 0 };

  const w0 = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekKey = format(w0, "yyyy-MM-dd");
  const link = `/team/${encodeURIComponent(tid)}/public`;
  const safeName = (input.teamName || "팀").trim() || "팀";
  const title = `${safeName} — 일정 안내`;

  await Promise.all(
    recipients.map((uid) =>
      createNotification({
        userId: uid,
        type: "TEAM_SCHEDULE_REMINDER",
        title,
        message: RSVP_COACH_REMINDER_MESSAGE,
        body: RSVP_COACH_REMINDER_MESSAGE,
        link,
        status: "queued",
        pushDedupKey: `team_rsvp_coach:${tid}:${uid}:${weekKey}`,
        teamId: tid,
        teamName: safeName,
        target: { screen: "team", id: tid, params: { tab: "overview" } },
        priority: "normal",
      })
    )
  );

  return { recipientCount: recipients.length };
}

export type RsvpMemberRow = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
};

async function enrichMemberRows(uids: string[]): Promise<RsvpMemberRow[]> {
  if (uids.length === 0) return [];
  const rows = await Promise.all(
    uids.map(async (raw) => {
      const u = raw.trim();
      if (!u) return null;
      try {
        const snap = await getDoc(doc(db, "users", u));
        if (!snap.exists()) {
          return { uid: u, displayName: u, photoUrl: null };
        }
        const d = snap.data() as Record<string, unknown>;
        const displayName = asStr(d.displayName) || asStr(d.name) || asStr(d.nickname) || u;
        const photoUrl = asStr(d.photoURL) || asStr(d.avatar) || null;
        return { uid: u, displayName, photoUrl };
      } catch {
        return { uid: u, displayName: u, photoUrl: null };
      }
    })
  );
  const filtered = rows.filter((x): x is RsvpMemberRow => x != null);
  return filtered.sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
}

/** 이번 주 일정에 한 번이라도 RSVP 안 한 멤버(이름·사진 포함, 정렬됨) */
export async function listUnrespondedMembersThisWeekEnriched(
  teamId: string,
  opts: { forActiveMember: boolean }
): Promise<RsvpMemberRow[]> {
  const uids = await collectUnrespondedMemberUidsThisCalendarWeek(teamId, opts);
  return enrichMemberRows(uids);
}

/** 이번 주(월~일) 안에 시작하는 다가오는 일정 */
export async function listUpcomingFixturesInCurrentWeek(
  teamId: string,
  opts: { forActiveMember: boolean }
): Promise<ScheduledMatch[]> {
  const tid = teamId.trim();
  if (!tid) return [];
  const matches = await getUpcomingScheduledMatches(tid, { forActiveMember: opts.forActiveMember, limit: 40 });
  return upcomingFixturesInCurrentWeek(matches);
}

export type FixtureRsvpBreakdown = {
  fixtureId: string;
  title: string;
  startAt: Timestamp;
  going: RsvpMemberRow[];
  maybe: RsvpMemberRow[];
  no: RsvpMemberRow[];
  unanswered: RsvpMemberRow[];
};

/** 단일 일정 기준 참석·미응답 멤버 목록(운영진용) */
export async function getFixtureRsvpBreakdown(teamId: string, fixtureId: string): Promise<FixtureRsvpBreakdown | null> {
  const tid = teamId.trim();
  const fid = fixtureId.trim();
  if (!tid || !fid) return null;
  const fSnap = await getDoc(doc(db, "teams", tid, COL, fid));
  if (!fSnap.exists()) return null;
  const fd = fSnap.data() as Record<string, unknown>;
  const title = asStr(fd.title) || "팀 일정";
  const startAt = fd.startAt instanceof Timestamp ? fd.startAt : Timestamp.now();

  const activeUids = await listActiveMemberProfileUidsForRsvp(tid);
  const pSnap = await getDocs(collection(db, "teams", tid, COL, fid, "participants"));
  const statusByUid = new Map<string, RSVPStatus>();
  pSnap.forEach((d) => {
    const st = (d.data() as { status?: unknown }).status;
    if (st === "going" || st === "maybe" || st === "no") statusByUid.set(d.id, st);
  });

  const goingUids: string[] = [];
  const maybeUids: string[] = [];
  const noUids: string[] = [];
  const unansweredUids: string[] = [];

  for (const uid of activeUids) {
    const st = statusByUid.get(uid);
    if (st === "going") goingUids.push(uid);
    else if (st === "maybe") maybeUids.push(uid);
    else if (st === "no") noUids.push(uid);
    else unansweredUids.push(uid);
  }

  const [going, maybe, no, unanswered] = await Promise.all([
    enrichMemberRows(goingUids),
    enrichMemberRows(maybeUids),
    enrichMemberRows(noUids),
    enrichMemberRows(unansweredUids),
  ]);

  return { fixtureId: fid, title, startAt, going, maybe, no, unanswered };
}
