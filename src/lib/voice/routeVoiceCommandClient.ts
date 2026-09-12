import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { RouteVoiceMapServerResult } from "./resolveVoiceMapIntent";

export const ROUTE_VOICE_COMMAND_CALLABLE = "routeVoiceCommand" as const;

type RouteVoiceCommandPayload = {
  text: string;
  surface?: "admin" | "voice_map";
};

type RouteVoiceCommandResponse = {
  intent?: string;
  keyword?: string;
  message?: string;
};

export async function callRouteVoiceCommandForMap(text: string): Promise<RouteVoiceMapServerResult | null> {
  const fn = httpsCallable<RouteVoiceCommandPayload, RouteVoiceCommandResponse>(
    functions,
    ROUTE_VOICE_COMMAND_CALLABLE
  );
  const { data } = await fn({ text, surface: "voice_map" });
  if (!data) return null;
  return { intent: data.intent, keyword: data.keyword };
}
