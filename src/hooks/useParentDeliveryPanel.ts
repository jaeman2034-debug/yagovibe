import { useCallback, useEffect, useState } from "react";
import { listParentDeliveryLogsForSession } from "@/lib/parent-delivery/parentDeliveryLogs";
import {
  readParentDeliverySettings,
  writeParentDeliverySettings,
} from "@/lib/parent-delivery/parentDeliverySettings";
import type {
  ParentDeliveryLog,
  ParentDeliverySendChannel,
  ParentDeliverySettings,
} from "@/lib/parent-delivery/parentDeliveryTypes";
import { DEFAULT_PARENT_DELIVERY_SETTINGS } from "@/lib/parent-delivery/parentDeliveryTypes";

export function useParentDeliveryPanel(teamId: string, sessionDocId: string | null) {
  const [settings, setSettings] = useState<ParentDeliverySettings>(DEFAULT_PARENT_DELIVERY_SETTINGS);
  const [logs, setLogs] = useState<ParentDeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsPending, setSettingsPending] = useState(false);

  const refresh = useCallback(async () => {
    if (!teamId) {
      setSettings(DEFAULT_PARENT_DELIVERY_SETTINGS);
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        readParentDeliverySettings(teamId),
        sessionDocId
          ? listParentDeliveryLogsForSession(teamId, sessionDocId)
          : Promise.resolve([]),
      ]);
      setSettings(s);
      setLogs(l);
    } catch (error) {
      console.warn("[useParentDeliveryPanel] load failed", error);
    } finally {
      setLoading(false);
    }
  }, [teamId, sessionDocId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggleAutoSend(enabled: boolean) {
    setSettingsPending(true);
    try {
      const channel: ParentDeliverySendChannel = enabled ? "kakao" : "manual";
      const next = await writeParentDeliverySettings(teamId, {
        autoSendEnabled: enabled,
        sendChannel: enabled ? channel : "manual",
      });
      setSettings(next);
    } finally {
      setSettingsPending(false);
    }
  }

  return {
    settings,
    logs,
    loading,
    settingsPending,
    refresh,
    toggleAutoSend,
  };
}
