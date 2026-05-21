import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase";

export type StripeCheckoutTier = "basic" | "pro";

/**
 * persistence 복원 직후 / WebKit 등에서 `currentUser` 가 한 틱 늦는 경우에 맞추기.
 * (`usePostAuthBootstrapGate` 와 동일한 의도)
 */
async function resolveCurrentUser() {
  try {
    await auth.authStateReady();
  } catch {
    /* ignore: 아래에서 currentUser 로 판단 */
  }
  if (auth.currentUser) {
    return auth.currentUser;
  }
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  return auth.currentUser;
}

/**
 * Stripe Checkout URL 반환 후 `window.location` 으로 이동하면 됨.
 * Vite: `VITE_STRIPE_PRICE_BASIC`, `VITE_STRIPE_PRICE_PRO` (Dashboard 의 price_…)
 */
export async function createStripeCheckoutForTeam(args: {
  teamId: string;
  tier: StripeCheckoutTier;
}): Promise<string> {
  const u = await resolveCurrentUser();
  if (!u) {
    throw new Error("로그인이 필요합니다. 다시 로그인한 뒤 업그레이드를 시도해 주세요.");
  }
  // Callable에 ID 토큰을 붙이기 위한 최소 보장. `getIdToken(true)` 는 매번 securetoken(GrantToken)을
  // 때려 일부 환경(광고차단, API 키 리퍼러 제한)에서 막혀 "세션 무효"로 잘못 실패할 수 있음
  // — TeamRosterPhaseCard, refereeRoleRepository 와 동일한 의도.
  try {
    await u.getIdToken();
  } catch {
    throw new Error("로그인 세션이 유효하지 않습니다. 다시 로그인해 주세요.");
  }

  const priceId =
    args.tier === "basic"
      ? String(import.meta.env.VITE_STRIPE_PRICE_BASIC || "").trim()
      : String(import.meta.env.VITE_STRIPE_PRICE_PRO || "").trim();
  const callable = httpsCallable(functions, "createCheckoutSession");
  const payload = priceId ? { teamId: args.teamId, priceId, tier: args.tier } : { teamId: args.teamId, tier: args.tier };
  const res = await callable(payload);
  const data = res.data as { url?: string } | undefined;
  const url = data?.url?.trim();
  if (!url) {
    throw new Error("Checkout URL을 받지 못했습니다.");
  }
  return url;
}
