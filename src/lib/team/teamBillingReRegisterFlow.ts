import { httpsCallable } from "firebase/functions";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { functions } from "@/lib/firebase";

type PrepareBillingResponse = {
  customerKey: string;
  teamId: string;
  successUrl: string;
  failUrl: string;
};

/** 자동결제 카드 재등록: 서버에서 customerKey·리다이렉트 URL 발급 후 Toss 빌링 인증창 */
export async function startTeamBillingReRegister(teamId: string): Promise<void> {
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY || "";
  if (!clientKey) {
    throw new Error("VITE_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
  }

  const prepare = httpsCallable(functions, "tossTeamBillingPrepare");
  const result = await prepare({
    teamId,
    origin: window.location.origin,
  });
  const data = result.data as PrepareBillingResponse;
  if (!data?.customerKey || !data?.successUrl || !data?.failUrl) {
    throw new Error("카드 등록 정보를 받지 못했습니다.");
  }

  const tossPayments = await loadTossPayments(clientKey);
  await tossPayments.requestBillingAuth("카드", {
    customerKey: data.customerKey,
    successUrl: data.successUrl,
    failUrl: data.failUrl,
  });
}
