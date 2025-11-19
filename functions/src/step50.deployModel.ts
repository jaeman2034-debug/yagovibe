import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import fetch from "node-fetch";

const RUN_URL = process.env.CLOUD_RUN_PREDICTOR_URL || 
    process.env.PREDICTOR_URL || 
    "https://quality-predictor-asia-northeast3-xxxxx.run.app";
const MODEL_BUCKET = process.env.MODEL_BUCKET || "yago-models";

interface GCSObject {
    name: string;
    updated: string;
    metadata?: {
        rmse?: string;
        mae?: string;
        data_count?: string;
    };
}

interface GCSResponse {
    items?: GCSObject[];
}

/**
 * Step 50: Adaptive Learning Orchestrator
 * 매일 실행하여 최신 모델을 자동 배포
 */
export const deployUpdatedModel = onSchedule(
    {
        schedule: "every 24 hours",
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
    },
    async () => {
        try {
            logger.info("🔄 모델 자동 배포 시작...");

            // GCS 버킷에서 최신 모델 파일 찾기
            const listUrl = `https://storage.googleapis.com/storage/v1/b/${MODEL_BUCKET}/o?prefix=quality-predictor/model_`;
            
            const res = await fetch(listUrl);
            if (!res.ok) {
                throw new Error(`GCS 목록 조회 실패: ${res.statusText}`);
            }

            const json: GCSResponse = await res.json();
            const items = json.items || [];

            if (items.length === 0) {
                logger.info("⚠️ 배포할 모델이 없습니다.");
                return;
            }

            // 최신 모델 찾기 (updated 기준 내림차순 정렬)
            const latest = items.sort((a, b) => 
                new Date(b.updated).getTime() - new Date(a.updated).getTime()
            )[0];

            if (!latest) {
                logger.info("⚠️ 유효한 모델 파일이 없습니다.");
                return;
            }

            logger.info(`📦 최신 모델 발견: ${latest.name} (${latest.updated})`);

            // 모델 URL 구성
            const model_url = `gs://${MODEL_BUCKET}/${latest.name}`;
            
            // Cloud Run 서비스에 모델 재로드 요청
            const reloadUrl = `${RUN_URL}/reload-model`;
            
            try {
                const reloadRes = await fetch(reloadUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model_url }),
                    timeout: 60000, // 60초 타임아웃
                });

                if (reloadRes.ok) {
                    const result = await reloadRes.json();
                    logger.info(`✅ 모델 배포 완료: ${latest.name}`, result);
                    
                    // 배포 이력 저장 (선택)
                    // await db.collection("modelDeployments").add({
                    //     modelName: latest.name,
                    //     modelUrl: model_url,
                    //     deployedAt: new Date(),
                    //     metadata: latest.metadata,
                    // });
                } else {
                    const errorText = await reloadRes.text();
                    throw new Error(`모델 재로드 실패: ${reloadRes.statusText} - ${errorText}`);
                }
            } catch (error) {
                logger.error(`❌ 모델 재로드 오류:`, error);
                throw error;
            }

            logger.info("✅ 모델 자동 배포 완료");
        } catch (error: any) {
            logger.error("❌ 모델 자동 배포 오류:", error);
            throw error;
        }
    }
);

