/**
 * Firebase Functions 엔트리 — discovery 10초 타임아웃 방지를 위해 전부 지연 require
 */

import {
  attachLazyBarrelExports,
  attachLazyModuleExports,
  barrelPathFromLibIndex,
  modulePathFromLibSrc,
} from "./src/exports/attachLazyBarrels";

/** rootBundle 전체 로드 방지 — match telemetry만 격리 */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("telemetry/appendMatchEvent"), [
  "appendMatchEvents",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("telemetry/getMatchIntelligenceSummary"), [
  "getMatchIntelligenceSummary",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("telemetry/getPlayerTrendIntelligence"), [
  "getPlayerTrendIntelligence",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("telemetry/getAdaptiveCoachPlan"), [
  "getAdaptiveCoachPlan",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("telemetry/getLeaderboards"), [
  "getLeaderboards",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("social/socialGraphCallables"), [
  "followPlayer",
  "unfollowPlayer",
  "getFriendsGraph",
  "searchPlayers",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("billing/yagoPro/createYagoProCheckoutSession"), [
  "createYagoProCheckoutSession",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("billing/yagoPro/getEntitlements"), [
  "getEntitlements",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("billing/stripeBillingWebhook"), [
  "stripeBillingWebhook",
] as const);

/** AI Growth ingestion — rootBundle 전체 로드 없이 격리 (첫 호출 internal 방지) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/aiGrowthIngestionCallables"), [
  "startYoutubeIngestion",
  "getYoutubeIngestionStatus",
  "getTranscriptById",
] as const);

attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/aiGrowthTaggingCallables"), [
  "runTranscriptGrowthTagging",
] as const);

/** TRACK 5-3 — playerGrowthAvatar → avatars/{uid} (coach/staff mirror) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/aiGrowthAvatarMirrorCallable"), [
  "mirrorAcademyGrowthToAvatar",
] as const);

/** Sprint 10B-1a/1c — Academy MP4 upload + Callable → Worker transcribe */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyMediaIngestCallables"), [
  "createAcademyMediaUpload",
  "confirmAcademyMediaUpload",
  "startAcademyMediaIngestion",
  "getAcademyMediaIngestionStatus",
] as const);

/** CV-1 I2 — Academy CV analyze (Worker relay · cvRuns persist) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyCvAnalysisCallables"), [
  "startAcademyCvAnalysis",
] as const);

/** Vision v6-7 — Academy vision analyze (Worker relay · visionRuns persist) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyVisionAnalysisCallables"), [
  "startVisionAnalysis",
  "retryVisionAnalysis",
  "cancelVisionAnalysis",
  "getVisionPipelineStatus",
] as const);

/** CV-1 I5 — Coach Review (candidate → approved | rejected) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyCvReviewCallables"), [
  "reviewAcademyCvRun",
] as const);

/** CV-1 I6 — cvRuns context read (staff · platform admin) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyCvReadCallables"), [
  "getAcademyCvRunsContext",
] as const);

/** CV-1 I7 J3 — approved cvRun → cvSignals → cvGrowthLinks (append-only) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyCvGrowthLinkCallables"), [
  "extractApprovedCvSignals",
] as const);

/** CV-1 I7 J5 — cvGrowthLinks context read (staff · platform admin) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyCvGrowthLinksReadCallables"), [
  "getCvGrowthLinksContext",
  "getCvInterpretationPreviewContext",
  "reviewInterpretationCandidate",
  "getCvGrowthSignalsPreviewContext",
] as const);

/** CV-1 I7 J6 — cvGrowthLinks Manual Review */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/academyCvGrowthLinkReviewCallables"), [
  "reviewCvGrowthLink",
] as const);

/** CV-1 I8-2 — accepted cvGrowthLink → interpretationCandidates */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvInterpretationClassificationCallables"),
  ["generateInterpretationCandidates"] as const
);

/** CV-1 I8-3 — interpretationCandidates internal preview read */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvInterpretationReadCallables"),
  ["getCvInterpretationPreviewContext"] as const
);

/** CV-1 I8-4 — interpretationCandidate Coach Review */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvInterpretationReviewCallables"),
  ["reviewInterpretationCandidate"] as const
);

/** CV-1 I9-1 — growthSignals simulation preview */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvGrowthSignalsReadCallables"),
  ["getCvGrowthSignalsPreviewContext"] as const
);

/** CV-1 I9-2 — growthSignal draft validation + what-if compare */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvGrowthSignalsReviewCallables"),
  ["reviewGrowthSignalDraft"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvGrowthSignalsCompareCallables"),
  ["getCvGrowthSignalsCompareContext"] as const
);

