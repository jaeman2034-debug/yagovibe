/**
 * 🔥 팀장 위임 (transferOwner Cloud Function 호출)
 * 
 * 역할:
 * - 팀장이 다른 팀원에게 팀장 권한을 위임
 * - 기존 팀장은 팀원이 됨
 * - 되돌릴 수 없는 행동
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface TransferCaptainRequest {
  teamId: string;
  targetUid: string;
}

interface TransferCaptainResponse {
  ok: boolean;
}

/**
 * 팀장 위임
 * 
 * @param teamId - 팀 ID
 * @param targetUid - 위임받을 팀원 UID
 */
export async function transferCaptain(
  teamId: string,
  targetUid: string
): Promise<void> {
  if (!teamId || !targetUid) {
    throw new Error('팀 ID와 대상 팀원 UID가 필요합니다.');
  }

  const transferOwnerFn = httpsCallable<
    TransferCaptainRequest,
    TransferCaptainResponse
  >(functions, 'transferOwner');

  try {
    const result = await transferOwnerFn({
      teamId,
      targetUid,
    });

    if (!result.data.ok) {
      throw new Error('팀장 위임에 실패했습니다.');
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
