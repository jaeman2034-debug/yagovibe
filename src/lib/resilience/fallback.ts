/**
 * Step 66: Fallback Model 체인
 * LLM 다운 시 대체 모델로 자동 전환
 */

type ModelConfig = {
    name: string;
    endpoint: string;
    timeout: number;
};

/**
 * 모델 호출 (실제 구현은 프로젝트에 맞게 조정)
 */
async function callModel(model: string, prompt: string): Promise<any> {
    // TODO: 실제 모델 API 호출
    // const response = await fetch(`${MODEL_ENDPOINTS[model]}`, {
    //     method: 'POST',
    //     body: JSON.stringify({ prompt }),
    //     timeout: 5000,
    // });
    // return await response.json();

    // 임시 구현
    throw new Error(`Model ${model} not available`);
}

/**
 * Fallback 체인으로 모델 호출
 */
export async function askWithFallback(
    prompt: string,
    chain: string[] = ["gpt-4o-mini", "gpt-4o", "claude-opus", "local-llm"]
): Promise<any> {
    let lastError: any = null;

    for (const model of chain) {
        try {
            const result = await Promise.race([
                callModel(model, prompt),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("timeout")), 5000)
                ),
            ]);

            // 성공 시 즉시 반환
            return result;
        } catch (e: any) {
            lastError = e;
            console.warn(`⚠️ Model ${model} failed:`, e.message);
            // 다음 모델로 계속
        }
    }

    // 모든 모델 실패 시 Fallback 메시지
    console.error("❌ All models failed, returning fallback message");
    return {
        error: "all_models_failed",
        message: "서비스 과부하로 간략 답변만 제공합니다.",
        fallback: true,
    };
}

/**
 * 특정 모델만 사용하는 Fallback (옵션)
 */
export async function askWithFallbackLimited(
    prompt: string,
    primaryModel: string,
    fallbackModels: string[] = ["gpt-4o-mini", "local-llm"]
): Promise<any> {
    try {
        return await callModel(primaryModel, prompt);
    } catch (e) {
        console.warn(`⚠️ Primary model ${primaryModel} failed, trying fallback`);
        return askWithFallback(prompt, fallbackModels);
    }
}

