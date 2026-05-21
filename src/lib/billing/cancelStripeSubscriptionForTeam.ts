import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

type SubscriptionAction = "cancel" | "resume";

type CancelSubscriptionResult = {
  ok: true;
  teamId: string;
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number | null;
  action: SubscriptionAction;
};

export async function cancelStripeSubscriptionForTeam(args: {
  teamId: string;
  action: SubscriptionAction;
}): Promise<CancelSubscriptionResult> {
  const callable = httpsCallable(functions, "cancelSubscriptionForTeam");
  const res = await callable({ teamId: args.teamId, action: args.action });
  return res.data as CancelSubscriptionResult;
}

