/**
 * 🔥 Match Service - 경기 매칭 관련 Firestore 작업
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  setDoc,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Match, CreateMatchInput, MatchRequest } from "@/types/match";
import { toDate } from "@/utils/timeUtils";
import { cleanFirestoreData } from "@/utils/firestoreHelpers";
import { createActivity } from "@/services/activity/activityFactory";

async function readUserActor(uid: string): Promise<{
  actorName?: string;
  actorPhotoUrl?: string;
}> {
  if (!uid) return {};
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return {};
    const u = snap.data() as {
      displayName?: string;
      photoURL?: string;
      nickname?: string;
    };
    const actorName =
      (typeof u.displayName === "string" && u.displayName.trim()) ||
      (typeof u.nickname === "string" && u.nickname.trim()) ||
      undefined;
    const actorPhotoUrl =
      typeof u.photoURL === "string" && u.photoURL.trim()
        ? u.photoURL.trim()
        : undefined;
    return { actorName, actorPhotoUrl };
  } catch {
    return {};
  }
}

function matchTimeToMinutes(time: string | undefined): number {
  const [h = "0", m = "0"] = (time || "00:00").split(":");
  return Number(h) * 60 + Number(m);
}

function sortMatchesByDateAndTime(list: Match[]): Match[] {
  return [...list].sort((a, b) => {
    const da = toDate(a.date).getTime();
    const db = toDate(b.date).getTime();
    if (da !== db) return da - db;
    return matchTimeToMinutes(a.time) - matchTimeToMinutes(b.time);
  });
}

/**
 * 경기 매칭글 생성
 */
export async function createMatch(
  input: CreateMatchInput,
  authorId: string
): Promise<string> {
  const matchRegion = (input.matchRegion || input.region || "").trim();
  const matchData = cleanFirestoreData({
    teamId: input.teamId,
    teamName: input.teamName,
    authorId,
    sport: input.sport, // 🔥 필수 필드: 팀의 sportType에서 복사됨
    date: Timestamp.fromDate(input.date),
    time: input.time,
    matchRegion,
    region: matchRegion,
    ...(input.stadium?.trim() ? { stadium: input.stadium.trim() } : {}),
    level: input.level,
    ...(typeof input.fee === "number" && Number.isFinite(input.fee) ? { fee: input.fee } : {}),
    contact: input.contact,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    status: "open" as const,
    createdAt: serverTimestamp(),
    ...(input.stadiumLat != null &&
    input.stadiumLng != null &&
    Number.isFinite(input.stadiumLat) &&
    Number.isFinite(input.stadiumLng)
      ? { stadiumLat: input.stadiumLat, stadiumLng: input.stadiumLng }
      : {}),
    ...(input.contactDetail?.trim()
      ? { contactDetail: input.contactDetail.trim() }
      : {}),
  });

  const docRef = await addDoc(collection(db, "matches"), matchData);

  try {
    const d = input.date;
    const dateLabel = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await createActivity({
      type: "match_created",
      refType: "match",
      refId: docRef.id,
      authorId,
      title: `${input.teamName} · ${dateLabel} ${input.time} 매칭`,
      summary:
        input.description?.trim() ||
        `${matchRegion}${input.stadium ? ` · ${input.stadium}` : ""}`,
      sport: input.sport,
    });
  } catch (e) {
    console.warn("⚠️ [createMatch] activities 기록 실패 (무시):", e);
  }

  // 매칭글 삭제 구현 시: deleteActivitiesForRef(docRef.id, "matches") (+ 필요 시 deleteActivitiesByRefIdLegacy)

  return docRef.id;
}

/**
 * 경기 매칭글 조회 (전체)
 */
export async function getMatches(options?: {
  status?: "open" | "matched" | "finished";
  sport?: string; // 🔥 멀티 스포츠 필터 추가
  region?: string; // 🔥 지역 필터 추가
  date?: Date; // 특정 날짜의 매칭만 조회
  limit?: number;
}): Promise<Match[]> {
  const conditions: any[] = [];
  
  if (options?.status) {
    conditions.push(where("status", "==", options.status));
  }
  
  if (options?.sport) {
    conditions.push(where("sport", "==", options.sport));
  }
  
  if (options?.region) {
    conditions.push(where("matchRegion", "==", options.region));
  }
  
  if (options?.date) {
    const startOfDay = Timestamp.fromDate(new Date(options.date.setHours(0, 0, 0, 0)));
    const endOfDay = Timestamp.fromDate(new Date(options.date.setHours(23, 59, 59, 999)));
    conditions.push(where("date", ">=", startOfDay));
    conditions.push(where("date", "<=", endOfDay));
  }
  
  conditions.push(orderBy("date", "asc"));
  
  if (options?.limit) {
    conditions.push(limit(options.limit));
  }

  const q = query(collection(db, "matches"), ...conditions);
  const snapshot = await getDocs(q);

  const list = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];
  return sortMatchesByDateAndTime(list);
}

