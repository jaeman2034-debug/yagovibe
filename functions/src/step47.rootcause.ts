import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fetch from "node-fetch";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const AUDIO_FEATURES_URL = process.env.AUDIO_FEATURES_URL || 
    "https://step47-audio-features-asia-northeast3-xxxxx.run.app/analyze";

interface AudioFeatures {
    sr: number;
    duration_sec: number;
    rms_mean: number;
    zcr_mean: number;
    centroid_mean: number;
    snr_db: number;
    speech_blocks_per_min: number;
}

interface RootCause {
    label: string;
    score: number;
    evidence: string[];
}

/**
 * Step 47: Root Cause 분석기
 * teams/{teamId}/reports/{reportId}/qualityReports/{ts} 생성 시 트리거
 */
export const rootcauseAnalyzer = onDocumentCreated(
    {
        document: "teams/{teamId}/reports/{reportId}/qualityReports/{ts}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const { teamId, reportId, ts } = event.params;
            const data = event.data?.data();

            if (!data || !data.metrics) {
                logger.warn("⚠️ 품질 리포트 데이터가 없습니다:", { teamId, reportId, ts });
                return;
            }

            logger.info("🔍 Root Cause 분석 시작:", { teamId, reportId, ts });

            const reportRef = db.collection("teams").doc(teamId)
                .collection("reports").doc(reportId);

            // 1) 리포트 메타데이터 가져오기
            const reportDoc = await reportRef.get();
            if (!reportDoc.exists) {
                logger.warn("⚠️ 리포트 문서가 없습니다:", { teamId, reportId });
                return;
            }

            const r = reportDoc.data();
            const audioUrl = r?.audioUrl;

            // 오디오 특징 추출 (이미 캐시되어 있으면 스킵)
            let audio: AudioFeatures | null = null;

            if (audioUrl && !r?.audioFeatures) {
                try {
                    logger.info("🎵 오디오 특징 추출 중:", { audioUrl });

                    const response = await fetch(AUDIO_FEATURES_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ audio_url: audioUrl, target_sr: 16000 }),
                        timeout: 60000, // 60초 타임아웃
                    });

                    if (response.ok) {
                        audio = await response.json() as AudioFeatures;
                        // 캐시 저장 (재분석 방지)
                        await reportRef.set({ audioFeatures: audio }, { merge: true });
                        logger.info("✅ 오디오 특징 추출 완료:", audio);
                    } else {
                        logger.error("❌ 오디오 특징 추출 실패:", await response.text());
                    }
                } catch (error) {
                    logger.error("❌ 오디오 특징 추출 오류:", error);
                }
            } else if (r?.audioFeatures) {
                // 캐시된 오디오 특징 사용
                audio = r.audioFeatures as AudioFeatures;
                logger.info("📦 캐시된 오디오 특징 사용");
            }

            // 2) 텍스트 키워드 통계 (최근 N=20개 품질 리포트)
            const N = 20;
            const qs = await db.collectionGroup("qualityReports")
                .where("reportId", "==", reportId)
                .orderBy("createdAt", "desc")
                .limit(N)
                .get();

            const keywords = Array.isArray(r?.keywords) ? r.keywords : [];
            const txtSignals = {
                keywordHits: keywords.reduce((acc: Record<string, number>, k: string) => {
                    acc[k] = 0;
                    return acc;
                }, {} as Record<string, number>),
            };

            // 키워드 빈도 측정
            if (r?.content) {
                for (const k of keywords) {
                    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const re = new RegExp(escaped, "gi");
                    txtSignals.keywordHits[k] = (r.content.match(re) || []).length;
                }
            }

            // 3) 상관/규칙 기반 원인 추정
            const m = data.metrics || {};
            const causes: RootCause[] = [];

            // (a) 노이즈/마이크 문제 추정
            if (audio?.snr_db !== undefined && audio.snr_db < 12) {
                causes.push({
                    label: "마이크 노이즈/SNR 저하",
                    score: Math.min(1, (12 - audio.snr_db) / 10),
                    evidence: [
                        `SNR ${audio.snr_db.toFixed(1)} dB (임계 < 12dB)`,
                        `overallScore ${m.overallScore?.toFixed?.(2) || "N/A"}`,
                    ],
                });
            }

            // (b) 말속도 문제 (과속/과도한 무성)
            if (audio?.speech_blocks_per_min) {
                if (audio.speech_blocks_per_min > 180) {
                    causes.push({
                        label: "발화 속도 과다",
                        score: 0.7,
                        evidence: [`blocks/min ${audio.speech_blocks_per_min.toFixed(0)} > 180`],
                    });
                } else if (audio.speech_blocks_per_min < 60) {
                    causes.push({
                        label: "발화 속도 저하",
                        score: 0.6,
                        evidence: [`blocks/min ${audio.speech_blocks_per_min.toFixed(0)} < 60`],
                    });
                }
            }

            // (c) Coverage 저하 ↔ 키워드 편중
            const highHits = Object.entries(txtSignals.keywordHits)
                .filter(([k, v]) => v >= 3)
                .map(([k]) => k);

            if ((m.coverage || 0) < 0.92 && highHits.length >= 1) {
                causes.push({
                    label: "키워드 편중으로 인한 인식 불균형",
                    score: 0.5,
                    evidence: [
                        `coverage ${((m.coverage || 0) * 100).toFixed(1)}%`,
                        `keywords: ${highHits.join(", ")}`,
                    ],
                });
            }

            // (d) Overlaps/Gaps 과다 ↔ 무성/유성 변동성
            if ((m.gaps || 0) > 10) {
                causes.push({
                    label: "무성 구간 과다 (발화 끊김)",
                    score: 0.6,
                    evidence: [`gaps ${m.gaps}`],
                });
            }

            if ((m.overlaps || 0) > 8) {
                causes.push({
                    label: "타임스탬프 중첩/정렬 불안정",
                    score: 0.6,
                    evidence: [`overlaps ${m.overlaps}`],
                });
            }

            // 정렬 및 상위 3개만 선택
            causes.sort((a, b) => b.score - a.score);
            const top = causes.slice(0, 3);

            // 4) Root Cause 카드 저장
            const card = {
                createdAt: new Date(),
                metrics: m,
                audio: audio || null,
                textSignals: txtSignals,
                causes: top,
                summary: top.length ? `${top[0].label} 가능성 높음` : "특이 원인 추정 불가",
            };

            await reportRef.collection("rootCauses").add(card);
            logger.info("✅ Root Cause 카드 저장 완료:", card);

            // 5) 팀 레벨 요약 저장 (최근 원인 지표)
            await db.doc(`teams/${teamId}`).set(
                { latestRootCause: { reportId, ...card } },
                { merge: true }
            );

            // 6) Slack 알림 (선택)
            if (SLACK_WEBHOOK && top.length > 0) {
                try {
                    const text = `🕵️ *Root Cause* (team: ${teamId}, report: ${reportId})\n` +
                        top.map((c) => `• ${c.label} (${(c.score * 100).toFixed(0)}%)`).join("\n");

                    await fetch(SLACK_WEBHOOK, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text }),
                    });
                    logger.info("✅ Slack 알림 발송 완료");
                } catch (error) {
                    logger.error("❌ Slack 알림 발송 실패:", error);
                }
            }

            // 7) Step 48: 튜닝 피드백 평가 (비동기, 에러 무시)
            try {
                const { evaluateTuningFeedback } = await import("./step48.tuningLoop");
                if (m.overallScore) {
                    evaluateTuningFeedback(teamId, reportId, m.overallScore).catch((err) => {
                        logger.warn("튜닝 피드백 평가 실패 (무시):", err);
                    });
                }
            } catch (error) {
                // import 실패 시 무시
            }

        } catch (error: any) {
            logger.error("❌ Root Cause 분석 오류:", error);
            // 에러를 throw하지 않음 (트리거가 실패해도 다른 프로세스에 영향 없도록)
        }
    }
);