/** CV-1 I9-3 — fiiDraft FII preview + compare */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvFiiDraftReadCallables"),
  ["getCvFiiDraftPreviewContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvFiiDraftCompareCallables"),
  ["getCvFiiDraftCompareContext"] as const
);

/** CV-1 I10-1 — ovrDraft preview + compare */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvOvrDraftReadCallables"),
  ["getCvOvrDraftPreviewContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvOvrDraftCompareCallables"),
  ["getCvOvrDraftCompareContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvOvrDraftReviewCallables"),
  ["reviewOvrDraft"] as const
);

/** CV-1 I10-3-1 — promotionPreview (no SoT write) */
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvPromotionPreviewReadCallables"),
  ["getCvPromotionPreviewContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvPromotionPreviewCompareCallables"),
  ["getCvPromotionPreviewCompareContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvPromotionPreviewReviewCallables"),
  ["reviewPromotionPreview"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvPromotionWriteCallables"),
  ["promoteCvGrowthToPlayerOvr"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvPromotionRollbackCallables"),
  ["restoreCvPromotionFromAudit"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarDraftReadCallables"),
  ["getCvAvatarDraftPreviewContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarDraftCompareCallables"),
  ["getCvAvatarDraftCompareContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarDraftReviewCallables"),
  ["reviewAvatarDraft"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarPromotionPreviewReadCallables"),
  ["getCvAvatarPromotionPreviewContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarPromotionPreviewCompareCallables"),
  ["getCvAvatarPromotionPreviewCompareContext"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarPromotionPreviewReviewCallables"),
  ["reviewAvatarPromotionPreview"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarPromotionWriteCallables"),
  ["promoteCvGrowthToPlayerAvatar"] as const
);
attachLazyModuleExports(
  module.exports,
  modulePathFromLibSrc("lib/academyCvAvatarPromotionRollbackCallables"),
  ["restoreCvAvatarPromotionFromAudit"] as const
);

/** Sprint B-4 — Privacy raw retention (30d) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/privacy/cleanupExpiredRawMedia"), [
  "cleanupExpiredRawMedia",
] as const);

/** Sprint B-5 — Privacy audit (client COACH_APPROVED / PDF_GENERATED) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/privacy/privacyAuditLog"), [
  "recordPrivacyAuditEvent",
] as const);

/** Sprint 10E — YouTube URL import bridge */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/youtubeUrlImportCallables"), [
  "startYoutubeUrlAcademyImport",
] as const);

/** I-2.1 — VOC interview Whisper STT */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/vocTranscribeCallable"), [
  "transcribeVocInterview",
] as const);

/** Sprint D-1.1a — Growth report delivery → parent auto-notify (Firestore trigger) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("growth/onPlayerGrowthHistoryDeliveryNotify"), [
  "onPlayerGrowthHistoryDeliveryNotify",
] as const);

/** Sprint D-3 — playerGrowthHistory → playerGrowthAvatar (CF persist) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("growth/onPlayerGrowthHistoryAvatarSync"), [
  "onPlayerGrowthHistoryAvatarSync",
] as const);

/** Sprint D-1.1b — Parent growth weekly digest (Scheduler) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("growth/weeklyDigest"), [
  "generateParentGrowthWeeklyDigests",
] as const);

/** Sprint D-1 — Growth report PDF upload (Admin SDK; Storage Rules Firestore lookup 우회) */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("lib/growthReportDeliveryCallable"), [
  "uploadGrowthReportPdf",
] as const);

/** Parent Delivery v2.1 Phase B — Solapi AlimTalk */
attachLazyModuleExports(module.exports, modulePathFromLibSrc("parent-delivery/sendParentDeliveryAlimtalkCallable"), [
  "sendParentDeliveryAlimtalk",
] as const);

attachLazyBarrelExports(module.exports, barrelPathFromLibIndex("reporting"), [
  "generateWeeklyReportJobOld",
  "generateWeeklyReportJob",
  "generateWeeklyReportAndEmail",
  "generateMonthlyReportAndEmail",
  "generateAndSendMonthlyTeamReport",
  "generateVoiceAndPdfReport",
  "generatePlayerInsightReports",
  "generateInsightChartReport",
  "notifyWeeklyReport",
  "generateOpsReport",
  "selfLearningGovernance",
  "runDigitalTwinSimulation",
  "generatePredictiveInsights",
  "autonomousActionEngine",
  "orchestrateAIModules",
] as const);

