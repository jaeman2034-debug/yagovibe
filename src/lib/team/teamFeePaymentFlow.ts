import { httpsCallable } from "firebase/functions";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { functions } from "@/lib/firebase";
import {
  clearFeeExperimentAttribution,
  peekFeeAttributionNotificationId,
} from "@/lib/notifications/feeExperimentAttribution";

type CreateTeamFeePaymentResponse = {
  alreadyPaid?: boolean;
  orderId: string;
  amount: number;
  orderName: string;
  successUrl: string;
  failUrl: string;
};

type ConfirmTeamFeePaymentResponse = {
  success: boolean;
  alreadyPaid?: boolean;
  status?: string;
};

export async function startTeamFeePayment(teamId: string, feeId: string): Promise<void> {
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || "";
  if (!clientKey) {
    throw new Error("VITE_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
  }

  const createCallable = httpsCallable(functions, "createTeamFeePayment");
  const feeAttributionNotificationId = peekFeeAttributionNotificationId(teamId, feeId) || "";
  const result = await createCallable({
    teamId,
    feeId,
    origin: window.location.origin,
    ...(feeAttributionNotificationId ? { feeAttributionNotificationId } : {}),
  });
  const data = result.data as CreateTeamFeePaymentResponse;
  clearFeeExperimentAttribution();
  if (data.alreadyPaid) return;

  const tossPayments = await loadTossPayments(clientKey);
  await tossPayments.requestPayment("카드", {
    amount: data.amount,
    orderId: data.orderId,
    orderName: data.orderName,
    successUrl: data.successUrl,
    failUrl: data.failUrl,
  });
}

export async function confirmTeamFeePayment(args: {
  teamId: string;
  feeId: string;
  orderId: string;
  paymentKey: string;
  amount: number;
}): Promise<ConfirmTeamFeePaymentResponse> {
  const confirmCallable = httpsCallable(functions, "confirmTeamFeePayment");
  const result = await confirmCallable(args);
  return result.data as ConfirmTeamFeePaymentResponse;
}
