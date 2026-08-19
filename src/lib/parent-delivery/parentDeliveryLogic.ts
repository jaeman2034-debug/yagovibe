import type { ParentDeliverySettings } from "@/lib/parent-delivery/parentDeliveryTypes";

export function shouldAutoSendParentDelivery(settings: ParentDeliverySettings): boolean {
  return settings.autoSendEnabled && settings.sendChannel !== "manual";
}

export function describeAutoSendSettings(settings: ParentDeliverySettings): string {
  if (!settings.autoSendEnabled) return "수동 전달 (자동 발송 꺼짐)";
  if (settings.sendChannel === "manual") return "수동 전달";
  return `자동 발송 · ${settings.sendChannel} (Mock)`;
}
