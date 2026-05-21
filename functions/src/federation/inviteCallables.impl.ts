import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import axios from "axios";
import { createHmac } from "node:crypto";

function onlyDigits(v: string): string {
  return String(v || "").replace(/\D+/g, "");
}

function isFederationManagerDoc(doc: any, uid: string): boolean {
  if (!doc || !uid) return false;
  const ownerUid = String(doc.ownerUid || doc.ownerId || "");
  if (ownerUid && ownerUid === uid) return true;
  const adminIds = Array.isArray(doc.adminIds) ? doc.adminIds : [];
  const adminUids = Array.isArray(doc.adminUids) ? doc.adminUids : [];
  const roleAdmins = Array.isArray(doc.roles?.admins) ? doc.roles.admins : [];
  const roleEditors = Array.isArray(doc.roles?.editors) ? doc.roles.editors : [];
  return [...adminIds, ...adminUids, ...roleAdmins, ...roleEditors].includes(uid);
}

export async function handleSendInviteSMS(request: CallableRequest<any>) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const phoneRaw = String((request.data as any)?.phone || "").trim();
  const federationId = String((request.data as any)?.federationId || "").trim();
  const role = String((request.data as any)?.role || "").trim();
  const inviteId = String((request.data as any)?.inviteId || "").trim();
  if (!phoneRaw || !federationId || !role) {
    throw new HttpsError("invalid-argument", "phone, federationId, role 값이 필요합니다.");
  }
  if (!["admin", "editor"].includes(role)) {
    throw new HttpsError("invalid-argument", "role은 admin/editor만 허용됩니다.");
  }

  const db = getFirestore();
  const fedSnap = await db.doc(`federations/${federationId}`).get();
  if (!fedSnap.exists) throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
  const fedData = fedSnap.data() || {};
  if (!isFederationManagerDoc(fedData, uid)) {
    throw new HttpsError("permission-denied", "초대 문자 발송 권한이 없습니다.");
  }

  const baseUrl = process.env.INVITE_BASE_URL || "https://yago.app";
  const invitePath = inviteId
    ? `/invite?id=${encodeURIComponent(inviteId)}&fid=${encodeURIComponent(federationId)}`
    : `/invite`;
  const inviteLink = `${baseUrl}${invitePath}`;
  const federationName = String((fedData as any).name || federationId);
  const message = `[YAGO] ${federationName} 운영진 초대\n${inviteLink}`;

  const serviceId = process.env.NAVER_SENS_SERVICE_ID || "";
  const accessKey = process.env.NAVER_SENS_ACCESS_KEY || "";
  const secretKey = process.env.NAVER_SENS_SECRET_KEY || "";
  const from = process.env.NAVER_SENS_FROM || "";
  if (!serviceId || !accessKey || !secretKey || !from) {
    throw new HttpsError("failed-precondition", "SMS 설정이 누락되었습니다.");
  }

  const timestamp = Date.now().toString();
  const method = "POST";
  const urlPath = `/sms/v2/services/${serviceId}/messages`;
  const signature = createHmac("sha256", secretKey)
    .update(`${method} ${urlPath}\n${timestamp}\n${accessKey}`)
    .digest("base64");

  const to = onlyDigits(phoneRaw);
  if (to.length < 10) throw new HttpsError("invalid-argument", "전화번호 형식이 올바르지 않습니다.");

  await axios.post(
    `https://sens.apigw.ntruss.com${urlPath}`,
    {
      type: "SMS",
      contentType: "COMM",
      countryCode: "82",
      from: onlyDigits(from),
      content: message,
      messages: [{ to, content: message }],
    },
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": accessKey,
        "x-ncp-apigw-signature-v2": signature,
      },
      timeout: 10000,
    }
  );

  return { success: true, inviteLink };
}

export async function handleAcceptFederationInviteById(request: CallableRequest<any>) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const inviteId = String((request.data as any)?.inviteId || "").trim();
  const federationIdFromClient = String((request.data as any)?.federationId || "").trim();
  if (!inviteId) throw new HttpsError("invalid-argument", "inviteId가 필요합니다.");

  const db = getFirestore();
  let inviteDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  if (federationIdFromClient) {
    const directRef = db.doc(`federations/${federationIdFromClient}/invites/${inviteId}`);
    const directSnap = await directRef.get();
    if (directSnap.exists) {
      inviteDoc = directSnap as FirebaseFirestore.QueryDocumentSnapshot;
    }
  }
  if (!inviteDoc) {
    // 구버전 링크(id만 전달) 차단: INTERNAL 대신 명확한 안내 메시지 반환
    throw new HttpsError(
      "invalid-argument",
      "초대 링크 형식이 오래되었습니다. 관리자에게서 새 초대 링크를 다시 받아주세요."
    );
  }
  const invite = inviteDoc.data() as any;
  if (String(invite.status || "") !== "pending") {
    throw new HttpsError("failed-precondition", "이미 사용되었거나 취소된 초대입니다.");
  }
  const expiresAt = invite.expiresAt;
  const expiresDate = expiresAt && typeof expiresAt.toDate === "function" ? expiresAt.toDate() : null;
  if (expiresDate && expiresDate.getTime() < Date.now()) {
    throw new HttpsError("deadline-exceeded", "초대가 만료되었습니다.");
  }

  const federationId = String(invite.federationId || inviteDoc.ref.parent.parent?.id || "").trim();
  if (!federationId) throw new HttpsError("failed-precondition", "초대에 federationId가 없습니다.");
  const role = String(invite.role || "editor") === "admin" ? "admin" : "editor";

  const authPhone = String(((request.auth as any)?.token?.phone_number as string) || "").replace(/\D+/g, "");
  const invitePhone = String(invite.phoneDigits || invite.phone || "").replace(/\D+/g, "");
  if (authPhone && invitePhone && authPhone !== invitePhone) {
    throw new HttpsError("permission-denied", "초대받은 전화번호와 로그인 전화번호가 일치하지 않습니다.");
  }

  const patch: Record<string, any> = { updatedAt: FieldValue.serverTimestamp() };
  if (role === "admin") {
    patch["roles.admins"] = FieldValue.arrayUnion(uid);
    patch.adminIds = FieldValue.arrayUnion(uid);
    patch.adminUids = FieldValue.arrayUnion(uid);
  } else {
    patch["roles.editors"] = FieldValue.arrayUnion(uid);
    patch.editorIds = FieldValue.arrayUnion(uid);
  }

  await db.doc(`federations/${federationId}`).set(patch, { merge: true });
  await inviteDoc.ref.set(
    { status: "accepted", acceptedBy: uid, acceptedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  await db.collection("federations").doc(federationId).collection("logs").add({
    type: "INVITE_ACCEPTED",
    actorId: uid,
    targetId: uid,
    metadata: { role, inviteId },
    createdAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, federationId, role };
}

