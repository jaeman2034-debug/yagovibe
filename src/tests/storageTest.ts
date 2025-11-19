import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { storage } from "@/lib/firebase";

async function testStorage() {
  try {
    const testBlob = new Blob(["Hello YAGO VIBE Storage!"], { type: "text/plain" });
    const testRef = ref(storage, `test/test_${Date.now()}.txt`);
    await uploadBytes(testRef, testBlob);
    const url = await getDownloadURL(testRef);
    console.log("✅ 업로드 성공! 다운로드 URL:", url);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
  }
}

testStorage();

