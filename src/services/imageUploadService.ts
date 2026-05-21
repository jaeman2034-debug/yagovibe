/**
 * 🔥 상품 이미지 업로드 서비스
 * Blob → Firebase Storage → URL
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "@/lib/firebase";

export async function uploadProductImage(
  blob: Blob,
  userId: string,
  suffix: "main" | "thumb"
): Promise<string> {
  if (!storage) throw new Error("Firebase Storage is not initialized");
  if (!auth.currentUser) throw new Error("User not authenticated");

  const uid = auth.currentUser.uid;
  const timestamp = Date.now();
  const path = `marketProducts/${uid}/${timestamp}_${suffix}.webp`;
  const storageRef = ref(storage, path);

  const file = new File([blob], `product_${suffix}.webp`, { type: "image/webp" });
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
