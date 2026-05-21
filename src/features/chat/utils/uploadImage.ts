import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const storage = getStorage();

/**
 * Upload chat image under the given pathPrefix (e.g., "chat/{chatId}")
 * This aligns with Storage rules that allow writes under /chat/** paths.
 */
export async function uploadChatImage(file: File, pathPrefix: string = "chat"): Promise<string> {
  const safeName = file.name.replace(/\s+/g, "_");
  const folder = pathPrefix.endsWith("/") ? pathPrefix.slice(0, -1) : pathPrefix;
  const fileRef = ref(storage, `${folder}/${Date.now()}_${safeName}`);
  const metadata = { contentType: file.type || "image/jpeg" };
  await uploadBytes(fileRef, file, metadata);
  return await getDownloadURL(fileRef);
}

