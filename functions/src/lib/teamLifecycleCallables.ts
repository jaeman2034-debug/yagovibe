/**
 * 팀·아카데미 생성 / 선수 추가 / 부모–선수 연결 — Callable (Admin SDK, Rules 우회)
 *
 * 클라이언트에서 members·parentLinks 등을 직접 조립하지 않도록 원자 처리.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const REGION = "asia-northeast3";

const TEAM_ROLES_STAFF = new Set(["owner", "manager", "coach"]);

type TeamType = "normal" | "academy";
type SportTypeInput = string;
type AgeGroup = "U-10" | "U-12" | "U-15" | "U-18";
type TrainingLevel = "beginner" | "intermediate" | "elite";
type ParentRelation = "father" | "mother" | "guardian";

export interface CreateTeamInput {
  name: string;
  region: string;
  shortName?: string | null;
  logoUrl?: string | null;
  type: TeamType;
  sportType: SportTypeInput;
  associationId?: string | null;
  academyMeta?: {
    ageGroup: AgeGroup;
    trainingLevel: TrainingLevel;
    recruitOpen: boolean;
    mainCoachUserId?: string | null;
    description?: string;
  };
}

export interface AddPlayerToTeamInput {
  teamId: string;
  playerUserId: string;
  profile: {
    name: string;
    birthYear: number;
    position?: string;
    uniformNumber?: number;
    emergencyContact?: string;
    medicalNote?: string;
  };
}

export interface InviteParentAndLinkPlayerInput {
  teamId: string;
  parentUserId: string;
  playerUserId: string;
  relation: ParentRelation;
  parentNote?: string;
}

function db() {
  return getFirestore();
}

function requireAuthUid(request: { auth?: { uid?: string } }): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  return uid;
}

function assertNonEmptyString(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) {
    throw new HttpsError("invalid-argument", `${field}가 필요합니다.`);
  }
  return v.trim();
}

function validateCreateTeamInput(raw: unknown): CreateTeamInput {
  if (!raw || typeof raw !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }
  const d = raw as Record<string, unknown>;
  const name = assertNonEmptyString(d.name, "name");
  const region = assertNonEmptyString(d.region, "region");
  const type = d.type as TeamType;
  if (type !== "normal" && type !== "academy") {
    throw new HttpsError("invalid-argument", "type은 normal 또는 academy여야 합니다.");
  }
  const sportType = assertNonEmptyString(d.sportType, "sportType");
  const shortName = d.shortName == null ? null : typeof d.shortName === "string" ? d.shortName : null;
  const logoUrl = d.logoUrl == null ? null : typeof d.logoUrl === "string" ? d.logoUrl : null;
  const associationId =
    d.associationId == null || d.associationId === ""
      ? null
      : assertNonEmptyString(d.associationId, "associationId");

  const academyMeta = d.academyMeta as CreateTeamInput["academyMeta"] | undefined;
  if (type === "academy") {
    if (!academyMeta || typeof academyMeta !== "object") {
      throw new HttpsError("invalid-argument", "academy 타입에는 academyMeta가 필요합니다.");
    }
    const ag = academyMeta.ageGroup;
    const tl = academyMeta.trainingLevel;
    if (!["U-10", "U-12", "U-15", "U-18"].includes(ag as string)) {
      throw new HttpsError("invalid-argument", "ageGroup이 올바르지 않습니다.");
    }
    if (!["beginner", "intermediate", "elite"].includes(tl as string)) {
      throw new HttpsError("invalid-argument", "trainingLevel이 올바르지 않습니다.");
    }
    if (typeof academyMeta.recruitOpen !== "boolean") {
      throw new HttpsError("invalid-argument", "recruitOpen(boolean)이 필요합니다.");
    }
  } else if (academyMeta) {
    throw new HttpsError("invalid-argument", "일반 팀에는 academyMeta를 넣을 수 없습니다.");
  }

  return {
    name,
    region,
    shortName,
    logoUrl,
    type,
    sportType,
    associationId,
    academyMeta: type === "academy" ? (d.academyMeta as CreateTeamInput["academyMeta"]) : undefined,
  };
}

/** 팀 생성 + 오너 members + (아카데미) academy/meta + users 팀 미러 */
export const createTeam = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const uid = requireAuthUid(request);
  const data = validateCreateTeamInput(request.data);

  const firestore = db();
  const teamRef = firestore.collection("teams").doc();
  const teamId = teamRef.id;
  const memberRef = teamRef.collection("members").doc(uid);
  const academyMetaRef = teamRef.collection("academy").doc("meta");
  const ownerMirrorRef = firestore.collection("users").doc(uid).collection("teamMemberships").doc(teamId);
  const ownerIndexRef = firestore.collection("team_members").doc(`${uid}_${teamId}`);
  const auditRef = teamRef.collection("auditLogs").doc();

  await firestore.runTransaction(async (tx) => {
    tx.set(teamRef, {
      name: data.name,
      region: data.region,
      baseRegion: data.region,
      shortName: data.shortName ?? null,
      logoUrl: data.logoUrl ?? null,
      type: data.type,
      sportType: data.sportType,
      associationId: data.associationId ?? null,
      ownerUserId: uid,
      /** 레거시 클라이언트·규칙 호환 (ownerUserId와 동일) */
      ownerUid: uid,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(memberRef, {
      userId: uid,
      role: "owner",
      status: "active",
      joinedAt: FieldValue.serverTimestamp(),
    });

    tx.set(ownerMirrorRef, {
      teamId,
      role: "owner",
      teamName: data.name,
      teamRegion: data.region,
      teamType: data.type,
      status: "active",
      sportType: data.sportType,
      joinedAt: FieldValue.serverTimestamp(),
    });

    tx.set(ownerIndexRef, {
      teamId,
      userId: uid,
      uid,
      role: "owner",
      status: "active",
      joinedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (data.type === "academy" && data.academyMeta) {
      tx.set(academyMetaRef, {
        ageGroup: data.academyMeta.ageGroup,
        trainingLevel: data.academyMeta.trainingLevel,
        recruitOpen: data.academyMeta.recruitOpen,
        mainCoachUserId: data.academyMeta.mainCoachUserId ?? null,
        description: data.academyMeta.description ?? "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(auditRef, {
      action: "create_team",
      actorUserId: uid,
      payload: { type: data.type, sportType: data.sportType },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  logger.info("[createTeam] ok", { teamId, uid, type: data.type });
  return { teamId };
});

export const addPlayerToTeam = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const uid = requireAuthUid(request);
  const raw = request.data as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }
  const teamId = assertNonEmptyString(raw.teamId, "teamId");
  const playerUserId = assertNonEmptyString(raw.playerUserId, "playerUserId");
  const profile = raw.profile as AddPlayerToTeamInput["profile"] | undefined;
  if (!profile || typeof profile !== "object") {
    throw new HttpsError("invalid-argument", "profile이 필요합니다.");
  }
  const name = assertNonEmptyString(profile.name, "profile.name");
  if (typeof profile.birthYear !== "number" || !Number.isFinite(profile.birthYear)) {
    throw new HttpsError("invalid-argument", "profile.birthYear가 필요합니다.");
  }

  const firestore = db();
  const teamRef = firestore.collection("teams").doc(teamId);
  const callerMemberRef = teamRef.collection("members").doc(uid);
  const playerMemberRef = teamRef.collection("members").doc(playerUserId);
  const playerProfileRef = teamRef.collection("playerProfiles").doc(playerUserId);
  const playerMirrorRef = firestore.collection("users").doc(playerUserId).collection("teamMemberships").doc(teamId);
  const auditRef = teamRef.collection("auditLogs").doc();

  await firestore.runTransaction(async (tx) => {
    const [teamSnap, callerSnap, playerMemberSnap] = await Promise.all([
      tx.get(teamRef),
      tx.get(callerMemberRef),
      tx.get(playerMemberRef),
    ]);

    if (!teamSnap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    if (!callerSnap.exists) throw new HttpsError("permission-denied", "팀 멤버가 아닙니다.");
    const callerRole = callerSnap.data()?.role as string | undefined;
    if (!callerRole || !TEAM_ROLES_STAFF.has(callerRole)) {
      throw new HttpsError("permission-denied", "선수 추가 권한이 없습니다.");
    }
    if (playerMemberSnap.exists) {
      throw new HttpsError("already-exists", "이미 팀에 등록된 사용자입니다.");
    }

    tx.set(playerMemberRef, {
      userId: playerUserId,
      role: "player",
      status: "active",
      playerProfile: {
        birthYear: profile.birthYear,
        position: profile.position ?? null,
        uniformNumber: profile.uniformNumber ?? null,
      },
      joinedAt: FieldValue.serverTimestamp(),
    });

    tx.set(playerProfileRef, {
      userId: playerUserId,
      name,
      birthYear: profile.birthYear,
      position: profile.position ?? null,
      uniformNumber: profile.uniformNumber ?? null,
      emergencyContact: profile.emergencyContact ?? null,
      medicalNote: profile.medicalNote ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const teamName = (teamSnap.data()?.name as string) || "";

    tx.set(playerMirrorRef, {
      teamId,
      role: "player",
      teamName,
      teamType: (teamSnap.data()?.type as string) || "normal",
      status: "active",
      sportType: (teamSnap.data()?.sportType as string) || "",
      joinedAt: FieldValue.serverTimestamp(),
    });

    tx.set(auditRef, {
      action: "add_player",
      actorUserId: uid,
      targetUserId: playerUserId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  logger.info("[addPlayerToTeam] ok", { teamId, playerUserId, actor: uid });
  return { ok: true };
});

export const inviteParentAndLinkPlayer = onCall({ region: REGION, maxInstances: 20 }, async (request) => {
  const uid = requireAuthUid(request);
  const raw = request.data as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") {
    throw new HttpsError("invalid-argument", "요청 본문이 필요합니다.");
  }
  const teamId = assertNonEmptyString(raw.teamId, "teamId");
  const parentUserId = assertNonEmptyString(raw.parentUserId, "parentUserId");
  const playerUserId = assertNonEmptyString(raw.playerUserId, "playerUserId");
  const relation = raw.relation as ParentRelation;
  if (!["father", "mother", "guardian"].includes(relation)) {
    throw new HttpsError("invalid-argument", "relation이 올바르지 않습니다.");
  }
  const parentNote = typeof raw.parentNote === "string" ? raw.parentNote : "";

  const firestore = db();
  const teamRef = firestore.collection("teams").doc(teamId);
  const callerMemberRef = teamRef.collection("members").doc(uid);
  const parentMemberRef = teamRef.collection("members").doc(parentUserId);
  const playerMemberRef = teamRef.collection("members").doc(playerUserId);
  const linkId = `${parentUserId}_${playerUserId}`;
  const parentLinkRef = teamRef.collection("parentLinks").doc(linkId);
  const parentMirrorRef = firestore.collection("users").doc(parentUserId).collection("teamMemberships").doc(teamId);
  const auditRef = teamRef.collection("auditLogs").doc();

  await firestore.runTransaction(async (tx) => {
    const teamSnap = await tx.get(teamRef);
    if (!teamSnap.exists) throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");

    const [callerSnap, playerSnap, parentSnap, linkSnap] = await Promise.all([
      tx.get(callerMemberRef),
      tx.get(playerMemberRef),
      tx.get(parentMemberRef),
      tx.get(parentLinkRef),
    ]);

    if (!callerSnap.exists) throw new HttpsError("permission-denied", "팀 멤버가 아닙니다.");
    const callerRole = callerSnap.data()?.role as string | undefined;
    if (!callerRole || !TEAM_ROLES_STAFF.has(callerRole)) {
      throw new HttpsError("permission-denied", "권한이 없습니다.");
    }

    if (!playerSnap.exists || playerSnap.data()?.role !== "player") {
      throw new HttpsError("failed-precondition", "해당 사용자는 팀의 선수 멤버가 아닙니다.");
    }

    if (linkSnap.exists) {
      throw new HttpsError("already-exists", "이미 연결된 보호자입니다.");
    }

    if (!parentSnap.exists) {
      const teamName = (teamSnap.data()?.name as string) || "";
      const teamType = (teamSnap.data()?.type as string) || "normal";
      const sportType = (teamSnap.data()?.sportType as string) || "";

      tx.set(parentMemberRef, {
        userId: parentUserId,
        role: "parent",
        status: "active",
        parentProfile: { note: parentNote },
        joinedAt: FieldValue.serverTimestamp(),
      });

      tx.set(parentMirrorRef, {
        teamId,
        role: "parent",
        teamName,
        teamType,
        status: "active",
        sportType,
        joinedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const prole = parentSnap.data()?.role as string | undefined;
      if (prole !== "parent") {
        throw new HttpsError("failed-precondition", "해당 사용자는 이미 다른 역할로 팀에 속해 있습니다.");
      }
    }

    tx.set(parentLinkRef, {
      parentUserId,
      playerUserId,
      relation,
      createdAt: FieldValue.serverTimestamp(),
    });

    tx.set(auditRef, {
      action: "link_parent_to_player",
      actorUserId: uid,
      targetUserId: parentUserId,
      playerUserId,
      relation,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  logger.info("[inviteParentAndLinkPlayer] ok", { teamId, parentUserId, playerUserId, actor: uid });
  return { ok: true, linkId };
});
