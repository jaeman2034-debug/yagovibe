import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AssociationNotificationType =
  | "COMMENT_RECEIVED"
  | "LIKE_RECEIVED"
  | "ASSOCIATION_JOINED"
  | "SYSTEM_NOTICE";

interface CreateAssociationNotificationInput {
  userId: string;
  type: AssociationNotificationType;
  title: string;
  body: string;
  associationId?: string;
  postId?: string;
}

export async function createAssociationNotification(input: CreateAssociationNotificationInput): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    target: input.postId
      ? { screen: "association_post", id: input.postId, params: input.associationId ? { associationId: input.associationId } : undefined }
      : input.associationId
        ? { screen: "association", id: input.associationId }
        : { screen: "home" },
    isRead: false,
    createdAt: serverTimestamp(),
    priority: "normal",
    payload: {
      associationId: input.associationId,
      postId: input.postId,
    },
  });
}

export async function notifyAssociationMembersNotice(input: {
  associationId: string;
  postId: string;
  title: string;
  userIds: string[];
}): Promise<void> {
  const uniqueUserIds = Array.from(new Set(input.userIds)).filter(Boolean);
  await Promise.all(
    uniqueUserIds.map((userId) =>
      createAssociationNotification({
        userId,
        type: "SYSTEM_NOTICE",
        title: "»õ °øÁö",
        body: input.title,
        associationId: input.associationId,
        postId: input.postId,
      })
    )
  );
}
