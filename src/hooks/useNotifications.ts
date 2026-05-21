import { useMemo } from "react";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import { usePlatformNotifications } from "@/hooks/usePlatformNotifications";
import type { Notification } from "@/types/notification";

export interface UseNotificationsOptions {
  /** 기본 20 */
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * 내 알림 목록 (실시간). `userId`는 보통 `auth.uid`와 같아야 규칙상 조회됩니다.
 * 기존 `usePlatformNotifications`와 동일한 Firestore 구독을 쓰며, API만 단순화합니다.
 */
export function useNotifications(
  userId: string | undefined | null,
  options?: UseNotificationsOptions
) {
  const { user } = useAuthForFirestore();
  const limit = options?.limit ?? 20;
  const unreadOnly = options?.unreadOnly ?? false;

  const platform = usePlatformNotifications({
    limitCount: limit,
    unreadOnly,
  });

  const selfOnly = Boolean(userId && user?.uid === userId);

  return useMemo(() => {
    const empty: Notification[] = [];
    if (!selfOnly) {
      return {
        items: empty,
        unreadCount: 0,
        loading: false,
        markAsRead: platform.markAsRead,
        markAllAsRead: platform.markAllAsRead,
      };
    }
    return {
      items: platform.notifications,
      unreadCount: platform.unreadCount,
      loading: platform.loading,
      markAsRead: platform.markAsRead,
      markAllAsRead: platform.markAllAsRead,
    };
  }, [
    selfOnly,
    platform.notifications,
    platform.unreadCount,
    platform.loading,
    platform.markAsRead,
    platform.markAllAsRead,
  ]);
}
