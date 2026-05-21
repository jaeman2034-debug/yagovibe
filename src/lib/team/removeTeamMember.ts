/**
 * 🔥 팀원 추방 (removeMember Cloud Function 호출)
 * 
 * 역할:
 * - 팀장이 팀원을 팀에서 내보냄
 * - 즉시 반영
 * - 되돌릴 수 없는 행동
 */

import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@/lib/firebase';
import { callableErrorMessage } from '@/lib/errors/callableErrorMessage';

interface RemoveMemberRequest {
  teamId: string;
  targetUid: string;
}

interface RemoveMemberResponse {
  ok: boolean;
}

/**
 * 팀원 추방
 * 
 * @param teamId - 팀 ID
 * @param targetUid - 추방할 팀원 UID
 */
export async function removeTeamMember(
  teamId: string,
  targetUid: string
): Promise<void> {
  if (!teamId || !targetUid) {
    throw new Error('팀 ID와 대상 팀원 UID가 필요합니다.');
  }

  const cu = auth.currentUser;
  if (!cu) {
    const err = new Error(
      '로그인 정보가 없습니다. 새로고침 후 다시 로그인한 다음 팀원 추방을 시도해 주세요.'
    );
    (err as { code?: string }).code = 'unauthenticated';
    throw err;
  }
  /** Callable에 최신 ID 토큰이 붙도록 (세션 만료·탭 전환 직후 AUTH_REQUIRED 방지) */
  try {
    await cu.getIdToken(true);
  } catch (tokenErr: unknown) {
    const raw =
      tokenErr instanceof Error
        ? tokenErr.message
        : typeof tokenErr === 'object' && tokenErr !== null && 'message' in tokenErr
          ? String((tokenErr as { message?: unknown }).message)
          : String(tokenErr);
    const blocked =
      /securetoken\.googleapis\.com/i.test(raw) ||
      /\bblocked\b/i.test(raw) ||
      /network.*error/i.test(raw);
    if (blocked) {
      const hint = new Error(
        '로그인 토큰을 갱신하는 요청이 차단된 것 같아요. Google Cloud에서 이 앱의 Firebase Web API 키에 "웹사이트 제한(HTTP 리퍼러)"이 걸려 있으면 securetoken 403이 날 수 있어요(개발 중에는 제한 해제 또는 정확한 Origin 허용). 시크릿 창·광고 차단 확장 끄기·다른 네트워크도 함께 확인해 주세요.'
      );
      (hint as { code?: string }).code = 'auth/network-request-failed';
      throw hint;
    }
    throw tokenErr;
  }

  const removeMemberFn = httpsCallable<
    RemoveMemberRequest,
    RemoveMemberResponse
  >(functions, 'removeMember');

  try {
    const result = await removeMemberFn({
      teamId,
      targetUid,
    });

    if (!result.data.ok) {
      throw new Error('팀원 추방에 실패했습니다.');
    }
  } catch (error: unknown) {
    const msg = callableErrorMessage(error);
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : '';
    const httpsError = new Error(msg);
    if (code) (httpsError as { code?: string }).code = code;
    throw httpsError;
  }
}
