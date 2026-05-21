/** 친구 프로필 초대 랜딩 (PR-8B) — `/invite/friend/:inviterUid` */
export function friendProfileInvitePath(inviterUid: string): string {
  return `/invite/friend/${encodeURIComponent(inviterUid.trim())}`;
}

export function buildFriendProfileInviteAbsoluteUrl(inviterUid: string): string {
  const path = friendProfileInvitePath(inviterUid);
  if (typeof window === "undefined" || !window.location?.origin) {
    return path;
  }
  return `${window.location.origin}${path}`;
}
