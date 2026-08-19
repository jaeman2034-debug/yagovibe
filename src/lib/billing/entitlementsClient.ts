import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { EntitlementsClient, YagoProEntitlementClient } from "./entitlementsTypes";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseEntitlements(raw: unknown): EntitlementsClient | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const entitlements = Array.isArray(e.entitlements)
    ? e.entitlements.filter((x): x is YagoProEntitlementClient => typeof x === "string")
    : [];
  const tier = e.tier === "pro" ? "pro" : "free";
  const statusRaw = str(e.status);
  const status =
    statusRaw === "active" ||
    statusRaw === "trialing" ||
    statusRaw === "past_due" ||
    statusRaw === "canceled"
      ? statusRaw
      : "none";
  return {
    uid: str(e.uid),
    tier,
    status,
    isPro: e.isPro === true || tier === "pro",
    entitlements,
    subscriptionRenewalAt: num(e.subscriptionRenewalAt),
    maxTrendWindow: num(e.maxTrendWindow) ?? 5,
  };
}

export async function callGetEntitlements(uid?: string): Promise<EntitlementsClient> {
  const fn = httpsCallable<{ uid?: string }, { ok: boolean; entitlements: Record<string, unknown> }>(
    functions,
    "getEntitlements",
  );
  const res = await fn(uid ? { uid } : {});
  const parsed = parseEntitlements(res.data?.entitlements);
  if (!parsed) {
    throw new Error("구독 정보를 불러오지 못했습니다.");
  }
  return parsed;
}

export async function callCreateYagoProCheckout(interval: "month" | "year" = "month"): Promise<string> {
  const fn = httpsCallable<
    { interval?: string },
    { ok: boolean; url: string }
  >(functions, "createYagoProCheckoutSession");
  const res = await fn({ interval });
  const url = res.data?.url;
  if (!url) {
    throw new Error("결제 페이지를 열 수 없습니다.");
  }
  return url;
}

export function hasEntitlementClient(
  entitlements: EntitlementsClient | null,
  key: YagoProEntitlementClient,
): boolean {
  return Boolean(entitlements?.isPro && entitlements.entitlements.includes(key));
}
