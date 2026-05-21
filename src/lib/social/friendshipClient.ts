import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { RequestFriendshipResponse } from "@/types/social";

export type PreviewFriendInviteResult = {
  ok: boolean;
  displayName?: string;
  photoUrl?: string | null;
};

export async function callPreviewFriendInvite(inviterUid: string): Promise<PreviewFriendInviteResult> {
  const fn = httpsCallable<{ inviterUid: string }, PreviewFriendInviteResult>(functions, "previewFriendInvite");
  const res = await fn({ inviterUid: inviterUid.trim() });
  return res.data as PreviewFriendInviteResult;
}

export async function callRequestFriendship(targetUid: string): Promise<RequestFriendshipResponse> {
  const fn = httpsCallable<{ targetUid: string }, RequestFriendshipResponse>(functions, "requestFriendship");
  const res = await fn({ targetUid: targetUid.trim() });
  return res.data as RequestFriendshipResponse;
}

export async function callAcceptFriendship(otherUid: string): Promise<{ ok: boolean; reason?: string }> {
  const fn = httpsCallable<{ otherUid: string }, { ok: boolean; reason?: string }>(functions, "acceptFriendship");
  const res = await fn({ otherUid: otherUid.trim() });
  return res.data as { ok: boolean; reason?: string };
}

export async function callBlockFriendship(otherUid: string): Promise<{ ok: boolean; reason?: string }> {
  const fn = httpsCallable<{ otherUid: string }, { ok: boolean; reason?: string }>(functions, "blockFriendship");
  const res = await fn({ otherUid: otherUid.trim() });
  return res.data as { ok: boolean; reason?: string };
}
