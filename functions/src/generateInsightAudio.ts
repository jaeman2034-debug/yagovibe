import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getDefaultStorageBucket } from "./lib/defaultStorageBucket";
import OpenAI from "openai";
import { sendSlack } from "./slack";
import { logWorkflowEvent } from "./logWorkflowEvent";
import { sendSlackAlert } from "./slackAlertHandler";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/**
 * Step 21: AI 주간 인사이트 음성 변환 및 Slack 알림
 * insights/weekly 문서 생성/업데이트 시 TTS로 변환하고 Slack 알림 전송
 */
export const generateInsightAudio = onDocumentWritten(
  {
    document: "insights/weekly",
    region: "asia-northeast3",
    timeoutSeconds: 120,
  },
  async (event) => {
    const startTime = Date.now();
    try {
      const after = event.data?.after?.data();
      const before = event.data?.before?.data();

      // 문서가 삭제되었거나 content가 없으면 건너뛰기
      if (!after?.content) {
        logger.info("ℹ️ content가 없거나 문서가 삭제되었습니다.");
        return;
      }

      // 이미 ttsUrl이 있고 내용이 변경되지 않았으면 건너뛰기 (중복 생성 방지)
      // 첫 생성 시 before가 없을 수 있으므로 before 존재 여부 확인
      if (after.ttsUrl && before && before.content === after.content) {
        logger.info("ℹ️ 이미 음성 파일이 존재하고 내용이 변경되지 않았습니다. 건너뜁니다.");
        return;
      }

      logger.info("🎧 주간 인사이트 생성/업데이트 감지, TTS 음성 변환 시작");

      if (!process.env.OPENAI_API_KEY) {
        logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않았습니다. TTS 생성을 건너뜁니다.");
        return;
      }

      // JSON 파싱 시도 (구조화된 형식)
      let ttsText = after.content;
      try {
        const jsonMatch = after.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const parts: string[] = [];

          if (parsed.trends) {
            parts.push(`이번 주 주요 트렌드는 다음과 같습니다. ${parsed.trends}`);
          }

          if (parsed.keywords && Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
            parts.push(`주요 키워드는 ${parsed.keywords.join(", ")} 입니다.`);
          }

          if (parsed.predictions && Array.isArray(parsed.predictions) && parsed.predictions.length > 0) {
            parts.push(`예측 포인트는 다음과 같습니다. ${parsed.predictions.join(" 그리고 ")}`);
          }

          if (parts.length > 0) {
            ttsText = parts.join(" ");
          }
        }
      } catch (e) {
        // JSON 파싱 실패 시 원본 텍스트 사용
        logger.info("JSON 파싱 실패, 원본 텍스트 사용");
      }

      // OpenAI TTS API로 음성 생성
      logger.info("🎤 OpenAI TTS 생성 시작");

      const speech = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: ttsText.slice(0, 4000), // 최대 4000자 제한
        response_format: "mp3",
      });

      const audioBuffer = Buffer.from(await speech.arrayBuffer());
      const mp3Path = `audio/insights/weekly.mp3`;

      // Firebase Storage에 업로드
      await getDefaultStorageBucket().file(mp3Path).save(audioBuffer, {
        contentType: "audio/mpeg",
        resumable: false,
        metadata: {
          cacheControl: "public, max-age=3600",
          metadata: {
            generatedAt: new Date().toISOString(),
            type: "weekly_insight",
          },
        },
      });

      logger.info("✅ MP3 파일 Storage 업로드 완료:", mp3Path);

      // Signed URL 생성 (30일 유효)
      const [ttsUrl] = await getDefaultStorageBucket().file(mp3Path).getSignedUrl({
        action: "read",
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      // Firestore 문서 업데이트
      await event.data?.after?.ref.update({
        ttsUrl: ttsUrl,
        ttsGeneratedAt: FieldValue.serverTimestamp(),
      });

      logger.info("✅ Firestore에 TTS URL 업데이트 완료");

      // Slack 알림 전송
      try {
        const reportCount = after.reportCount || 0;
        const generatedAt = after.generatedAt?.toDate
          ? after.generatedAt.toDate().toISOString().slice(0, 10)
          : after.createdAt?.toDate
          ? after.createdAt.toDate().toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);

        const message = {
          text: `🎧 *AI 인사이트 음성 리포트*\n\n📅 생성일: ${generatedAt}\n📊 리포트 ${reportCount}개 분석\n\n🎙 아래 버튼을 눌러 음성으로 들어보세요!`,
          attachments: [
            {
              fallback: "음성 리포트 듣기",
              color: "#36a64f",
              actions: [
                {
                  type: "button",
                  text: "🔊 음성 듣기",
                  url: ttsUrl,
                  style: "primary",
                },
              ],
            },
          ],
        };

        await sendSlack(message);
        logger.info("✅ Slack 알림 전송 완료");
      } catch (slackError: any) {
        logger.error("❌ Slack 알림 전송 오류:", slackError);
        // Slack 오류는 전체 프로세스를 실패시키지 않음
      }
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateInsightAudio", "success", duration);
    } catch (error: any) {
      logger.error("❌ 주간 인사이트 TTS 생성 오류:", error);
      const duration = Date.now() - startTime;
      await logWorkflowEvent("generateInsightAudio", "error", duration, error.message);
      await sendSlackAlert(`🚨 [generateInsightAudio] TTS 생성 오류: ${error.message}`);
      try {
        // 에러 로그 기록
        await db.collection("insights-log").add({
          createdAt: FieldValue.serverTimestamp(),
          event: "tts_generation_error",
          error: error.message,
          status: "error",
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

