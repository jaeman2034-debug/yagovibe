import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

const filePath = "C:/Users/samsung256g/Desktop/test.jpg";
const endpoint = "http://127.0.0.1:5001/yago-vibe-spt/asia-northeast3/visionAnalyze";

const form = new FormData();
form.append("image", fs.createReadStream(filePath));

console.log("📤 Vision Analyze 요청 중...");

try {
  const res = await fetch(endpoint, { method: "POST", body: form });
  const text = await res.text();
  console.log("✅ 서버 응답:\n", text);
} catch (err) {
  console.error("❌ 요청 실패:", err);
}

