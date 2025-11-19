import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";

type ProductPayload = Record<string, unknown>;

export async function uploadProduct(file: File, data: ProductPayload, userId: string) {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/\s+/g, "-");
  const fileRef = ref(storage, `marketProducts/${userId}/${timestamp}-${sanitizedName}`);

  await uploadBytes(fileRef, file);
  const downloadURL = await getDownloadURL(fileRef);

  const docData = {
    ...data,
    imageUrl: downloadURL,
    ownerId: userId,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, "marketProducts"), docData);
  return { id: docRef.id, ...docData };
}


