/**
 * 알림 관리 Context Provider
 * 
 * 경기 알림을 설정/해제하는 기능을 제공합니다.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { DateIntent } from "@/utils/parseDateIntent";

export interface NotificationItem {
  id: string;
  target: "team" | "player" | "game";
  name?: string;
  date?: DateIntent;
  sport?: string;
  createdAt: number;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, "id" | "createdAt">) => void;
  removeNotification: (idOrName: string) => void;
  hasNotification: (name: string) => boolean;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
  hasNotification: () => false,
});

export const useNotifications = () => useContext(NotificationsContext);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "createdAt">) => {
      const newNotification: NotificationItem = {
        ...item,
        id: `${item.target}-${item.name || "game"}-${Date.now()}`,
        createdAt: Date.now(),
      };

      setNotifications((prev) => {
        // 중복 체크 (같은 이름의 알림이 이미 있으면 추가하지 않음)
        const exists = prev.some(
          (n) => n.target === item.target && n.name === item.name
        );
        if (exists) {
          console.log(
            `⚠️ [Notifications] ${item.name} 알림은 이미 설정되어 있습니다.`
          );
          return prev;
        }
        console.log(
          `✅ [Notifications] ${item.name || "경기"} 알림을 설정했습니다.`
        );
        return [...prev, newNotification];
      });
    },
    []
  );

  const removeNotification = useCallback((idOrName: string) => {
    setNotifications((prev) => {
      const filtered = prev.filter(
        (n) => n.id !== idOrName && n.name !== idOrName
      );
      if (filtered.length === prev.length) {
        console.log(
          `⚠️ [Notifications] ${idOrName} 알림을 찾을 수 없습니다.`
        );
        return prev;
      }
      console.log(`✅ [Notifications] ${idOrName} 알림을 해제했습니다.`);
      return filtered;
    });
  }, []);

  const hasNotification = useCallback(
    (name: string) => {
      return notifications.some((n) => n.name === name);
    },
    [notifications]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        hasNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