attachLazyBarrelExports(module.exports, barrelPathFromLibIndex("voice"), [
  "subscribeAdminTopic",
  "predictEventTrends",
  "dispatchAIReport",
  "voiceTriggerReport",
  "routeVoiceCommand",
  "voiceAnalyticsAssistant",
  "voiceAdminConsole",
  "voiceMemoryAssistant",
  "teamVoiceAgent",
  "generateTeamSummaries",
  "analyzeVoiceFeedback",
  "generateEmotionHeatmap",
] as const);

attachLazyBarrelExports(module.exports, barrelPathFromLibIndex("market"), [
  "handleImageAndVoiceAnalyze",
  "generateTags",
  "getPriceRecommendation",
  "generateSearchMeta",
  "getSearchSuggestions",
  "getRelatedProducts",
  "getProductSummary",
  "detectFraudRisk",
  "getImageQualityScore",
  "getConditionScore",
  "getPricePrediction",
  "predictFuturePrice",
  "generateProductTitle",
  "detectComponents",
  "generateAITags",
  "generateCategory",
  "generateOneLineSummary",
  "generateTotalScore",
  "getRecommendedFeed",
  "negotiateHelper",
  "searchProducts",
  "recommendSimilar",
  "getSellerTrustScore",
  "askAdminAI",
] as const);

attachLazyModuleExports(module.exports, barrelPathFromLibIndex("rootBundle"), [
  "inviteTeamMemberByPhone",
  "claimPhoneInvitedTeamMemberships",
  "updateInvitedMemberPhone",
  "previewTeamMemberInvite",
  "createTeamMemberInvite",
  "claimTeamMemberInvite",
  "onAuthUserCreateLinkPhoneInvites",
  "recordManualTeamFeePayment",
  "registerAnnualPrepaidPayment",
  "cancelAnnualPrepaidPayment",
  "initializeTeamAccounting",
  "teamFeeAutoCloseScheduler",
  "weeklySeasonSettleScheduler",
  "submitPlayMatchFeedback",
  "sendPushOnNotificationCreate",
  "onTeamGameCompletedPlayFeedbackPush",
  "applyGameProgressionEvent",
  "applyReferralCallable",
  "applyReviewRatingAggregate",
  "grantUserXpBonus",
  "finalizeMiniShotSession",
  "joinQueue",
  "leaveQueue",
  "leaveMatch",
  "clearActiveMatch",
  "readyCheck",
  "getGameSession",
  "getCurrentSeasonInfo",
  "settleWeeklySeason",
  "claimSeasonReward",
  "listPendingWeeklySeasonRewards",
  "syncOrganizationMemberRole",
  "onMarketReviewCreatedTrustRisk",
  "onMarketWriteTrustRisk",
  "completeMarketTransaction",
  "ensureCanonicalTradeChat",
  "createTeam",
  "inviteParent",
  "acceptParentInvite",
  "revokeParentLink",
  "listParentLinks",
  "inviteParentAndLinkPlayer",
  "updateAcademyMemberRole",
  "createAcademyPlayer",
  "inviteParentToAcademyPlayer",
  "inviteAcademyCoachByEmail",
  "createAcademySession",
  "updateAcademySession",
  "cancelAcademySession",
  "listAcademySessions",
  "markAcademyAttendance",
  "bulkMarkAcademyAttendance",
  "getAcademySessionAttendance",
  "createTrainingBlock",
  "updateTrainingBlock",
  "archiveTrainingBlock",
  "listTrainingBlocks",
  "backfillMyTeamMemberships",
  "ensureTeamMediaUploadAccess",
  "uploadTeamGalleryMedia",
  "finalizeTeamBranding",
  "updateTeamPublicCopy",
  "setTeamCaptainPhotoMeta",
  "setTeamCaptainMessage",
  "uploadTeamCaptainPhoto",
  "uploadTeamPublicStaffPhoto",
  "setTeamPublicStaff",
  "setTeamCoverPhotoMeta",
  "uploadTeamCoverPhoto",
  "getPublicTeamStaff",
  "revertTeamPublicField",
  "regenerateTeamPublicField",
  "improveTeamPublicTextSelection",
  "onTeamMemberCreatedAvatarXp",
  "onTeamScheduledRsvpAvatarXp",
  "onTeamActivityCreatedAvatarXp",
  "requestFriendship",
  "acceptFriendship",
  "blockFriendship",
  "previewFriendInvite",
  "claimChallengeReward",
] as const);
