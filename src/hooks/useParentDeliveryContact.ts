import { useCallback, useEffect, useState } from "react";
import {
  formatPhoneForDisplay,
  type ParentDeliveryContactInput,
} from "@/lib/parent-delivery/parentDeliveryContactLogic";
import {
  readParentDeliveryContact,
  writeParentDeliveryContact,
} from "@/lib/parent-delivery/parentDeliveryContacts";
import { resolveParentDeliveryContactDocId } from "@/lib/parent-delivery/parentDeliveryContactLogic";
import type { ParentDeliveryContact } from "@/lib/parent-delivery/parentDeliveryTypes";

export function useParentDeliveryContact(
  teamId: string,
  playerId: string,
  playerName: string
) {
  const [contact, setContact] = useState<ParentDeliveryContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const contactDocId = resolveParentDeliveryContactDocId(playerId, playerName);
  const rosterPlayerSelected = Boolean(playerId?.trim());

  const refresh = useCallback(async () => {
    if (!teamId) {
      setContact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const doc = await readParentDeliveryContact(teamId, playerId, playerName);
      setContact(doc);
    } catch (error) {
      console.warn("[useParentDeliveryContact] load failed", error);
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, playerId, playerName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save(input: ParentDeliveryContactInput) {
    setSaving(true);
    try {
      const next = await writeParentDeliveryContact(teamId, playerId, input, {
        displayName: playerName,
        existing: contact,
      });
      setContact(next);
      return next;
    } finally {
      setSaving(false);
    }
  }

  const initialForm = {
    parentName: contact?.parentName ?? "",
    parentPhone: contact?.parentPhone ? formatPhoneForDisplay(contact.parentPhone) : "",
    parentConsent: contact?.parentConsent ?? false,
  };

  return {
    contact,
    contactDocId,
    rosterPlayerSelected,
    loading,
    saving,
    refresh,
    save,
    initialForm,
    consentLocked: Boolean(contact?.parentConsent && contact?.parentConsentAt),
  };
}
