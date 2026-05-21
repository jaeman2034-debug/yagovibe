/**
 * 루트 index.ts에서 지연 로드하는 Callable·트리거 묶음
 * (Firebase CLI discovery 10초 타임아웃 방지)
 */

export {
  inviteTeamMemberByPhone,
  claimPhoneInvitedTeamMemberships,
  updateInvitedMemberPhone,
} from "../team/phoneInviteTeamMembers";
export {
  previewTeamMemberInvite,
  createTeamMemberInvite,
  claimTeamMemberInvite,
} from "../team/teamMemberInvites";
export { onAuthUserCreateLinkPhoneInvites } from "../team/onAuthUserCreateLinkPhoneInvites";
export {
  recordManualTeamFeePayment,
  registerAnnualPrepaidPayment,
  cancelAnnualPrepaidPayment,
} from "../team/teamFeePayments";
export { initializeTeamAccounting } from "../team/initializeTeamAccounting";
export { teamFeeAutoCloseScheduler } from "../scheduler/teamFeeAutoCloseScheduler";
export { weeklySeasonSettleScheduler } from "../scheduler/weeklySeasonSettleScheduler";
export { submitPlayMatchFeedback } from "../team/playMatchFeedbackCallable";
export { sendPushOnNotificationCreate } from "../notifications/sendPushOnNotificationCreate";
export { onTeamGameCompletedPlayFeedbackPush } from "../team/onTeamGameCompletedPlayFeedbackPush";
export { applyGameProgressionEvent } from "../game/applyGameProgressionEvent";
export { applyReferralCallable } from "../user/applyReferralCallable";
export { applyReviewRatingAggregate } from "../reviews/applyReviewRatingAggregate";
export { grantUserXpBonus } from "../game/grantUserXpBonus";
export { finalizeMiniShotSession } from "../game/finalizeMiniShotSession";
export {
  joinQueue,
  leaveQueue,
  leaveMatch,
  clearActiveMatch,
  readyCheck,
  getGameSession,
} from "../game/matchmakingCallables";
export { getCurrentSeasonInfo } from "../game/getCurrentSeasonInfo";
export { settleWeeklySeason } from "../game/settleWeeklySeason";
export { claimSeasonReward } from "../game/claimSeasonReward";
export { listPendingWeeklySeasonRewards } from "../game/listPendingWeeklySeasonRewards";
export { syncOrganizationMemberRole } from "../organization/syncOrganizationMemberRole";
export {
  onMarketReviewCreatedTrustRisk,
  onMarketWriteTrustRisk,
} from "../trustRisk/marketTrustRiskTriggers";
export { completeMarketTransaction } from "../market/completeMarketTransaction";
export { ensureCanonicalTradeChat } from "../lib/ensureCanonicalTradeChat";
export { createTeam } from "../lib/teamLifecycleCallables";
export { backfillMyTeamMemberships } from "../team/backfillMyTeamMemberships";
export { ensureTeamMediaUploadAccess } from "../team/ensureTeamMediaUploadAccess";
export { uploadTeamGalleryMedia } from "../lib/uploadTeamGalleryMediaCallable";
export { finalizeTeamBranding } from "../lib/finalizeTeamBrandingCallable";
export { updateTeamPublicCopy } from "../lib/updateTeamPublicCopyCallable";
export { setTeamCaptainPhotoMeta } from "../lib/setTeamCaptainPhotoMetaCallable";
export { setTeamCaptainMessage } from "../lib/setTeamCaptainMessageCallable";
export { uploadTeamCaptainPhoto } from "../lib/uploadTeamCaptainPhotoCallable";
export { uploadTeamPublicStaffPhoto } from "../lib/uploadTeamPublicStaffPhotoCallable";
export { setTeamPublicStaff } from "../lib/setTeamPublicStaffCallable";
export { setTeamCoverPhotoMeta } from "../lib/setTeamCoverPhotoMetaCallable";
export { uploadTeamCoverPhoto } from "../lib/uploadTeamCoverPhotoCallable";
export { getPublicTeamStaff } from "../lib/getPublicTeamStaffCallable";
export { revertTeamPublicField } from "../lib/revertTeamPublicFieldCallable";
export { regenerateTeamPublicField } from "../lib/regenerateTeamPublicFieldCallable";
export { improveTeamPublicTextSelection } from "../lib/improveTeamPublicTextSelectionCallable";
export {
  onTeamMemberCreatedAvatarXp,
  onTeamScheduledRsvpAvatarXp,
  onTeamActivityCreatedAvatarXp,
} from "../lib/avatar/avatarXpTriggers";
export {
  requestFriendship,
  acceptFriendship,
  blockFriendship,
  previewFriendInvite,
} from "../social/friendshipCallables";
export { claimChallengeReward } from "../challenge/claimChallengeRewardCallable";
