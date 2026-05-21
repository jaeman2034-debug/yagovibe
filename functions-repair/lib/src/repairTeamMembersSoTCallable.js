"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairTeamMembersSoTFromIndex = void 0;
/**
 * team_members 역인덱스에는 있으나 SoT인 teams/{teamId}/members/{uid}가 없는 경우 복구.
 * (콘솔·구버전 플로우 등으로 인덱스만 남은 불일치 해소)
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
const REGION = "asia-northeast3";
const HUB_STAFF_ROLES = new Set([
    "owner",
    "manager",
    "coach",
    "admin",
    "vice",
    "부팀장",
]);
function requireAuthUid(request) {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    return uid;
}
function assertNonEmptyString(v, field) {
    if (typeof v !== "string" || !v.trim()) {
        throw new https_1.HttpsError("invalid-argument", `${field}가 필요합니다.`);
    }
    return v.trim();
}
function assertActorIsHubStaff(actorSnap) {
    if (!actorSnap.exists) {
        throw new https_1.HttpsError("permission-denied", "팀 멤버가 아닙니다.");
    }
    const role = actorSnap.get("role")?.trim();
    const status = actorSnap.get("status")?.trim();
    const accessLevel = actorSnap.get("accessLevel")?.trim();
    if (status && status !== "active") {
        throw new https_1.HttpsError("permission-denied", "비활성 멤버입니다.");
    }
    const roleLc = role ? role.toLowerCase() : "";
    const staffByRole = !!role && (HUB_STAFF_ROLES.has(role) || HUB_STAFF_ROLES.has(roleLc));
    const staffByAccess = accessLevel === "ADMIN";
    if (!staffByRole && !staffByAccess) {
        throw new https_1.HttpsError("permission-denied", "팀 운영 권한이 없습니다.");
    }
}
exports.repairTeamMembersSoTFromIndex = (0, https_1.onCall)({ region: REGION, maxInstances: 10 }, async (request) => {
    const actorUid = requireAuthUid(request);
    const raw = request.data;
    if (!raw || typeof raw !== "object") {
        throw new https_1.HttpsError("invalid-argument", "요청 본문이 필요합니다.");
    }
    const teamId = assertNonEmptyString(raw.teamId, "teamId");
    const firestore = (0, firestore_1.getFirestore)();
    const actorRef = firestore.doc(`teams/${teamId}/members/${actorUid}`);
    const actorSnap = await actorRef.get();
    assertActorIsHubStaff(actorSnap);
    const indexSnap = await firestore.collection("team_members").where("teamId", "==", teamId).get();
    let repaired = 0;
    let skipped = 0;
    for (const doc of indexSnap.docs) {
        const d = doc.data();
        const userId = String(d.userId || d.uid || "").trim();
        if (!userId) {
            skipped += 1;
            continue;
        }
        const st = d.status;
        if (st && st !== "active") {
            skipped += 1;
            continue;
        }
        const memRef = firestore.doc(`teams/${teamId}/members/${userId}`);
        const memSnap = await memRef.get();
        if (memSnap.exists) {
            skipped += 1;
            continue;
        }
        const displayForMember = (typeof d.name === "string" && d.name.trim()) ||
            (typeof d.displayName === "string" && d.displayName.trim()) ||
            (typeof d.userName === "string" && d.userName.trim()) ||
            "이름 없음";
        const emailForMember = (typeof d.email === "string" && d.email.trim()) ||
            (typeof d.userEmail === "string" && d.userEmail.trim()) ||
            "";
        const memberWrite = {
            uid: userId,
            userId,
            role: (typeof d.role === "string" && d.role.trim()) || "member",
            status: "active",
            joinedAt: d.joinedAt || firestore_1.FieldValue.serverTimestamp(),
            displayName: displayForMember,
            userName: displayForMember,
            name: displayForMember,
            repairedFromTeamMembersIndex: true,
            repairedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (emailForMember) {
            memberWrite.email = emailForMember;
            memberWrite.userEmail = emailForMember;
        }
        await memRef.set(memberWrite, { merge: true });
        repaired += 1;
    }
    const membersCol = firestore.collection(`teams/${teamId}/members`);
    const memberCount = (await membersCol.get()).size;
    await firestore.doc(`teams/${teamId}`).set({
        memberCount,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    firebase_functions_1.logger.info("[repairTeamMembersSoTFromIndex] ok", {
        teamId,
        actorUid,
        repaired,
        skipped,
        memberCount,
    });
    return { ok: true, repaired, skipped, memberCount };
});
