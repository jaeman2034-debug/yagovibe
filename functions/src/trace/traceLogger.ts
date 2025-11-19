import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as crypto from "crypto";

const db = getFirestore();

export type TraceInput = {
    actor?: { uid?: string; role?: string; name?: string };
    subject?: { teamId?: string; reportId?: string; [key: string]: any };
    action: string;
    input?: any;
    output?: any;
    model?: {
        name?: string;
        version?: string;
        sha?: string;
        temperature?: number;
        provider?: string;
    };
    policy?: {
        matchedRules?: any[];
        risk?: "low" | "med" | "high";
    };
    pii?: {
        redacted?: boolean;
        fields?: string[];
    };
    consent?: {
        basis?: "contract" | "consent" | "legitimate";
        scope?: string[];
    };
    links?: {
        evidenceBundle?: string;
        kgNodes?: any[];
    };
};

/**
 * Step 62: Trace Logger - 감사 로그 작성
 * 모든 AI 결정/행동의 불변 로그를 생성
 */
export async function writeAuditLog(trace: TraceInput): Promise<{ id: string; sha256: string }> {
    const ts = new Date();
    const body = {
        ...trace,
        ts: Timestamp.fromDate(ts),
    };

    // SHA256 해시 생성 (무결성 보장)
    const sha256 = crypto
        .createHash("sha256")
        .update(JSON.stringify(body))
        .digest("hex");

    // Firestore에 저장
    const ref = await db.collection("auditLogs").add({
        ...body,
        integrity: {
            sha256,
            createdAt: Timestamp.fromDate(ts),
        },
    });

    return {
        id: ref.id,
        sha256,
    };
}

/**
 * Step 62: Batch Trace Logger - 여러 로그 일괄 작성
 */
export async function writeAuditLogsBatch(traces: TraceInput[]): Promise<{ id: string; sha256: string }[]> {
    const results = await Promise.all(traces.map((trace) => writeAuditLog(trace)));
    return results;
}

