import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { HubTeamPlanId } from "@/types/teamBilling";

type UpdateSubscriptionResult = {
  ok: true;
  mode: "price_update" | "cancel_at_period_end" | "noop";
  currentPriceId?: string;
  targetPriceId?: string;
  currentPlan?: HubTeamPlanId;
  targetPlan?: HubTeamPlanId;
  prorationBehavior?: "create_prorations" | "none";
  cancelAtPeriodEnd?: boolean;
};

export async function updateSubscriptionForTeam(args: {
  teamId: string;
  plan?: HubTeamPlanId;
  priceId?: string;
}): Promise<UpdateSubscriptionResult> {
  const callable = httpsCallable(functions, "updateSubscriptionForTeam");
  const res = await callable(args);
  return res.data as UpdateSubscriptionResult;
}

