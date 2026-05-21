import {
  addDoc,
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  arrayUnion,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import { functions } from "@/lib/firebase";
import { buildExternalUrl } from "@/lib/growth/teamInviteShare";

type RoleKind = "admin" | "editor";

function digitsOnly(input: string): string {
  return String(input || "").replace(/\D+/g, "");
}

function toComparablePhone(input: string | null | undefined): string {
  const d = digitsOnly(input || "");
  // E.164(+82...) → 국내(010...) 정규화 시도
  // +8210xxxx → 010xxxx
  if (d.startsWith("8210")) return "0" + d.slice(2); // 8210 -> 010
  // +82(다른 국번) 케이스는 MVP 스코프 밖: digitsOnly로만 매칭
  return d;
}

export async function inviteFederationByPhone(
  federationId: string,
  phone: string,
  role: RoleKind
): Promise<{ inviteId: string; inviteLink: string; smsSent: boolean; smsError?: string }> {
  const fedPath = `federations/${federationId}`;
  const invitesCol = collection(db, fedPath, "invites");
  const phoneDigits = digitsOnly(phone);

  const ref = await addDoc(invitesCol, {
    federationId,
    phone,
    phoneDigits,
    role,
    inviteId: "", // 생성 직후 실제 id로 갱신
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  });
  await updateDoc(ref, { inviteId: ref.id });
  // 초대 저장 후 SMS 발송
  const sendInviteSMS = httpsCallable<
    { phone: string; federationId: string; role: RoleKind; inviteId: string },
    { success: boolean; inviteLink?: string }
  >(functions, "sendInviteSMS");
  try {
    const smsRes = await sendInviteSMS({
      phone,
      federationId,
      role,
      inviteId: ref.id,
    });
    const inviteLink =
      String((smsRes as any)?.data?.inviteLink || "").trim() ||
      buildExternalUrl(`/invite?id=${encodeURIComponent(ref.id)}&fid=${encodeURIComponent(federationId)}`);
    await updateDoc(doc(db, "federations", federationId, "invites", ref.id), {
      smsStatus: "sent",
      smsSentAt: serverTimestamp(),
    });
    return { inviteId: ref.id, inviteLink, smsSent: true };
  } catch (e: any) {
    const msg = String(e?.message || e?.code || "SMS 발송 실패");
    const inviteLink = buildExternalUrl(
      `/invite?id=${encodeURIComponent(ref.id)}&fid=${encodeURIComponent(federationId)}`
    );
    // 초대 문서는 남기고, SMS만 실패 상태로 기록
    await updateDoc(doc(db, "federations", federationId, "invites", ref.id), {
      smsStatus: "failed",
      smsError: msg,
      smsFailedAt: serverTimestamp(),
    });
    return { inviteId: ref.id, inviteLink, smsSent: false, smsError: msg };
  }
}

export async function acceptFederationPhoneInviteById(
  inviteId: string,
  user: { uid: string; phoneNumber?: string | null },
  federationId?: string
): Promise<{ federationId: string; role: RoleKind }> {
  if (!inviteId) throw new Error("유효하지 않은 초대 링크입니다.");
  if (!user?.uid) throw new Error("로그인이 필요합니다.");
  const fn = httpsCallable<{ inviteId: string; federationId?: string }, { ok: boolean; federationId: string; role: RoleKind }>(
    functions,
    "acceptFederationInviteById"
  );
  const res = await fn({ inviteId, federationId });
  if (!res.data?.ok || !res.data?.federationId) {
    throw new Error("초대 수락 처리에 실패했습니다.");
  }
  return { federationId: res.data.federationId, role: res.data.role };
}

export async function listFederationInvites(federationId: string): Promise<
  Array<{
    id: string;
    phone: string;
    role: RoleKind;
    status: "pending" | "accepted" | "rejected";
    createdAt?: any;
  }>
> {
  const snap = await getDocs(collection(db, "federations", federationId, "invites"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function removeFederationInvite(federationId: string, inviteId: string): Promise<void> {
  await deleteDoc(doc(db, "federations", federationId, "invites", inviteId));
}

/**
 * 로그인(또는 앱 시작) 시, 본인 전화번호로 대기 중인 초대를 자동 연결한다.
 * - invites 컬렉션(서브)에서 phoneDigits 매칭
 * - federations/{id} 문서 admins/editors 배열에 { uid, phone, role } 추가
 * - 초대 상태 accepted 로 전환
 */
export async function acceptPendingFederationInvitesForUser(
  user: { uid: string; phoneNumber?: string | null }
): Promise<void> {
  const comparable = toComparablePhone(user.phoneNumber);
  if (!user.uid || !comparable) return;

  // 하위 컬렉션 그룹 invites 전체에서 phoneDigits 매칭 후 pending만 조회
  const q = query(
    collectionGroup(db, "invites"),
    where("phoneDigits", "==", digitsOnly(comparable)),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  for (const d of snap.docs) {
    const data = d.data() as any;
    const federationId = String(data.federationId || "").trim();
    const role: RoleKind = data.role === "admin" ? "admin" : "editor";
    if (!federationId) continue;

    const fedRef = doc(db, "federations", federationId);
    // ✅ 권한은 기존 스키마(roles.admins / roles.editors = uid 문자열 배열)에 반영
    // (그래야 isFederationManager()가 바로 인식하고 편집 가능)
    const patch: Record<string, any> = {};
    if (role === "admin") {
      patch["roles.admins"] = arrayUnion(user.uid);
      // 레거시 호환(있으면 같이 유지)
      patch.adminIds = arrayUnion(user.uid);
      patch.adminUids = arrayUnion(user.uid);
    } else {
      patch["roles.editors"] = arrayUnion(user.uid);
      patch.editorIds = arrayUnion(user.uid);
    }
    // UI 표시/감사용 메타(선택): 전화번호 기반 초대 내역을 문서에 남길 수 있음
    patch.updatedAt = serverTimestamp();
    await updateDoc(fedRef, patch);

    // 초대 상태 accepted로 전환
    await updateDoc(d.ref, {
      status: "accepted",
      acceptedAt: serverTimestamp(),
      acceptedBy: user.uid,
    });
  }
}

