import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as yaml from "js-yaml";
import { writeAuditLog } from "./trace/traceLogger";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 64: Policy Compiler - Policy-as-Code 컴파일러
 * POST /policyCompiler
 * Body: { yamlText: string, signature?: string }
 */
export const policyCompiler = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { yamlText, signature, compiledBy } = req.body || {};

            if (!yamlText) {
                res.status(400).json({ error: "missing policy yamlText" });
                return;
            }

            logger.info("📋 Policy 컴파일 시작");

            // TODO: signature 검증 (GPG/Keyless Sigstore)
            // 실제 프로덕션에서는 GPG 또는 Sigstore 서명 검증 필요
            if (signature && !signature.startsWith("sig_")) {
                logger.warn("⚠️ 서명 검증 실패 (임시 검증)");
                // res.status(403).json({ error: "invalid signature" });
                // return;
            }

            // YAML 파싱
            let doc: any;
            try {
                doc = yaml.load(yamlText) as any;
            } catch (error: any) {
                logger.error("❌ YAML 파싱 실패:", error);
                res.status(400).json({ error: `YAML parsing failed: ${error.message}` });
                return;
            }

            if (!doc.id) {
                res.status(400).json({ error: "policy must have 'id' field" });
                return;
            }

            // 컴파일 메타데이터 추가
            doc.compiledAt = Timestamp.now();
            doc.compiledBy = compiledBy || "system";
            doc.yamlSource = yamlText; // 원본 YAML 보관 (옵션)

            // Firestore에 저장
            await db.collection("policies").doc(doc.id).set(doc, { merge: true });

            // 감사 로그 기록
            await writeAuditLog({
                actor: { uid: compiledBy || "system", role: "admin" },
                action: "policy_compile",
                subject: { policyId: doc.id },
                input: { policyId: doc.id, version: doc.version },
                output: { success: true },
                policy: { matchedRules: [], risk: "low" },
                pii: { redacted: false, fields: [] },
                consent: { basis: "legitimate", scope: ["ops"] },
            });

            logger.info("✅ Policy 컴파일 완료:", { id: doc.id, version: doc.version });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                ok: true,
                id: doc.id,
                version: doc.version,
                compiledAt: doc.compiledAt,
            });
        } catch (error: any) {
            logger.error("❌ Policy 컴파일 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

