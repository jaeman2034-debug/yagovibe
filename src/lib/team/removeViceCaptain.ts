/**
 * 🔥 부팀장 해제 (removeViceCaptain Cloud Function 호출)
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface RemoveViceCaptainRequest {
  teamId: string;
  targetUid: string;
}

interface RemoveViceCaptainResponse {
  ok: boolean;
}

/**
 * 부팀장 해제
 * 
 * @param teamId - 팀 ID
 * @param targetUid - 해제할 부팀장 UID
 */
export async function removeViceCaptain(
  teamId: string,
  targetUid: string
): Promise<void> {
  if (!teamId || !targetUid) {
    throw new Error('팀 ID와 대상 팀원 UID가 필요합니다.');
  }

  const removeViceCaptainFn = httpsCallable<
    RemoveViceCaptainRequest,
    RemoveViceCaptainResponse
  >(functions, 'removeViceCaptain');

  try {
    const result = await removeViceCaptainFn({
      teamId,
      targetUid,
    });

    if (!result.data.ok) {
      throw new Error('부팀장 해제에 실패했습니다.');
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
