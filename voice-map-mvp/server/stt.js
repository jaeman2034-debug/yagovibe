import fs from "fs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Whisper STT로 음성 파일을 한국어 텍스트로 변환
 * @param {string} filePath - 업로드된 음성 파일 경로
 * @returns {Promise<string>} 변환된 텍스트
 */
export async function transcribeAudio(filePath) {
  try {
    // 💸 비용 최소화: whisper-1 사용 (가장 저렴하고 한국어 지원)
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1", // $0.006/분 (가장 저렴)
      language: "ko",
      response_format: "text", // 텍스트만 반환
    });

    return transcription;
  } catch (error) {
    console.error("Whisper STT 오류:", error);
    throw new Error(`STT 변환 실패: ${error.message}`);
  }
}
