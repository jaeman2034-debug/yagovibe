import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

export async function uploadBinary(
  path: string,
  data: Blob | Uint8Array | ArrayBuffer,
  contentType?: string,
) {
  const storageRef = ref(storage, path);
  const metadata = contentType ? { contentType } : undefined;
  const snapshot = await uploadBytes(storageRef, data as any, metadata);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path: snapshot.ref.fullPath };
}
