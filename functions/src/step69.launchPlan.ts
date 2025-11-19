import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { setSecurityHeaders } from "./step69.securityHeaders";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

/**
 * Step 69: Launch Plan - 론치 플랜 관리
 * Production Hardening & Launch Readiness
 */

/**
 * 론치 플랜 스키마
 */
export interface LaunchPlan {
    name: string; // 론치 플랜 이름
    targetDate: string; // 목표 날짜 (YYYY-MM-DD)
    stages: Array<{
        day: number; // D-Day 기준 일수 (예: -7, -3, -1, 0, 1)
        date: string; // 실제 날짜 (YYYY-MM-DD)
        tasks: Array<{
            title: string;
            description?: string;
            status: "todo" | "in_progress" | "done";
            assignee?: string;
            dueDate?: string;
        }>;
        milestones: string[]; // 마일스톤 목록
    }>;
    status: "draft" | "active" | "completed" | "cancelled";
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Create Launch Plan
 * POST /createLaunchPlan
 */
export const createLaunchPlan = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const plan: Omit<LaunchPlan, "createdAt" | "updatedAt"> = req.body || {};

            if (!plan.name || !plan.targetDate) {
                res.status(400).json({ error: "name and targetDate are required" });
                return;
            }

            const now = Timestamp.now();
            const doc = {
                ...plan,
                createdAt: now,
                updatedAt: now,
            };

            const ref = await db.collection("launchPlans").add(doc);

            logger.info(`✅ 론치 플랜 생성: ${ref.id}`, { name: plan.name, targetDate: plan.targetDate });

            setSecurityHeaders(res);
            res.json({ ok: true, id: ref.id });
        } catch (error: any) {
            logger.error("❌ 론치 플랜 생성 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Get Launch Plan
 * GET /getLaunchPlan?id=PLAN_ID
 */
export const getLaunchPlan = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { id } = req.query as any;

            if (!id) {
                res.status(400).json({ error: "id is required" });
                return;
            }

            const doc = await db.collection("launchPlans").doc(id).get();

            if (!doc.exists) {
                res.status(404).json({ error: "launch plan not found" });
                return;
            }

            const data = doc.data();
            const plan = {
                id: doc.id,
                ...data,
                createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : data?.createdAt,
                updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate() : data?.updatedAt,
            };

            setSecurityHeaders(res);
            res.json({ plan });
        } catch (error: any) {
            logger.error("❌ 론치 플랜 조회 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * List Launch Plans
 * GET /listLaunchPlans?status=active
 */
export const listLaunchPlans = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { status } = req.query as any;

            let query: any = db.collection("launchPlans");

            if (status) {
                query = query.where("status", "==", status);
            }

            const qs = await query.orderBy("targetDate", "desc").limit(20).get();

            const items = qs.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
                    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
                };
            });

            setSecurityHeaders(res);
            res.json({ items });
        } catch (error: any) {
            logger.error("❌ 론치 플랜 목록 조회 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

/**
 * Generate Default Launch Plan (2주 플랜)
 * POST /generateDefaultLaunchPlan
 * Body: { targetDate: "2025-02-01", name?: string }
 */
export const generateDefaultLaunchPlan = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { targetDate, name } = req.body || {};

            if (!targetDate) {
                res.status(400).json({ error: "targetDate is required (YYYY-MM-DD)" });
                return;
            }

            const target = new Date(targetDate);
            const getDate = (daysOffset: number) => {
                const d = new Date(target);
                d.setDate(d.getDate() + daysOffset);
                return d.toISOString().split("T")[0];
            };

            const plan: Omit<LaunchPlan, "createdAt" | "updatedAt"> = {
                name: name || `Launch Plan - ${targetDate}`,
                targetDate,
                status: "draft",
                stages: [
                    {
                        day: -7,
                        date: getDate(-7),
                        tasks: [
                            {
                                title: "성능 튜닝 및 인덱스 최적화",
                                description: "Firestore 복합 인덱스 생성, Neo4j 인덱스 최적화",
                                status: "todo",
                            },
                            {
                                title: "이미지/번들 최적화",
                                description: "코드 스플리팅, 이미지 AVIF/WebP 변환, 폰트 서브셋",
                                status: "todo",
                            },
                            {
                                title: "침투테스트 리포트 수령",
                                description: "보안 팀으로부터 최종 침투테스트 리포트 확인",
                                status: "todo",
                            },
                        ],
                        milestones: ["D-7: 준비 완료"],
                    },
                    {
                        day: -3,
                        date: getDate(-3),
                        tasks: [
                            {
                                title: "카나리아 10% 시작",
                                description: "Step 64 rolloutAdvance로 10% 트래픽 전환",
                                status: "todo",
                            },
                            {
                                title: "파일럿 팀 통지",
                                description: "선택된 파일럿 팀에 카나리아 배포 안내",
                                status: "todo",
                            },
                        ],
                        milestones: ["D-3: 카나리아 10% 시작"],
                    },
                    {
                        day: -1,
                        date: getDate(-1),
                        tasks: [
                            {
                                title: "50% 확대",
                                description: "Step 64 rolloutAdvance로 50% 트래픽 전환",
                                status: "todo",
                            },
                            {
                                title: "KPI 모니터링 (오후 피크 2시간)",
                                description: "p95, 오류율, 승인율, 오프라인 성공률 집중 모니터링",
                                status: "todo",
                            },
                        ],
                        milestones: ["D-1: 50% 확대, KPI 모니터링"],
                    },
                    {
                        day: 0,
                        date: getDate(0),
                        tasks: [
                            {
                                title: "100% 전환",
                                description: "Step 64 rolloutAdvance로 100% 트래픽 전환",
                                status: "todo",
                            },
                            {
                                title: "온콜 24h 강화",
                                description: "온콜 팀 24시간 대기 상태 유지",
                                status: "todo",
                            },
                            {
                                title: "Go/No-Go 회의 2회",
                                description: "D-Day 오전 9시, 오후 3시 Go/No-Go 회의",
                                status: "todo",
                            },
                        ],
                        milestones: ["D-Day: 100% 전환, Go/No-Go 회의"],
                    },
                    {
                        day: 1,
                        date: getDate(1),
                        tasks: [
                            {
                                title: "초기 안정화 배치",
                                description: "사소한 오류 수정 배치",
                                status: "todo",
                            },
                            {
                                title: "핫픽스 배포",
                                description: "사소한 오류 핫픽스 배포",
                                status: "todo",
                            },
                        ],
                        milestones: ["D+1: 초기 안정화"],
                    },
                ],
            };

            const now = Timestamp.now();
            const ref = await db.collection("launchPlans").add({
                ...plan,
                createdAt: now,
                updatedAt: now,
            });

            logger.info(`✅ 기본 론치 플랜 생성: ${ref.id}`, { targetDate, name: plan.name });

            setSecurityHeaders(res);
            res.json({ ok: true, id: ref.id, plan });
        } catch (error: any) {
            logger.error("❌ 기본 론치 플랜 생성 오류:", error);
            setSecurityHeaders(res);
            res.status(500).json({ error: error.message });
        }
    }
);

