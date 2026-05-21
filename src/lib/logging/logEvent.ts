import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type FederationLogType = "INVITE_CREATED" | "INVITE_ACCEPTED" | "ROLE_CHANGED";

interface LogEventParams {
  federationId: string;
  type: FederationLogType;
  actorId: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

export async function logEvent({
  federationId,
  type,
  actorId,
  targetId,
  metadata,
}: LogEventParams): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.warn("🚫 [logEvent] 차단: Firebase Auth 세션 없음 (addDoc 생략)", { federationId, type });
    return;
  }
  if (actorId !== user.uid) {
    console.warn("🚫 [logEvent] 차단: actorId ≠ currentUser.uid", { actorId, uid: user.uid, type });
    return;
  }

  try {
    console.log("🔥 [logEvent] called", { federationId, type, actorId, targetId });
    const logRef = collection(db, "federations", federationId, "logs");
    await addDoc(logRef, {
      type,
      actorId,
      targetId: targetId || null,
      metadata: metadata || {},
      createdAt: serverTimestamp(),
      writerUid: user.uid,
    });
    console.log("✅ [logEvent] written", { federationId, type });
  } catch (error) {
    console.error("❌ [logEvent] error:", { federationId, type, actorId, targetId, error });
  }
}

