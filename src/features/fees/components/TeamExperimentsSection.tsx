import { NOTIFICATION_EXPERIMENT_IDS } from "@/lib/notifications/experiments/pushExperimentCopy";
import { useTeamNotificationExperiment } from "../hooks/useTeamNotificationExperiment";
import TeamNotificationExperimentCard from "./TeamNotificationExperimentCard";

const EMPTY_BUCKET = {
  sent: 0,
  opened: 0,
  clicked: 0,
  converted: 0,
  reRegisterConverted: 0,
};

type Props = {
  teamId: string;
};

export default function TeamExperimentsSection({ teamId }: Props) {
  const billing = useTeamNotificationExperiment(teamId, NOTIFICATION_EXPERIMENT_IDS.BILLING_REREGISTER_V1);
  const feeRem = useTeamNotificationExperiment(teamId, NOTIFICATION_EXPERIMENT_IDS.FEE_REMINDER_V1);

  const billingEmpty =
    !billing.loading &&
    !billing.permissionDenied &&
    (!billing.docData ||
      (billing.docData.variantA.sent === 0 &&
        billing.docData.variantB.sent === 0));

  const feeEmpty =
    !feeRem.loading &&
    !feeRem.permissionDenied &&
    (!feeRem.docData ||
      (feeRem.docData.variantA.sent === 0 && feeRem.docData.variantB.sent === 0));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">알림 A/B 실험</h3>
        <p className="mt-1 text-sm text-gray-500">
          푸시·인박스 실험 집계입니다. 팀 스태프만 조회할 수 있습니다. 발송 합계 100건 이상이고 전환율 차이가
          10%p 이상이면 승자 안만 자동 발송됩니다.
        </p>
      </div>

      <TeamNotificationExperimentCard
        title="카드 재등록 안내"
        description="자동결제 실패 알림 → 클릭 → 카드 재등록 → 이후 자동결제 성공까지의 전환입니다."
        mode="re_register"
        loading={billing.loading}
        permissionDenied={billing.permissionDenied}
        empty={billingEmpty}
        variantA={billing.docData?.variantA ?? EMPTY_BUCKET}
        variantB={billing.docData?.variantB ?? EMPTY_BUCKET}
        rolloutMeta={
          billing.docData
            ? {
                rollout: billing.docData.rollout,
                winner: billing.docData.winner,
                decidedAt: billing.docData.decidedAt,
              }
            : null
        }
      />

      <TeamNotificationExperimentCard
        title="회비 알림"
        description="회비 독촉·일괄 알림 → 클릭 → 즉시 수동 결제 완료까지의 전환입니다."
        mode="fee_reminder"
        loading={feeRem.loading}
        permissionDenied={feeRem.permissionDenied}
        empty={feeEmpty}
        variantA={feeRem.docData?.variantA ?? EMPTY_BUCKET}
        variantB={feeRem.docData?.variantB ?? EMPTY_BUCKET}
        rolloutMeta={
          feeRem.docData
            ? {
                rollout: feeRem.docData.rollout,
                winner: feeRem.docData.winner,
                decidedAt: feeRem.docData.decidedAt,
              }
            : null
        }
      />
    </div>
  );
}
