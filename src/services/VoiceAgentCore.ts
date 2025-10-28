import { analyzeCommand } from "./NLUService_AI";
import { executeMapAction } from "./VoiceMapAgent";
import { speakText } from "./TTSService";
import { logVoiceEvent, logVoiceAction } from "../lib/logging";

/**
 * 🎤 AI 음성 명령 처리 핵심 로직
 * STT → NLU → Action → TTS → Log 전 과정 자동화
 */
export async function handleVoiceCommand(text: string) {
    console.log("🎙️ 음성 명령 수신:", text);

    try {
        // 1️⃣ NLU 분석
        const plan = await analyzeCommand(text);
        console.log("🧠 NLU 분석 결과:", plan);

        // 2️⃣ 의도에 따른 액션 실행
        if (plan.intent.includes("축구장") || plan.intent.includes("편의점") || plan.intent.includes("카페") || plan.intent.includes("식당")) {
            const target = plan.target || "장소";
            speakText(`알겠습니다. ${target}을(를) 찾아볼게요.`);
            await executeMapAction(target);

            // 3️⃣ 로그 기록
            await logVoiceEvent({
                text,
                intent: plan.intent as any,
                keyword: target
            });
        } else if (plan.intent.includes("지도")) {
            speakText("지도를 열어드릴게요.");
            await executeMapAction("지도");
            await logVoiceEvent({
                text,
                intent: plan.intent as any,
                keyword: "지도"
            });
        } else {
            speakText("죄송하지만, 무슨 말씀인지 잘 모르겠어요.");
            await logVoiceEvent({
                text,
                intent: "미확인" as any
            });
        }
    } catch (error) {
        console.error("❌ 음성 명령 처리 오류:", error);
        speakText("죄송합니다. 처리 중 오류가 발생했습니다.");
    }
}
