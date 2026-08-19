import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type FederationInviteRole = "admin" | "editor" | "viewer" | "pending_owner";

export type PendingOwnershipTransfer = {
  toUid?: string;
  status?: "invited" | "accepted" | "cancelled" | "completed";
  invitedAt?: unknown;
  invitedBy?: string;
  acceptedAt?: unknown;
  inviteId?: string;
  reason?: string | null;
};

/**
 * Federation role invite — Cloud Function + Admin SDK only.
 * Root `invites/{id}` client create is denied by Firestore Rules.
 */
/**
 * Federation / Ownership 초대 — 카카오·클립보드 수신자용 고정 origin.
 * VITE_PUBLIC_APP_ORIGIN(www 등)과 무관하게 Hosting 프로덕션만 사용.
 * (apex yagovibe.com SSL 실패 · localhost · Kakao Product Link 불일치 방지)
 */
export const FEDERATION_INVITE_PUBLIC_ORIGIN = "https://yago-vibe-spt.web.app";

/**
 * Federation invite absolute URL for Kakao/clipboard.
 * Always rebuilds with public origin — never trust CF/local `inviteLink` host
 * (localhost / wrong staging base must not reach recipients).
 */
export function federationInviteAbsoluteUrl(linkOrToken: string): string {
  const raw = String(linkOrToken || "").trim();
  if (!raw) return raw;
  const origin = FEDERATION_INVITE_PUBLIC_ORIGIN;
  let token = "";
  try {
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) {
      const u = new URL(raw, origin);
      token = u.searchParams.get("token") || "";
      if (token) {
        return `${origin}/invite?token=${encodeURIComponent(token)}`;
      }
      // path-style /invite?id=…&fid=…
      if (u.pathname.startsWith("/invite")) {
        return `${origin}${u.pathname}${u.search}${u.hash}`;
      }
    }
  } catch {
    /* fall through */
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return `${origin}/invite?token=${encodeURIComponent(raw)}`;
  }
  const path = raw.startsWith("/") ? raw : `/invite?token=${encodeURIComponent(raw)}`;
  return `${origin}${path}`;
}

export async function createFederationInviteLink(
  federationSlug: string,
  role: Exclude<FederationInviteRole, "pending_owner">
): Promise<string> {
  const fn = httpsCallable<
    { federationSlug: string; role: string },
    { ok: boolean; inviteLink?: string; token?: string }
  >(functions, "createFederationRoleInvite");

  const res = await fn({ federationSlug, role });
  const token = String(res.data?.token || "").trim();
  if (token) {
    return federationInviteAbsoluteUrl(token);
  }
  const link = String(res.data?.inviteLink || "").trim();
  if (link) {
    return federationInviteAbsoluteUrl(link);
  }
  throw new Error("초대 링크 생성에 실패했습니다.");
}

/**
 * Accept token invite via Cloud Function.
 * Supports federation_role and federation_ownership_transfer (ownerUid unchanged until confirm).
 */
export async function acceptFederationInvite(
  token: string,
  _uid: string
): Promise<{ slug: string; role: FederationInviteRole; kind?: string; message?: string }> {
  const fn = httpsCallable<
    { token: string },
    { ok: boolean; slug: string; role: FederationInviteRole; kind?: string; message?: string }
  >(functions, "acceptFederationRoleInvite");

  try {
    const res = await fn({ token });
    if (!res.data?.ok || !res.data?.slug) {
      throw new Error("초대가 만료되었거나 이미 사용되었습니다.");
    }
    return {
      slug: res.data.slug,
      role: res.data.role || "viewer",
      kind: res.data.kind,
      message: res.data.message,
    };
  } catch (e: any) {
    const msg = String(e?.message || e?.code || "초대 처리에 실패했습니다.");
    throw new Error(msg.replace(/^Firebase:\s*/i, "").replace(/\s*\(.*\)$/, "") || msg);
  }
}

export async function proposeFederationOwnershipTransfer(params: {
  federationSlug: string;
  newOwnerUid: string;
  reason?: string;
}): Promise<{ ok: boolean; inviteLink: string; toUid: string; pendingStatus: string }> {
  const fn = httpsCallable<
    { federationSlug: string; newOwnerUid: string; reason?: string },
    { ok: boolean; inviteLink?: string; token?: string; toUid: string; pendingStatus: string }
  >(functions, "proposeFederationOwnershipTransfer");

  const res = await fn(params);
  if (!res.data?.ok) throw new Error("Ownership Transfer 제안에 실패했습니다.");
  const link = federationInviteAbsoluteUrl(
    String(res.data.token || res.data.inviteLink || "").trim()
  );
  if (!link) throw new Error("초대 링크를 생성하지 못했습니다.");
  return {
    ok: true,
    inviteLink: link,
    toUid: res.data.toUid,
    pendingStatus: res.data.pendingStatus,
  };
}

export async function confirmFederationOwnershipTransfer(params: {
  federationSlug: string;
}): Promise<{ ok: boolean; ownerUid: string; previousOwnerUid: string | null }> {
  const fn = httpsCallable<
    { federationSlug: string },
    { ok: boolean; ownerUid: string; previousOwnerUid: string | null }
  >(functions, "confirmFederationOwnershipTransfer");

  const res = await fn(params);
  if (!res.data?.ok) throw new Error("Ownership 최종 승인에 실패했습니다.");
  return {
    ok: true,
    ownerUid: res.data.ownerUid,
    previousOwnerUid: res.data.previousOwnerUid ?? null,
  };
}

export async function cancelFederationOwnershipTransfer(params: {
  federationSlug: string;
}): Promise<{ ok: boolean }> {
  const fn = httpsCallable<{ federationSlug: string }, { ok: boolean }>(
    functions,
    "cancelFederationOwnershipTransfer"
  );
  const res = await fn(params);
  if (!res.data?.ok) throw new Error("Ownership Transfer 취소에 실패했습니다.");
  return { ok: true };
}
