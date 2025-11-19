import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function testFirestoreConnection() {
  try {
    const docRef = await addDoc(collection(db, "testConnection"), {
      message: "🚀 Firestore 연결 성공!",
      createdAt: serverTimestamp(),
    });
    console.log("✅ 테스트 문서 생성 성공:", docRef.id);
  } catch (err) {
    console.error("❌ Firestore 테스트 실패:", err);
  }
}


