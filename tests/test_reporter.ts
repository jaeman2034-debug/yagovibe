/**
 * Step 55: Test Reporter
 * 테스트 결과를 Firestore에 저장하는 유틸리티
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

interface TestResult {
    build: string;
    testsPassed: number;
    testsFailed: number;
    avgLatencyMs: number;
    regressions: string[];
    failCases?: string[];
    timestamp: Timestamp;
}

/**
 * 테스트 결과를 Firestore에 저장
 */
export async function saveTestResults(result: {
    testsPassed: number;
    testsFailed: number;
    avgLatencyMs: number;
    regressions: string[];
    failCases?: string[];
}): Promise<void> {
    try {
        const buildId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const doc: TestResult = {
            build: buildId,
            testsPassed: result.testsPassed,
            testsFailed: result.testsFailed,
            avgLatencyMs: result.avgLatencyMs,
            regressions: result.regressions,
            failCases: result.failCases || [],
            timestamp: Timestamp.now(),
        };

        await db.collection("qaResults").doc(buildId).set(doc);
        console.log(`✅ 테스트 결과 저장: ${buildId}`);
    } catch (error) {
        console.error("❌ 테스트 결과 저장 실패:", error);
        throw error;
    }
}

