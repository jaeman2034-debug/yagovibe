import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { writeAuditLog } from "./trace/traceLogger";

const db = getFirestore();

/**
 * Step 64: Governance Enforcer - Policy-as-Code 미들웨어
 * 모든 주요 HTTPS 함수에 사전 검사를 거는 미들웨어
 */
export async function enforce(service: string, teamId?: string, action?: string): Promise<void> {
    try {
        // 1) 정책 로드
        const polDoc = await db.doc("policies/default-governance").get();
        if (!polDoc.exists) {
            logger.warn("⚠️ 정책 문서가 없습니다. 기본 동작 허용");
            return;
        }

        const pol = polDoc.data() as any;
        if (!pol) {
            return;
        }

        // 2) 범위 체크
        const scopeServices = pol.scope?.services || [];
        if (scopeServices.length > 0 && !scopeServices.includes(service)) {
            logger.info(`📋 서비스 ${service}는 정책 범위에 포함되지 않음`);
            return; // 정책 범위에 없으면 기본 허용
        }

        // 3) 팀 스코프 체크
        const scopeTeams = pol.scope?.teams || [];
        if (scopeTeams.length > 0 && teamId) {
            if (!scopeTeams.includes("*") && !scopeTeams.includes(teamId)) {
                throw new Error(`blocked_by_policy:team_not_in_scope:${teamId}`);
            }
        }

        // 4) 차단된 Ops 확인
        const rtDoc = await db.doc("policies/runtimeOps").get();
        const rt = rtDoc.exists ? rtDoc.data() : null;
        const disabled: string[] = rt?.disabled || [];

        if (action && disabled.includes(action)) {
            // 감사 로그 기록
            await writeAuditLog({
                actor: { uid: "system", role: "system" },
                action: "policy_block",
                subject: { teamId, service },
                input: { service, teamId, action },
                output: { blocked: true, reason: `action_blocked:${action}` },
                policy: { matchedRules: ["runtimeOps.disabled"], risk: "high" },
                pii: { redacted: false, fields: [] },
                consent: { basis: "legitimate", scope: ["ops"] },
            });

            throw new Error(`blocked_by_policy:${disabled.join(",")}`);
        }

        // 5) 임계값 체크 (선택)
        // 실제로는 governance 데이터와 비교하여 차단할 수 있음
        // 여기서는 기본 구조만 제공

        logger.info("✅ Governance 검사 통과:", { service, teamId, action });
    } catch (error: any) {
        logger.error("❌ Governance 검사 실패:", error);
        throw error;
    }
}

/**
 * 정책 임계값 검사
 */
export async function checkThresholds(teamId?: string): Promise<{ passed: boolean; violations: string[] }> {
    try {
        const polDoc = await db.doc("policies/default-governance").get();
        if (!polDoc.exists) {
            return { passed: true, violations: [] };
        }

        const pol = polDoc.data() as any;
        const thresholds = pol.thresholds || {};
        const violations: string[] = [];

        // governance 데이터 조회
        const govDoc = await db.collection("governance").orderBy("date", "desc").limit(1).get();
        if (govDoc.empty) {
            return { passed: true, violations: [] };
        }

        const gov = govDoc.docs[0].data();

        // 각 임계값 검사
        for (const [metric, threshold] of Object.entries(thresholds)) {
            const value = gov[metric];
            if (value === undefined) continue;

            const op = (threshold as any).op;
            const target = (threshold as any).value;

            let passed = false;
            switch (op) {
                case ">=":
                    passed = value >= target;
                    break;
                case "<=":
                    passed = value <= target;
                    break;
                case ">":
                    passed = value > target;
                    break;
                case "<":
                    passed = value < target;
                    break;
                case "==":
                    passed = value === target;
                    break;
                default:
                    passed = true;
            }

            if (!passed) {
                violations.push(`${metric} ${op} ${target} (현재: ${value})`);
            }
        }

        return {
            passed: violations.length === 0,
            violations,
        };
    } catch (error) {
        logger.error("❌ 임계값 검사 오류:", error);
        return { passed: true, violations: [] };
    }
}

