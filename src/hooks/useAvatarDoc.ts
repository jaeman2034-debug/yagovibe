import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeAvatarJerseyNumber } from "@/services/avatarService";
import type { AvatarDoc } from "@/types/avatar";

/** 스냅샷 → `AvatarDoc` (Firestore에서 jerseyNumber가 string 등으로 올 때도 정규화) */
function asAvatarDoc(data: Record<string, unknown> | undefined): AvatarDoc | null {
  if (!data || typeof data !== "object") return null;
  if (typeof data.schemaVersion !== "number" || typeof data.uid !== "string") return null;
  const jersey = normalizeAvatarJerseyNumber(data.jerseyNumber);
  const base = data as unknown as AvatarDoc;
  return jersey !== undefined ? { ...base, jerseyNumber: jersey } : { ...base, jerseyNumber: undefined };
}

/**
 * `avatars/{uid}` 실시간 구독 (Functions가 progression을 갱신하면 UI 반영).
 */
export function useAvatarDoc(uid: string | undefined, isAnonymous: boolean | undefined) {
  const [avatar, setAvatar] = useState<AvatarDoc | null>(null);
  const [loading, setLoading] = useState(Boolean(uid && !isAnonymous));

  useEffect(() => {
    if (!uid || isAnonymous) {
      setAvatar(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = doc(db, "avatars", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setAvatar(snap.exists() ? asAvatarDoc(snap.data() as Record<string, unknown>) : null);
        setLoading(false);
      },
      () => {
        setAvatar(null);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid, isAnonymous]);

  return { avatar, loading };
}
