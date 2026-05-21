/**
 * 🔥 부팀장 임명 (appointViceCaptain Cloud Function 호출)
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface AppointViceCaptainRequest {
  teamId: string;
  targetUid: string;
}

interface AppointViceCaptainResponse {
  ok: boolean;
}

/**
 * 부팀장 임명
 * 
 * @param teamId - 팀 ID
 * @param targetUid - 임명할 팀원 UID
 */
export async function appointViceCaptain(
  teamId: string,
  targetUid: string
): Promise<void> {
  if (!teamId || !targetUid) {
    throw new Error('팀 ID와 대상 팀원 UID가 필요합니다.');
  }

  const appointViceCaptainFn = httpsCallable<
    AppointViceCaptainRequest,
    AppointViceCaptainResponse
  >(functions, 'appointViceCaptain');

  try {
    const result = await appointViceCaptainFn({
      teamId,
      targetUid,
    });

    if (!result.data.ok) {
      throw new Error('부팀장 임명에 실패했습니다.');
    }
  } catch (error: any) {
    // HttpsError를 그대로 전달 (에러 코드 포함)
    if (error.code) {
      const httpsError = new Error(error.message);
      (httpsError as any).code = error.code;
      throw httpsError;
    }
    throw error;
  }
}
