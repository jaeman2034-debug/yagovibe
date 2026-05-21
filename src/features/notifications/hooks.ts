/**
 * 🔔 YAGO 알림 훅 (React 훅)
 */

import { useEffect, useState } from "react";
import { subscribeNoti } from "./service";
import type { YagoNoti } from "./types";
import { useAuth } from "@/context/AuthProvider";

export function useNotifications() {
  const { user } = useAuth();
  const [list, setList] = useState<YagoNoti[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeNoti(user.uid, (notifications) => {
      setList(notifications);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  return {
    list,
    unreadCount: list.length,
    loading,
  };
}
