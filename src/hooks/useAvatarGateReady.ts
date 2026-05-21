import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * 비익명 로그인 사용자의 `avatars/{uid}` 존재 여부 (가드용 1회 조회).
 * uid 없음·익명은 게이트 생략 → 즉시 ready + hasDoc true.
 */
export function useAvatarGateReady(uid: string | undefined, skip: boolean) {
  const [checking, setChecking] = useState(() => !skip);
  const [hasAvatarDoc, setHasAvatarDoc] = useState(() => Boolean(skip));

  useEffect(() => {
    if (skip || !uid) {
      setChecking(false);
      setHasAvatarDoc(true);
      return;
    }

    let cancelled = false;
    setChecking(true);
    setHasAvatarDoc(false);
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "avatars", uid));
        if (!cancelled) {
          setHasAvatarDoc(snap.exists());
          setChecking(false);
        }
      } catch {
        if (!cancelled) {
          setHasAvatarDoc(false);
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, skip]);

  return { hasAvatarDoc, checking };
}
