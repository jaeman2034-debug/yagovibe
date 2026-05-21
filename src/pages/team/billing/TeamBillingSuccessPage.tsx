import { httpsCallable } from "firebase/functions";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import CenterLayout from "@/layouts/CenterLayout";
import { functions } from "@/lib/firebase";
import {
  clearFeeExperimentAttribution,
  peekBillingReRegisterAttributionNotificationId,
} from "@/lib/notifications/feeExperimentAttribution";

/** React Strict Mode 이중 effect에도 confirm 1회만 실행 */
const billingConfirmInflight = new Map<string, Promise<void>>();

export default function TeamBillingSuccessPage() {
  const { teamId = "" } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("카드 등록을 완료하는 중입니다…");
  const setMessageRef = useRef(setMessage);
  setMessageRef.current = setMessage;

  useEffect(() => {
    const authKey = searchParams.get("authKey") || "";
    const customerKey = searchParams.get("customerKey") || "";
    if (!teamId || !authKey || !customerKey) {
      setMessage("인증 정보가 없습니다. 팀 홈으로 돌아가 다시 시도해 주세요.");
      return;
    }

    const dedupeKey = `${teamId}:${authKey}:${customerKey}`;
    let run = billingConfirmInflight.get(dedupeKey);
    if (!run) {
      const confirm = httpsCallable(functions, "tossTeamBillingConfirm");
      run = (async () => {
        const feeAttributionNotificationId =
          peekBillingReRegisterAttributionNotificationId(teamId) || "";
        await confirm({
          teamId,
          authKey,
          customerKey,
          ...(feeAttributionNotificationId ? { feeAttributionNotificationId } : {}),
        });
      })();
      billingConfirmInflight.set(dedupeKey, run);
      void run
        .then(() => {
          clearFeeExperimentAttribution();
          toast.success("자동결제 카드가 등록되었습니다.");
          navigate(`/team/${encodeURIComponent(teamId)}?tab=home`, { replace: true });
        })
        .catch((e) => {
          console.error(e);
          setMessageRef.current("카드 등록 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.");
          toast.error("카드 등록 확인에 실패했습니다.");
        })
        .finally(() => {
          billingConfirmInflight.delete(dedupeKey);
        });
    }
  }, [navigate, searchParams, teamId]);

  return (
    <CenterLayout>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">자동결제 카드 등록</h1>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <Link
          to={`/team/${encodeURIComponent(teamId)}`}
          className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          팀 홈으로
        </Link>
      </div>
    </CenterLayout>
  );
}
