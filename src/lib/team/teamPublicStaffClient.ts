import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { TeamPublicStaffMember } from "@/types/teamPublicStaff";

export async function setTeamPublicStaffCallable(payload: {
  teamId: string;
  staff: TeamPublicStaffMember[];
}): Promise<{ ok?: boolean; count?: number }> {
  const fn = httpsCallable<typeof payload, { ok?: boolean; count?: number }>(functions, "setTeamPublicStaff");
  const result = await fn(payload);
  return result.data ?? {};
}

export type UploadTeamPublicStaffPhotoPayload = {
  teamId: string;
  staffId: string;
  imageDataUrl?: string;
  imageBase64?: string;
  contentType?: string;
};

export async function uploadTeamPublicStaffPhotoCallable(
  payload: UploadTeamPublicStaffPhotoPayload
): Promise<{ ok?: boolean; photoUrl?: string }> {
  const fn = httpsCallable<UploadTeamPublicStaffPhotoPayload, { ok?: boolean; photoUrl?: string }>(
    functions,
    "uploadTeamPublicStaffPhoto"
  );
  const result = await fn(payload);
  return result.data ?? {};
}
