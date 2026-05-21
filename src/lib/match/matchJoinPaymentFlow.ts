import { httpsCallable } from "firebase/functions";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { functions } from "@/lib/firebase";

type CreatePaymentResponse = {
  orderId: string;
  amount: number;
};

export type PendingMatchJoinPayment = {
  orderId: string;
  matchId: string;
  teamId: string;
  teamName: string;
  amount: number;
};

const PENDING_MATCH_JOIN_PREFIX = "matchJoinPayment:";

export function getPendingMatchJoinPayment(orderId: string): PendingMatchJoinPayment | null {
  try {
    const raw = sessionStorage.getItem(`${PENDING_MATCH_JOIN_PREFIX}${orderId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PendingMatchJoinPayment;
  } catch {
    return null;
  }
}

export function clearPendingMatchJoinPayment(orderId: string): void {
  sessionStorage.removeItem(`${PENDING_MATCH_JOIN_PREFIX}${orderId}`);
}

export async function startMatchJoinPayment(args: {
  matchId: string;
  amount: number;
  teamId: string;
  teamName: string;
}): Promise<void> {
  const { matchId, amount, teamId, teamName } = args;
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || "";
  if (!clientKey) {
    throw new Error("VITE_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("결제 금액이 올바르지 않습니다.");
  }

  const createPayment = httpsCallable(functions, "createPayment");
  const result = await createPayment({
    amount,
    orderName: `매치 참가비 · ${teamName}`,
    itemId: `match_${matchId}`,
    metadata: {
      type: "match_join",
      matchId,
      teamId,
      teamName,
    },
  });
  const data = result.data as CreatePaymentResponse;

  const pending: PendingMatchJoinPayment = {
    orderId: data.orderId,
    matchId,
    teamId,
    teamName,
    amount: data.amount,
  };
  sessionStorage.setItem(`${PENDING_MATCH_JOIN_PREFIX}${data.orderId}`, JSON.stringify(pending));

  const tossPayments = await loadTossPayments(clientKey);
  const origin = window.location.origin;
  await tossPayments.requestPayment("카드", {
    amount: data.amount,
    orderId: data.orderId,
    orderName: `매치 참가비 · ${teamName}`,
    successUrl: `${origin}/match/payment/success?orderId=${encodeURIComponent(
      data.orderId
    )}&paymentKey={paymentKey}&amount=${encodeURIComponent(String(data.amount))}`,
    failUrl: `${origin}/match/payment/fail?orderId=${encodeURIComponent(data.orderId)}&matchId=${encodeURIComponent(matchId)}&code={code}&message={message}`,
  });
}