/**
 * 특정 경기 매칭글 조회
 */
export async function getMatch(matchId: string): Promise<Match | null> {
  const docRef = doc(db, "matches", matchId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Match;
}

/**
 * 경기 매칭 신청
 * @param applicant 신청자(팀 관리자) — 있으면 공개 피드 activity + 호스트 알림 기록
 */
export async function requestMatch(
  matchId: string,
  teamId: string,
  teamName: string,
  message?: string,
  applicant?: { uid: string; displayName?: string | null; photoURL?: string | null }
): Promise<string> {
  const dedupeApplicant = applicant?.uid?.trim() || "anonymous";
  const dedupeRequestId = `${matchId}_${teamId}_${dedupeApplicant}`
    .replace(/[^\w-]/g, "_")
    .slice(0, 220);
  const dedupeRef = doc(db, "match_requests", dedupeRequestId);
  const existing = await getDoc(dedupeRef);
  if (existing.exists()) {
    const status = String(existing.data()?.status ?? "");
    if (status === "pending" || status === "accepted") {
      return existing.id;
    }
  }

  const requestData = {
    matchId,
    teamId,
    teamName,
    message,
    status: "pending" as const,
    createdAt: serverTimestamp(),
    ...(applicant?.uid ? { applicantUid: applicant.uid } : {}),
  };

  await setDoc(dedupeRef, requestData, { merge: true });
  const docRef = dedupeRef;

  if (!applicant?.uid) {
    return docRef.id;
  }

  try {
    const match = await getMatch(matchId);
    if (!match?.authorId || match.authorId === applicant.uid) {
      return docRef.id;
    }

    const applicantName = applicant.displayName?.trim() || undefined;
    const activityTitle =
      applicantName != null && applicantName.length > 0
        ? `${applicantName}님 · ${teamName} 팀 매칭 참여 신청`
        : `${teamName} 팀이 매칭 참여를 신청했습니다`;
    const notifyMessage =
      applicantName != null && applicantName.length > 0
        ? `${applicantName}님이 ${teamName} 팀으로 매칭 참여를 신청했습니다.`
        : `${teamName} 팀이 매칭 참여를 신청했습니다.`;

    const applicantPhoto =
      typeof applicant.photoURL === "string" && applicant.photoURL.trim()
        ? applicant.photoURL.trim()
        : undefined;

    await createActivity({
      type: "match_join_requested",
      refId: matchId,
      authorId: applicant.uid,
      authorName: applicantName || `${teamName} 팀`,
      ...(applicantPhoto && { authorPhotoUrl: applicantPhoto }),
      title: activityTitle,
      summary: message?.trim() || undefined,
      sport: match.sport,
    });

    await addDoc(
      collection(db, "notifications"),
      cleanFirestoreData({
        userId: match.authorId,
        type: "MATCH_JOIN_REQUESTED",
        title: "매칭 참여 신청",
        message: notifyMessage,
        actorId: applicant.uid,
        ...(applicantName && { actorName: applicantName }),
        teamId,
        teamName,
        target: { screen: "match" as const, id: matchId },
        isRead: false,
        createdAt: serverTimestamp(),
        createdAtMillis: Date.now(),
        payload: {
          matchId,
          teamId,
          requestId: docRef.id,
          applicantUid: applicant.uid,
        },
      })
    );
  } catch (e) {
    console.warn("⚠️ [requestMatch] activity/notification 기록 실패 (신청은 완료됨):", e);
  }

  return docRef.id;
}

/**
 * 경기 매칭 신청 목록 조회
 */
export async function getMatchRequests(matchId: string): Promise<MatchRequest[]> {
  const q = query(
    collection(db, "match_requests"),
    where("matchId", "==", matchId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MatchRequest[];
}

/**
 * 호스트가 특정 신청을 승인
 * - matches.status: open -> matched
 * - matches.opponentTeamId/opponentTeamName 설정
 * - 선택된 요청 accepted, 나머지 pending은 rejected
 */
export async function acceptMatchRequest(input: {
  matchId: string;
  requestId: string;
  opponentTeamId: string;
  opponentTeamName: string;
}): Promise<void> {
  const matchRef = doc(db, "matches", input.matchId);
  const requestsQ = query(collection(db, "match_requests"), where("matchId", "==", input.matchId));
  const requestsSnap = await getDocs(requestsQ);

  const acceptedSnap = requestsSnap.docs.find((d) => d.id === input.requestId);
  const acceptedRaw = acceptedSnap?.data() as {
    applicantUid?: string;
    teamName?: string;
    status?: string;
  } | undefined;

  const supersededRows = requestsSnap.docs
    .filter((d) => d.id !== input.requestId && d.data().status === "pending")
    .map((d) => {
      const dd = d.data() as { applicantUid?: string; teamName?: string };
      return { requestDocId: d.id, applicantUid: dd.applicantUid, teamName: dd.teamName };
    });

  const batch = writeBatch(db);
  batch.update(matchRef, {
    opponentTeamId: input.opponentTeamId,
    opponentTeamName: input.opponentTeamName,
    status: "matched",
    updatedAt: serverTimestamp(),
  });

  requestsSnap.docs.forEach((requestDoc) => {
    const nextStatus = requestDoc.id === input.requestId ? "accepted" : "rejected";
    batch.update(requestDoc.ref, {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  await ensureMatchChatRoom(input.matchId);

  const match = await getMatch(input.matchId);
  if (!match) return;

  const hostActor = await readUserActor(match.authorId);

  try {
    await createActivity({
      type: "match_confirmed",
      refType: "match",
      refId: input.matchId,
      authorId: match.authorId,
      authorName: hostActor.actorName || match.teamName,
      ...(hostActor.actorPhotoUrl && { authorPhotoUrl: hostActor.actorPhotoUrl }),
      title: `${match.teamName} vs ${input.opponentTeamName} 매칭이 확정되었습니다`,
      summary:
        match.description?.trim() ||
        `${match.region}${match.stadium ? ` · ${match.stadium}` : ""}`,
      sport: match.sport,
    });
  } catch (e) {
    console.warn("⚠️ [acceptMatchRequest] activities 기록 실패:", e);
  }

  const acceptedApplicant = acceptedRaw?.applicantUid;
  if (
    acceptedApplicant &&
    typeof acceptedApplicant === "string" &&
    acceptedApplicant !== match.authorId
  ) {
    try {
      await addDoc(
        collection(db, "notifications"),
        cleanFirestoreData({
          userId: acceptedApplicant,
          type: "MATCH_JOIN_ACCEPTED",
          title: "매칭이 확정되었습니다",
          message: hostActor.actorName
            ? `${hostActor.actorName}님이 ${match.teamName}과(와) ${input.opponentTeamName}의 매칭을 확정했습니다.`
            : `호스트가 ${match.teamName}과(와) ${input.opponentTeamName}의 매칭을 확정했습니다.`,
          actorId: match.authorId,
          ...(hostActor.actorName && { actorName: hostActor.actorName }),
          ...(hostActor.actorPhotoUrl && { actorPhotoUrl: hostActor.actorPhotoUrl }),
          teamId: match.teamId,
          teamName: match.teamName,
          target: { screen: "match" as const, id: input.matchId },
          isRead: false,
          createdAt: serverTimestamp(),
          createdAtMillis: Date.now(),
          payload: {
            matchId: input.matchId,
            requestId: input.requestId,
          },
        })
      );
    } catch (e) {
      console.warn("⚠️ [acceptMatchRequest] 승인 알림 실패:", e);
    }
  }

  for (const row of supersededRows) {
    const uid = row.applicantUid;
    if (!uid || typeof uid !== "string" || uid === match.authorId) continue;
    if (uid === acceptedApplicant) continue;
    try {
      await addDoc(
        collection(db, "notifications"),
        cleanFirestoreData({
          userId: uid,
          type: "MATCH_JOIN_REJECTED",
          title: "매칭 신청이 마감되었습니다",
          message: hostActor.actorName
            ? `${hostActor.actorName}님이 다른 팀과 매칭을 확정해 이번 신청은 자동으로 종료되었습니다.`
            : "호스트가 다른 팀과 매칭을 확정하여 이번 신청은 자동으로 종료되었습니다.",
          actorId: match.authorId,
          ...(hostActor.actorName && { actorName: hostActor.actorName }),
          ...(hostActor.actorPhotoUrl && { actorPhotoUrl: hostActor.actorPhotoUrl }),
          teamId: match.teamId,
          teamName: match.teamName,
          target: { screen: "match" as const, id: input.matchId },
          isRead: false,
          createdAt: serverTimestamp(),
          createdAtMillis: Date.now(),
          payload: {
            matchId: input.matchId,
            requestId: row.requestDocId,
            reason: "superseded",
          },
        })
      );
    } catch (e) {
      console.warn("⚠️ [acceptMatchRequest] 자동 거절 알림 실패:", e);
    }
  }
}

/**
 * 호스트가 특정 신청만 거절 (매칭 글은 open 유지, 다른 pending 신청은 그대로)
 */
export async function rejectMatchRequest(input: {
  matchId: string;
  requestId: string;
}): Promise<void> {
  const requestRef = doc(db, "match_requests", input.requestId);
  const snap = await getDoc(requestRef);
  if (!snap.exists()) throw new Error("신청을 찾을 수 없습니다.");
  const data = snap.data();
  if (data.matchId !== input.matchId) throw new Error("잘못된 신청입니다.");
  if (data.status !== "pending") throw new Error("이미 처리된 신청입니다.");

  const applicantUid =
    typeof data.applicantUid === "string" ? data.applicantUid : undefined;
  const matchId = data.matchId as string;
  const teamName =
    typeof data.teamName === "string" ? data.teamName : "신청 팀";

  await updateDoc(requestRef, {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });

  if (applicantUid) {
    try {
      const match = await getMatch(matchId);
      const hostActor = match ? await readUserActor(match.authorId) : {};
      await addDoc(
        collection(db, "notifications"),
        cleanFirestoreData({
          userId: applicantUid,
          type: "MATCH_JOIN_REJECTED",
          title: "매칭 신청이 거절되었습니다",
          message: match
            ? hostActor.actorName
              ? `${hostActor.actorName}님이 ${teamName}의 매칭 참여 신청을 거절했습니다.`
              : `호스트가 ${teamName}의 매칭 참여 신청을 거절했습니다.`
            : `매칭 참여 신청이 거절되었습니다.`,
          ...(match?.authorId && { actorId: match.authorId }),
          ...(hostActor.actorName && { actorName: hostActor.actorName }),
          ...(hostActor.actorPhotoUrl && { actorPhotoUrl: hostActor.actorPhotoUrl }),
          ...(match?.teamId && { teamId: match.teamId }),
          ...(match?.teamName && { teamName: match.teamName }),
          target: { screen: "match" as const, id: matchId },
          isRead: false,
          createdAt: serverTimestamp(),
          createdAtMillis: Date.now(),
          payload: {
            matchId,
            requestId: input.requestId,
            reason: "rejected",
          },
        })
      );
    } catch (e) {
      console.warn("⚠️ [rejectMatchRequest] 거절 알림 실패:", e);
    }
  }
}

async function ensureMatchChatRoom(matchId: string): Promise<string> {
  const matchSnap = await getDoc(doc(db, "matches", matchId));
  if (!matchSnap.exists()) return "";

  const matchData = matchSnap.data() as {
    teamId: string;
    opponentTeamId?: string;
    teamName?: string;
    opponentTeamName?: string;
  };

  const hostTeamId = matchData.teamId;
  const opponentTeamId = matchData.opponentTeamId;
  if (!hostTeamId || !opponentTeamId) return "";

  const [hostMembersSnap, opponentMembersSnap] = await Promise.all([
    getDocs(collection(db, "teams", hostTeamId, "members")),
    getDocs(collection(db, "teams", opponentTeamId, "members")),
  ]);

  const memberUids = Array.from(
    new Set([
      ...hostMembersSnap.docs.map((d) => d.id),
      ...opponentMembersSnap.docs.map((d) => d.id),
    ])
  ).filter(Boolean);

  const authorId = String((matchSnap.data() as { authorId?: string }).authorId || "").trim();

  const roomId = `match_${matchId}`;
  await setDoc(
    doc(db, "chatRooms", roomId),
    {
      type: "match",
      matchId,
      ...(authorId ? { authorId } : {}),
      hostTeamId,
      opponentTeamId,
      hostTeamName: matchData.teamName || "",
      opponentTeamName: matchData.opponentTeamName || "",
      teamParticipants: [hostTeamId, opponentTeamId],
      members: memberUids,
      participants: memberUids,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
    },
    { merge: true }
  );

  return roomId;
}

/**
 * 오픈 매칭(상대 미확정) 직후 — 호스트 팀 멤버만 포함한 채팅방을 만들어 두고,
 * 이후 `ensureMatchChatRoom`이 상대 확정 시 merge 로 확장한다.
 */
export async function ensureOpenMatchHostChatRoom(matchId: string): Promise<string> {
  const matchSnap = await getDoc(doc(db, "matches", matchId));
  if (!matchSnap.exists()) return "";

  const matchData = matchSnap.data() as {
    teamId?: string;
    teamName?: string;
    opponentTeamId?: string;
  };

  const hostTeamId = matchData.teamId;
  if (!hostTeamId) return "";

  if (matchData.opponentTeamId) {
    return ensureMatchChatRoom(matchId);
  }

  const hostMembersSnap = await getDocs(collection(db, "teams", hostTeamId, "members"));
  const memberUids = hostMembersSnap.docs.map((d) => d.id).filter(Boolean);

  const authorId = String((matchSnap.data() as { authorId?: string }).authorId || "").trim();

  const roomId = `match_${matchId}`;
  await setDoc(
    doc(db, "chatRooms", roomId),
    {
      type: "match",
      matchId,
      ...(authorId ? { authorId } : {}),
      hostTeamId,
      opponentTeamId: "",
      hostTeamName: matchData.teamName || "",
      opponentTeamName: "",
      teamParticipants: [hostTeamId],
      members: memberUids,
      participants: memberUids,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
    },
    { merge: true }
  );

  return roomId;
}

/** 팀 멤버 목록 — 비소속자는 Rules상 조회 불가 → 실패 시 빈 배열 */
async function tryCollectTeamMemberUids(teamId: string): Promise<string[]> {
  const tid = teamId.trim();
  if (!tid) return [];
  try {
    const snap = await getDocs(collection(db, "teams", tid, "members"));
    return snap.docs.map((d) => d.id).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 매칭 글 스레드(chatRooms/match_{matchId}) — 문의자·호스트·양 팀 멤버가 읽고 쓸 수 있도록 문서를 merge 한다.
 * 기존 방이 없거나 문의자가 members에 없으면 여기서 통합한다.
 */
export async function ensureMatchInquiryChatRoom(
  matchId: string,
  viewerUid: string
): Promise<string> {
  const mid = matchId.trim();
  const uid = viewerUid.trim();
  if (!mid || !uid) {
    throw new Error("매칭 또는 로그인 정보가 없습니다.");
  }

  const matchSnap = await getDoc(doc(db, "matches", mid));
  if (!matchSnap.exists()) {
    throw new Error("매칭을 찾을 수 없습니다.");
  }

  const match = matchSnap.data() as Match;
  const authorId = (match.authorId || "").trim();
  const hostTeamId = (match.teamId || "").trim();
  if (!authorId || !hostTeamId) {
    throw new Error("매칭 정보가 불완전합니다.");
  }

  const roomId = `match_${mid}`;
  const roomRef = doc(db, "chatRooms", roomId);
  const roomSnap = await getDoc(roomRef);
  const existing = roomSnap.exists() ? roomSnap.data() : {};

  const memberSet = new Set<string>();
  const pushMembers = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      const s = String(x || "").trim();
      if (s) memberSet.add(s);
    }
  };
  pushMembers(existing.members);
  pushMembers(existing.participants);
  memberSet.add(authorId);
  memberSet.add(uid);

  (await tryCollectTeamMemberUids(hostTeamId)).forEach((mid) => memberSet.add(mid));

  const oppId = (match.opponentTeamId || "").trim();
  if (oppId) {
    (await tryCollectTeamMemberUids(oppId)).forEach((mid) => memberSet.add(mid));
  }

  const members = [...memberSet].filter(Boolean);
  const teamParticipants = [hostTeamId, oppId].filter(Boolean);
  const prevTp = existing.teamParticipants;
  const mergedTp =
    Array.isArray(prevTp) && prevTp.length > 0
      ? [...new Set([...(prevTp as string[]), ...teamParticipants])]
      : teamParticipants;

  await setDoc(
    roomRef,
    {
      type: "match",
      matchId: mid,
      authorId,
      hostTeamId,
      opponentTeamId: oppId || "",
      hostTeamName: match.teamName || "",
      opponentTeamName: match.opponentTeamName || "",
      teamParticipants: mergedTp,
      members,
      participants: members,
      updatedAt: serverTimestamp(),
      ...(roomSnap.exists()
        ? {}
        : {
            createdAt: serverTimestamp(),
            lastMessage: "",
            lastMessageAt: serverTimestamp(),
          }),
    },
    { merge: true }
  );

  return roomId;
}

export async function submitMatchResult(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
}): Promise<void> {
  const matchRef = doc(db, "matches", input.matchId);

  await runTransaction(db, async (tx) => {
    const matchSnap = await tx.get(matchRef);
    if (!matchSnap.exists()) throw new Error("경기를 찾을 수 없습니다.");

    const match = matchSnap.data() as {
      teamId: string;
      opponentTeamId?: string;
      status: "open" | "matched" | "finished";
    };

    if (!match.opponentTeamId) throw new Error("상대팀이 확정되지 않았습니다.");
    if (match.status === "finished") throw new Error("이미 결과가 입력된 경기입니다.");

    const homeTeamRef = doc(db, "teams", match.teamId);
    const awayTeamRef = doc(db, "teams", match.opponentTeamId);

    const [homeTeamSnap, awayTeamSnap] = await Promise.all([tx.get(homeTeamRef), tx.get(awayTeamRef)]);
    if (!homeTeamSnap.exists() || !awayTeamSnap.exists()) {
      throw new Error("팀 정보를 찾을 수 없습니다.");
    }

    const homeTeamData = homeTeamSnap.data() as any;
    const awayTeamData = awayTeamSnap.data() as any;
    const homeStats = homeTeamData.stats || {};
    const awayStats = awayTeamData.stats || {};
    const homeForm = Array.isArray(homeTeamData.recentForm) ? homeTeamData.recentForm : [];
    const awayForm = Array.isArray(awayTeamData.recentForm) ? awayTeamData.recentForm : [];

    let winnerTeamId: string | null = null;
    let homeResult: "W" | "D" | "L" = "D";
    let awayResult: "W" | "D" | "L" = "D";
    let homePoints = 1;
    let awayPoints = 1;

    if (input.homeScore > input.awayScore) {
      winnerTeamId = match.teamId;
      homeResult = "W";
      awayResult = "L";
      homePoints = 3;
      awayPoints = 0;
    } else if (input.homeScore < input.awayScore) {
      winnerTeamId = match.opponentTeamId;
      homeResult = "L";
      awayResult = "W";
      homePoints = 0;
      awayPoints = 3;
    }

    tx.update(matchRef, {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      winnerTeamId,
      status: "finished",
      updatedAt: serverTimestamp(),
    });

    tx.set(
      homeTeamRef,
      {
        stats: {
          games: Number(homeStats.games || 0) + 1,
          wins: Number(homeStats.wins || 0) + (homeResult === "W" ? 1 : 0),
          draws: Number(homeStats.draws || 0) + (homeResult === "D" ? 1 : 0),
          losses: Number(homeStats.losses || 0) + (homeResult === "L" ? 1 : 0),
          goalsFor: Number(homeStats.goalsFor || 0) + input.homeScore,
          goalsAgainst: Number(homeStats.goalsAgainst || 0) + input.awayScore,
          goalDiff:
            (Number(homeStats.goalsFor || 0) + input.homeScore) -
            (Number(homeStats.goalsAgainst || 0) + input.awayScore),
          points: Number(homeStats.points || 0) + homePoints,
          winRate:
            ((Number(homeStats.wins || 0) + (homeResult === "W" ? 1 : 0)) /
              (Number(homeStats.games || 0) + 1)) *
            100,
        },
        recentForm: [homeResult, ...homeForm].slice(0, 5),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      awayTeamRef,
      {
        stats: {
          games: Number(awayStats.games || 0) + 1,
          wins: Number(awayStats.wins || 0) + (awayResult === "W" ? 1 : 0),
          draws: Number(awayStats.draws || 0) + (awayResult === "D" ? 1 : 0),
          losses: Number(awayStats.losses || 0) + (awayResult === "L" ? 1 : 0),
          goalsFor: Number(awayStats.goalsFor || 0) + input.awayScore,
          goalsAgainst: Number(awayStats.goalsAgainst || 0) + input.homeScore,
          goalDiff:
            (Number(awayStats.goalsFor || 0) + input.awayScore) -
            (Number(awayStats.goalsAgainst || 0) + input.homeScore),
          points: Number(awayStats.points || 0) + awayPoints,
          winRate:
            ((Number(awayStats.wins || 0) + (awayResult === "W" ? 1 : 0)) /
              (Number(awayStats.games || 0) + 1)) *
            100,
        },
        recentForm: [awayResult, ...awayForm].slice(0, 5),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}
