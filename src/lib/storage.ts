import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/lib/firebase";

/**
 * 📦 Firebase Storage 업로드 유틸리티
 */
const storage = getStorage(db.app);

export async function uploadReportToStorage(file: Blob, filename: string): Promise<string> {
    try {
        console.log("📤 Storage 업로드 시작:", filename);

        const storageRef = ref(storage, `reports/${filename}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        console.log("✅ Storage 업로드 완료:", downloadURL);
        return downloadURL;
    } catch (err) {
        console.error("❌ Storage 업로드 실패:", err);
        throw err;
    }
}

export async function uploadTextToStorage(content: string, filename: string): Promise<string> {
    try {
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        return await uploadReportToStorage(blob, filename);
    } catch (err) {
        console.error("❌ 텍스트 업로드 실패:", err);
        throw err;
    }
}

