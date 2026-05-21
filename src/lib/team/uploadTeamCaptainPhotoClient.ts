import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type UploadTeamCaptainPhotoPayload = {
  teamId: string;
  /** data:image/jpeg;base64,... 또는 순수 base64 */
  imageDataUrl?: string;
  imageBase64?: string;
  contentType?: string;
  clear?: boolean;
};

export type UploadTeamCaptainPhotoResult = {
  ok: boolean;
  captainPhotoUrl?: string;
  cleared?: boolean;
};

export async function uploadTeamCaptainPhotoCallable(
  payload: UploadTeamCaptainPhotoPayload
): Promise<UploadTeamCaptainPhotoResult> {
  const fn = httpsCallable<UploadTeamCaptainPhotoPayload, UploadTeamCaptainPhotoResult>(
    functions,
    "uploadTeamCaptainPhoto"
  );
  const result = await fn(payload);
  return result.data ?? { ok: false };
}
