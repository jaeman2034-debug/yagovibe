import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type UploadTeamCoverPhotoPayload = {
  teamId: string;
  /** data:image/jpeg;base64,... 또는 순수 base64 */
  imageDataUrl?: string;
  imageBase64?: string;
  contentType?: string;
  clear?: boolean;
};

export type UploadTeamCoverPhotoResult = {
  ok: boolean;
  coverPhotoUrl?: string;
  cleared?: boolean;
};

export async function uploadTeamCoverPhotoCallable(
  payload: UploadTeamCoverPhotoPayload
): Promise<UploadTeamCoverPhotoResult> {
  const fn = httpsCallable<UploadTeamCoverPhotoPayload, UploadTeamCoverPhotoResult>(
    functions,
    "uploadTeamCoverPhoto"
  );
  const result = await fn(payload);
  return result.data ?? { ok: false };
}
