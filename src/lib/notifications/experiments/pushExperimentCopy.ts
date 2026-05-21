/**
 * 푸시/인박스 A/B 실험 — 알림 문서에 `experiment` + `variant` + `title`/`message`를 함께 저장.
 * Functions FCM 핸들러는 실험 필드가 있으면 문서의 문구를 그대로 사용한다.
 */

export const NOTIFICATION_EXPERIMENT_IDS = {
  BILLING_REREGISTER_V1: "billing_reregister_v1",
  FEE_REMINDER_V1: "fee_reminder_v1",
} as const;

export type NotificationExperimentId =
  (typeof NOTIFICATION_EXPERIMENT_IDS)[keyof typeof NOTIFICATION_EXPERIMENT_IDS];

export type NotificationVariant = "A" | "B";

export function pickAbVariant(): NotificationVariant {
  return Math.random() < 0.5 ? "A" : "B";
}

/** 카드 재등록 안내 (billing_re_register_request) */
export function buildBillingReRegisterExperimentFields(variant: NotificationVariant): {
  experiment: NotificationExperimentId;
  variant: NotificationVariant;
  title: string;
  message: string;
} {
  const experiment = NOTIFICATION_EXPERIMENT_IDS.BILLING_REREGISTER_V1;
  if (variant === "A") {
    return {
      experiment,
      variant,
      title: "카드 정보 확인 필요",
      message: "자동결제가 실패했습니다. 카드 정보를 확인해 주세요.",
    };
  }
  return {
    experiment,
    variant,
    title: "카드 정보 확인 필요",
    message: "카드 정보가 오래되어 결제가 실패했습니다. 지금 수정하면 연체를 막을 수 있어요.",
  };
}

/** 회비 독촉·일괄 (fee_reminder) — 수신자 이름 포함 */
export function buildFeeReminderExperimentFields(
  displayName: string,
  variant: NotificationVariant
): {
  experiment: NotificationExperimentId;
  variant: NotificationVariant;
  title: string;
  message: string;
} {
  const experiment = NOTIFICATION_EXPERIMENT_IDS.FEE_REMINDER_V1;
  const name = displayName.trim() || "회원";
  if (variant === "A") {
    return {
      experiment,
      variant,
      title: "회비 안내",
      message: `${name}님, 회비 납부를 확인해 주세요.`,
    };
  }
  return {
    experiment,
    variant,
    title: "회비 안내",
    message: `${name}님, 아직 회비가 납부되지 않았습니다.`,
  };
}

/** 결제 진행 중(pending) 멤버용 — 온라인 결제 창을 열었지만 완료되지 않은 경우 */
export function buildFeeCheckoutPendingReminderExperimentFields(
  displayName: string,
  variant: NotificationVariant
): {
  experiment: NotificationExperimentId;
  variant: NotificationVariant;
  title: string;
  message: string;
} {
  const experiment = NOTIFICATION_EXPERIMENT_IDS.FEE_REMINDER_V1;
  const name = displayName.trim() || "회원";
  if (variant === "A") {
    return {
      experiment,
      variant,
      title: "회비 결제 완료",
      message: `${name}님, 진행 중인 회비 결제를 마저 완료해 주세요.`,
    };
  }
  return {
    experiment,
    variant,
    title: "회비 결제 확인",
    message: `${name}님, 회비 결제가 아직 완료되지 않았어요. 앱에서 이어서 진행할 수 있어요.`,
  };
}
