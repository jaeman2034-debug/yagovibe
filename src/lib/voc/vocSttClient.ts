import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("base64 변환 실패"));
        return;
      }
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader 오류"));
    reader.readAsDataURL(blob);
  });
}

export function formatVocSttError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code?: unknown }).code ?? "");
    const message =
      "message" in e && typeof (e as { message?: unknown }).message === "string"
        ? String((e as { message: string }).message)
        : "";

    if (code === "functions/unauthenticated") {
      return "로그인이 필요합니다.";
    }
    if (code === "functions/failed-precondition") {
      return message.includes("OPENAI_API_KEY")
        ? "STT 서버 설정(OPENAI_API_KEY)이 필요합니다."
        : message || "STT 사전 조건이 충족되지 않았습니다.";
    }
    if (code === "functions/invalid-argument") {
      return message || "녹음 파일 형식이 올바르지 않습니다.";
    }
    if (code === "functions/not-found" || code === "functions/unavailable") {
      return "STT 변환에 실패했습니다. Functions 배포 또는 로그를 확인해 주세요.";
    }
    if (code === "functions/internal") {
      return "STT 변환에 실패했습니다. Functions 배포 또는 로그를 확인해 주세요.";
    }
    if (message) return message;
  }

  if (e instanceof Error && e.message) return e.message;
  return "STT 변환에 실패했습니다. Functions 배포 또는 로그를 확인해 주세요.";
}

export async function transcribeVocAudio(blob: Blob): Promise<string> {
  if (blob.size < 64) {
    throw new Error("녹음 데이터가 비어 있습니다. 마이크 허용 후 다시 녹음해 주세요.");
  }
  if (blob.size > 24 * 1024 * 1024) {
    throw new Error("녹음 파일이 너무 큽니다 (Whisper 25MB 한도). 3분 이내로 녹음해 주세요.");
  }

  console.info("[VOC-STT] calling transcribeVocInterview", {
    bytes: blob.size,
    mimeType: blob.type || "audio/webm",
  });

  const base64 = await blobToBase64(blob);
  const callable = httpsCallable<
    { audioBase64: string; mimeType: string },
    { text: string }
  >(functions, "transcribeVocInterview");

  try {
    const res = await callable({
      audioBase64: base64,
      mimeType: blob.type || "audio/webm",
    });

    const text = res.data?.text?.trim();
    if (!text) throw new Error("STT 결과가 비어 있습니다. 더 크게 말씀해 주세요.");

    console.info("[VOC-STT] transcribe success", { chars: text.length });
    return text;
  } catch (e) {
    console.error("[VOC-STT] transcribe error", e);
    throw new Error(formatVocSttError(e));
  }
}
