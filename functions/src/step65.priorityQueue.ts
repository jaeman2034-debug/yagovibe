import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { getOrgContext } from "./step65.billingGuard";

const db = getFirestore();

/**
 * Step 65: Pick Queue For Org - 조직별 우선순위 큐 선택
 * enterprise=prio1, pro=prio2, free=prio3
 */
export async function pickQueueForOrg(orgId: string): Promise<string> {
    try {
        const { org, plan } = await getOrgContext(orgId);
        const planId = org?.planId || plan?.id || "free";

        if (planId === "enterprise") {
            return "q-prio1";
        } else if (planId === "pro") {
            return "q-prio2";
        } else {
            return "q-prio3";
        }
    } catch (error: any) {
        logger.error("❌ 큐 선택 오류:", error);
        return "q-prio3"; // 기본값: 가장 낮은 우선순위
    }
}

/**
 * Step 65: Get Queue Priority - 큐 우선순위 숫자 반환
 */
export async function getQueuePriority(orgId: string): Promise<number> {
    try {
        const { limits } = await getOrgContext(orgId);
        return limits.priority || 3;
    } catch (error: any) {
        logger.error("❌ 우선순위 조회 오류:", error);
        return 3; // 기본값: 가장 낮은 우선순위
    }
}

/**
 * Step 65: Dispatch To Queue - Cloud Tasks 큐에 디스패치
 * 실제 구현은 Cloud Tasks 설정에 따라 구성 필요
 */
export async function dispatchToQueue(
    orgId: string,
    endpoint: string,
    payload: any
): Promise<{ queueName: string; priority: number }> {
    try {
        const queueName = await pickQueueForOrg(orgId);
        const priority = await getQueuePriority(orgId);

        // TODO: Cloud Tasks API 호출
        // const { CloudTasksClient } = require('@google-cloud/tasks');
        // const client = new CloudTasksClient();
        // await client.createTask({
        //     parent: `projects/${projectId}/locations/${location}/queues/${queueName}`,
        //     task: {
        //         httpRequest: {
        //             httpMethod: 'POST',
        //             url: `${functionsUrl}/${endpoint}`,
        //             body: Buffer.from(JSON.stringify(payload)).toString('base64'),
        //         },
        //     },
        // });

        logger.info("📤 큐 디스패치:", { orgId, queueName, priority, endpoint });

        return { queueName, priority };
    } catch (error: any) {
        logger.error("❌ 큐 디스패치 오류:", error);
        throw error;
    }
}

