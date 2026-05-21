import { normalizeTradeChatDocumentIdForRoute } from "@/features/chat/services/chatService";
import type { MessagePayload } from "firebase/messaging";

/**
 * 서버/레거시 경로를 앱이 실제로 쓰는 `/team/:id?...` 형태로 맞춤
 */
export function normalizeFcmRoutePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return trimmed;

  const [pathname, queryPart] = trimmed.split(/(?=\?)/);
  const search = queryPart && queryPart.startsWith("?") ? queryPart : "";
  const sp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : "");

  const overview = pathname.match(/^\/team\/([^/]+)\/overview\/?$/);
  if (overview) {
    const teamId = overview[1];
    return `/team/${teamId}?tab=home`;
  }

  const activity = pathname.match(/^\/team\/([^/]+)\/activities\/([^/]+)\/?$/);
  if (activity) {
    const [, teamId, activityId] = activity;
    const next = new URLSearchParams();
    next.set("tab", "schedule");
    next.set("activityId", activityId);
    if (sp.get("tab") === "attendance") {
      next.set("focus", "attendance");
    }
    return `/team/${teamId}?${next.toString()}`;
  }

  return trimmed;
}

/** FCM `data`에서 SPA 라우트 경로 추출 (웹 알림 클릭·포그라운드) */
export function resolveFcmDeepLinkRoute(
  data: MessagePayload["data"] | Record<string, string | undefined> | undefined
): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, string | undefined>;
  const messageId =
    typeof d.messageId === "string" && d.messageId.trim() ? d.messageId.trim() : "";
  const withMessage = (path: string) =>
    messageId ? `${path}${path.includes("?") ? "&" : "?"}messageId=${encodeURIComponent(messageId)}` : path;

  const route = d.route;
  if (typeof route === "string" && route.startsWith("/")) {
    const normalized = normalizeFcmRoutePath(route);
    if (!messageId || normalized.includes("messageId=")) return normalized;
    return withMessage(normalized);
  }

  const type = (d.type || "").toString();
  const teamId = d.teamId;
  if (
    teamId &&
    (type === "fee_reminder" || type === "billing_re_register_request")
  ) {
    return `/team/${encodeURIComponent(teamId)}?tab=home`;
  }
  const activityId = d.activityId;
  if (
    typeof teamId === "string" &&
    teamId &&
    (type === "activity_created" || type === "team_notice") &&
    typeof activityId === "string" &&
    activityId
  ) {
    const base = `/team/${encodeURIComponent(teamId)}?tab=schedule&activityId=${encodeURIComponent(activityId)}`;
    return withMessage(base);
  }
  if (type === "attendance_updated" && typeof teamId === "string" && teamId && typeof activityId === "string") {
    const base = `/team/${encodeURIComponent(teamId)}?tab=schedule&activityId=${encodeURIComponent(activityId)}&focus=attendance`;
    return withMessage(base);
  }
  if (type === "parent_link_created" && typeof teamId === "string" && teamId) {
    const base = `/team/${encodeURIComponent(teamId)}?tab=home`;
    return withMessage(base);
  }
  if (type === "TEAM_JOIN_APPROVED" && typeof teamId === "string" && teamId) {
    const base = `/team/${encodeURIComponent(teamId)}?onboarding=1`;
    return withMessage(base);
  }

  const chatId = d.chatId;
  if (typeof chatId === "string" && chatId) {
    return withMessage(`/app/chat/${normalizeTradeChatDocumentIdForRoute(chatId)}`);
  }
  const roomId = d.roomId;
  if (typeof roomId === "string" && roomId) return withMessage(`/chat/${roomId}`);
  return null;
}
