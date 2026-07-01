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
export { onPlayerGrowthHistoryDeliveryNotify } from "../growth/onPlayerGrowthHistoryDeliveryNotify";
export { onPlayerGrowthHistoryAvatarSync } from "../growth/onPlayerGrowthHistoryAvatarSync";
export { generateParentGrowthWeeklyDigests } from "../growth/weeklyDigest";
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
export {
  inviteParent,
  acceptParentInvite,
  revokeParentLink,
  listParentLinks,
  inviteParentAndLinkPlayer,
} from "../lib/parentLinkCallables";
export { updateAcademyMemberRole } from "../lib/updateAcademyMemberRole";
export {
  createAcademyPlayer,
  inviteParentToAcademyPlayer,
  inviteAcademyCoachByEmail,
} from "../lib/academyPlayerCallables";
export {
  createAcademySession,
  updateAcademySession,
  cancelAcademySession,
  listAcademySessions,
} from "../lib/academySessionCallables";
export {
  startYoutubeIngestion,
  getYoutubeIngestionStatus,
  getTranscriptById,
} from "../lib/aiGrowthIngestionCallables";
export {
  createAcademyMediaUpload,
  confirmAcademyMediaUpload,
  startAcademyMediaIngestion,
  getAcademyMediaIngestionStatus,
} from "../lib/academyMediaIngestCallables";
export { startAcademyCvAnalysis } from "../lib/academyCvAnalysisCallables";
export { reviewAcademyCvRun } from "../lib/academyCvReviewCallables";
export { getAcademyCvRunsContext } from "../lib/academyCvReadCallables";
export { extractApprovedCvSignals } from "../lib/academyCvGrowthLinkCallables";
export { getCvGrowthLinksContext } from "../lib/academyCvGrowthLinksReadCallables";
export { reviewCvGrowthLink } from "../lib/academyCvGrowthLinkReviewCallables";
export { getCvInterpretationPreviewContext } from "../lib/academyCvInterpretationReadCallables";
export { generateInterpretationCandidates } from "../lib/academyCvInterpretationClassificationCallables";
export { reviewInterpretationCandidate } from "../lib/academyCvInterpretationReviewCallables";
export { getCvGrowthSignalsPreviewContext } from "../lib/academyCvGrowthSignalsReadCallables";
export { reviewGrowthSignalDraft } from "../lib/academyCvGrowthSignalsReviewCallables";
export { getCvGrowthSignalsCompareContext } from "../lib/academyCvGrowthSignalsCompareCallables";
export { getCvFiiDraftPreviewContext } from "../lib/academyCvFiiDraftReadCallables";
export { getCvFiiDraftCompareContext } from "../lib/academyCvFiiDraftCompareCallables";
export { getCvOvrDraftPreviewContext } from "../lib/academyCvOvrDraftReadCallables";
export { getCvOvrDraftCompareContext } from "../lib/academyCvOvrDraftCompareCallables";
export { reviewOvrDraft } from "../lib/academyCvOvrDraftReviewCallables";
export { getCvPromotionPreviewContext } from "../lib/academyCvPromotionPreviewReadCallables";
export { getCvPromotionPreviewCompareContext } from "../lib/academyCvPromotionPreviewCompareCallables";
export { reviewPromotionPreview } from "../lib/academyCvPromotionPreviewReviewCallables";
export { promoteCvGrowthToPlayerOvr } from "../lib/academyCvPromotionWriteCallables";
export { restoreCvPromotionFromAudit } from "../lib/academyCvPromotionRollbackCallables";
export { getCvAvatarDraftPreviewContext } from "../lib/academyCvAvatarDraftReadCallables";
export { getCvAvatarDraftCompareContext } from "../lib/academyCvAvatarDraftCompareCallables";
export { reviewAvatarDraft } from "../lib/academyCvAvatarDraftReviewCallables";
export { getCvAvatarPromotionPreviewContext } from "../lib/academyCvAvatarPromotionPreviewReadCallables";
export { getCvAvatarPromotionPreviewCompareContext } from "../lib/academyCvAvatarPromotionPreviewCompareCallables";
export { reviewAvatarPromotionPreview } from "../lib/academyCvAvatarPromotionPreviewReviewCallables";
export { promoteCvGrowthToPlayerAvatar } from "../lib/academyCvAvatarPromotionWriteCallables";
export { restoreCvAvatarPromotionFromAudit } from "../lib/academyCvAvatarPromotionRollbackCallables";
export { startYoutubeUrlAcademyImport } from "../lib/youtubeUrlImportCallables";
export {
  markAcademyAttendance,
  bulkMarkAcademyAttendance,
  getAcademySessionAttendance,
} from "../lib/academyAttendanceCallables";
export {
  createTrainingBlock,
  updateTrainingBlock,
  archiveTrainingBlock,
  listTrainingBlocks,
} from "../lib/trainingBlockCallables";
export { backfillMyTeamMemberships } from "../team/backfillMyTeamMemberships";
export { ensureTeamMediaUploadAccess } from "../team/ensureTeamMediaUploadAccess";
export { uploadGrowthReportPdf } from "../lib/growthReportDeliveryCallable";
export { sendParentDeliveryAlimtalk } from "../parent-delivery/sendParentDeliveryAlimtalkCallable";
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
