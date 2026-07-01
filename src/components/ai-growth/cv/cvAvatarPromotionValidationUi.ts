/**
 * CV-1 I11-3-2-2 — Avatar Promotion Validation UI labels (read-only polish)
 */
import type { AvatarPromotionPreviewValidationStatusDto } from "@/lib/academy/academyCvAvatarPromotionPreviewReadTypes";

export function avatarPromotionValidationBadgeLabel(
  status: AvatarPromotionPreviewValidationStatusDto
): string {
  switch (status) {
    case "validated":
      return "승인됨";
    case "rejected":
      return "반려됨";
    case "pending":
    default:
      return "PENDING";
  }
}

export function avatarPromotionValidationBadgeClass(
  status: AvatarPromotionPreviewValidationStatusDto
): string {
  switch (status) {
    case "validated":
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    case "rejected":
      return "border-red-300 bg-red-50 text-red-900";
    case "pending":
    default:
      return "border-amber-300 bg-amber-50 text-amber-950";
  }
}

export function avatarPromotionReviewerLabel(
  status: Exclude<AvatarPromotionPreviewValidationStatusDto, "pending">
): string {
  return status === "validated" ? "승인자" : "반려자";
}

export function avatarPromotionReviewedAtLabel(
  status: Exclude<AvatarPromotionPreviewValidationStatusDto, "pending">
): string {
  return status === "validated" ? "승인 시각" : "반려 시각";
}
