import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

interface PolicyRule {
    metric: string;
    operator: "<" | ">" | "<=" | ">=" | "==";
    value: number;
    action: "alert" | "block_risky_ops" | "tune_system" | "block_all" | "escalate";
}

interface PolicyActions {
    alert?: {
        notifySlack?: boolean;
        notifyEmail?: boolean;
    };
    block_risky_ops?: {
        disableIntent?: string[];
    };
    tune_system?: {
        invoke?: string;
    };
}

interface PolicyDocument {
    policyId: string;
    rules?: PolicyRule[];
    actions?: PolicyActions;
}

/**
 * Step 56: Governance Policy Engine
 * governance/{date} 문서 생성/업데이트 시 정책 룰셋을 평가하고 자동 조치 실행
 */
export const governancePolicyEngine = onDocumentWritten(
    {
        document: "governance/{date}",
        region: "asia-northeast3",
    },
    async (event) => {
        try {
            const data = event.data?.after?.data();

            if (!data) {
                logger.info("⚠️ 문서가 삭제되었거나 데이터가 없습니다.");
                return;
            }

            logger.info("🔍 Governance Policy Engine 실행:", { date: data.date });

            // 정책 룰셋 로드
            const polSnap = await db.doc("policies/governance").get();
            const policy: PolicyDocument = polSnap.data() || {
                policyId: "default-governance",
                rules: [
                    { metric: "passRate", operator: "<", value: 0.9, action: "alert" },
                    { metric: "copilotReliability", operator: "<", value: 0.85, action: "alert" },
                    { metric: "regressionCount", operator: ">", value: 3, action: "block_risky_ops" },
                    { metric: "avgLatency", operator: ">", value: 500, action: "tune_system" },
                ],
                actions: {
                    alert: { notifySlack: true, notifyEmail: true },
                    block_risky_ops: { disableIntent: ["retuning", "deploy_model"] },
                    tune_system: { invoke: "tuningLoop" },
                },
            };

            const rules = policy.rules || [];
            const actions = policy.actions || {};
            const triggered: PolicyRule[] = [];

            // 비교 함수
            function compare(v: any, op: string, target: any): boolean {
                switch (op) {
                    case "<":
                        return v < target;
                    case ">":
                        return v > target;
                    case "<=":
                        return v <= target;
                    case ">=":
                        return v >= target;
                    case "==":
                        return v == target;
                    default:
                        return false;
                }
            }

            // 규칙 평가
            for (const r of rules) {
                const v = data[r.metric];
                if (v !== undefined && compare(v, r.operator, r.value)) {
                    triggered.push(r);
                    logger.warn(`⚠️ 규칙 트리거: ${r.metric} ${r.operator} ${r.value} (현재값: ${v}) → ${r.action}`);
                }
            }

            if (!triggered.length) {
                logger.info("✅ 모든 규칙 통과, 조치 없음");
                return;
            }

            // 경고 메시지 생성
            const msgs = triggered
                .map((t) => `• ${t.metric} ${t.operator} ${t.value} (현재: ${data[t.metric]}) → ${t.action}`)
                .join("\n");
            const text = `⚠️ Governance Alert\n날짜: ${data.date}\n트리거 규칙:\n${msgs}`;

            logger.warn("🚨 Governance Alert:", { triggered: triggered.length, text });

            // 1. Slack 알림
            if (triggered.some((t) => t.action === "alert") && actions.alert?.notifySlack && process.env.SLACK_WEBHOOK_URL) {
                try {
                    await fetch(process.env.SLACK_WEBHOOK_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text }),
                    });
                    logger.info("✅ Slack 알림 발송 완료");
                } catch (error) {
                    logger.error("❌ Slack 알림 발송 실패:", error);
                }
            }

            // 2. Email 경보
            if (triggered.some((t) => t.action === "alert") && actions.alert?.notifyEmail && process.env.SMTP_USER) {
                try {
                    const transporter = nodemailer.createTransport({
                        service: "gmail",
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS,
                        },
                    });

                    await transporter.sendMail({
                        from: process.env.SMTP_USER,
                        to: process.env.ALERT_EMAIL_TO || process.env.MAIL_TO || "admin@yago-vibe.com",
                        subject: "[YAGO] Governance Alert",
                        text: text,
                    });
                    logger.info("✅ Email 알림 발송 완료");
                } catch (error) {
                    logger.error("❌ Email 알림 발송 실패:", error);
                }
            }

            // 3. 위험 명령 차단
            if (triggered.some((t) => t.action === "block_risky_ops")) {
                const disabled = actions.block_risky_ops?.disableIntent || [];
                await db.doc("policies/runtimeOps").set(
                    {
                        disabled,
                        updatedAt: Timestamp.now(),
                        reason: `Governance Policy: ${triggered.filter((t) => t.action === "block_risky_ops").map((t) => `${t.metric} ${t.operator} ${t.value}`).join(", ")}`,
                    },
                    { merge: true }
                );
                logger.warn("🚫 위험 명령 차단:", { disabled });
            }

            // 4. 자동 튜닝
            if (triggered.some((t) => t.action === "tune_system")) {
                const invokeUrl = actions.tune_system?.invoke || "tuningLoop";
                const functionsOrigin = process.env.FUNCTIONS_ORIGIN || 
                    `https://asia-northeast3-${process.env.GCLOUD_PROJECT || "yago-vibe-spt"}.cloudfunctions.net`;
                
                try {
                    const response = await fetch(`${functionsOrigin}/${invokeUrl}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        logger.info("✅ 자동 튜닝 트리거 완료");
                    } else {
                        logger.error("⚠️ 자동 튜닝 트리거 실패:", await response.text());
                    }
                } catch (error) {
                    logger.error("❌ 자동 튜닝 트리거 오류:", error);
                }
            }

            // 5. 모든 명령 차단 (긴급 상황)
            if (triggered.some((t) => t.action === "block_all")) {
                await db.doc("policies/runtimeOps").set(
                    {
                        disabled: ["*"], // 모든 명령 차단
                        updatedAt: Timestamp.now(),
                        reason: `Governance Policy: 긴급 상황 - 모든 명령 차단`,
                    },
                    { merge: true }
                );
                logger.error("🚨 모든 명령 차단 (긴급 상황)");
            }

            // 6. 감사 로그 저장
            await db.collection("alerts").add({
                createdAt: Timestamp.now(),
                type: "governance",
                severity: triggered.some((t) => t.action === "block_all") ? "critical" : 
                         triggered.some((t) => t.action === "block_risky_ops") ? "high" : "medium",
                message: text,
                rulesTriggered: triggered.map((t) => ({
                    metric: t.metric,
                    operator: t.operator,
                    value: t.value,
                    currentValue: data[t.metric],
                    action: t.action,
                })),
                governanceDate: data.date,
                resolved: false,
            });

            logger.info("✅ Governance Policy Engine 완료:", {
                triggered: triggered.length,
                actions: triggered.map((t) => t.action).join(", "),
            });

        } catch (error: any) {
            logger.error("❌ Governance Policy Engine 오류:", error);
            // 에러는 재시도 가능하므로 예외 전파하지 않음
        }
    }
);

