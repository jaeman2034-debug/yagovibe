/**
 * Phone Auth로 가입 직후, 동일 번호로 선등록된 팀 멤버(invited) 자동 연결
 */
import * as functions from "firebase-functions/v1";
import { logger } from "firebase-functions";
import { linkInvitedMembersForUidPhone, normalizePhoneE164 } from "./phoneInviteTeamMembers";

export const onAuthUserCreateLinkPhoneInvites = functions
  .region("asia-northeast3")
  .auth.user()
  .onCreate(async (user) => {
    const raw = user.phoneNumber;
    if (!raw) {
      return;
    }
    const phoneE164 = normalizePhoneE164(raw);
    if (!phoneE164.startsWith("+")) {
      return;
    }
    try {
      const res = await linkInvitedMembersForUidPhone(user.uid, phoneE164);
      logger.info("[onAuthUserCreateLinkPhoneInvites]", { uid: user.uid, ...res });
    } catch (e: unknown) {
      logger.error("[onAuthUserCreateLinkPhoneInvites] failed", {
        uid: user.uid,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  });
