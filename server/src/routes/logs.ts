/**
 * 🔥 Logs Route - 스토리 로그/벌크 스텁, 오프라인 큐 대응
 * 
 * Week4 핵심: 프로필 학습 통합
 */

import { Router } from "express";
import { prisma } from "../data/prisma";
import { learnFromLog } from "../jobs/profile.learn";
import { saveActivityLogToFirestore, saveEventLogToFirestore } from "../data/firestore";

const router = Router();

/**
 * POST /api/logs/story
 * 스토리 로그 1건 (DB 저장 + 프로필 학습)
 */
router.post("/story", async (req, res) => {
  try {
    const logData = req.body;
    const createdAt = new Date();

    // 🔥 Prisma 저장
    await prisma.eventLog.create({
      data: {
        eventName: logData.eventName || "story_unknown",
        payload: JSON.stringify(logData),
        sessionId: logData.sessionId,
        userId: logData.userId,
        region: logData.region,
        createdAt,
      },
    });

    // 🔥 Firestore 동시 저장 (dual write)
    try {
      await saveEventLogToFirestore({
        eventName: logData.eventName || "story_unknown",
        payload: JSON.stringify(logData),
        sessionId: logData.sessionId,
        userId: logData.userId,
        region: logData.region,
        createdAt,
      });
    } catch (firestoreError) {
      // Firestore 저장 실패는 로그만 남기고 계속 진행
      console.warn("[STORY_LOG] Firestore 저장 실패 (Prisma는 성공):", firestoreError);
    }

    // 클릭 로그 시 프로필 학습
    if (logData.eventName === "story_click" && logData.userId && logData.category) {
      try {
        await learnFromLog(logData.userId, logData.category);
      } catch (learnError) {
        console.error("[PROFILE_LEARN_ERROR]", learnError);
        // 학습 실패해도 로그는 성공 처리
      }
    }

    console.log("[STORY_LOG]", logData.eventName, logData.storyId);
    res.json({ ok: true, receivedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[POST /logs/story]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/logs/story/bulk
 * 스토리 로그 벌크 (오프라인 큐 flush, DB 저장)
 */
router.post("/story/bulk", async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [];

    // 🔥 이벤트 이름 정규화 (하위 호환성 + 안전장치)
    const normalizeEventName = (e: any): string => {
      // 이미 eventName이 있으면 사용
      if (e.eventName) return e.eventName;
      
      // event 필드를 eventName으로 변환
      if (e.event === "click") return "story_click";
      if (e.event === "impression") return "story_impression";
      if (e.event === "route") return "story_route";
      if (e.event) return `story_${e.event}`;
      
      // 기본값
      return "story_unknown";
    };

    // 🔥 디버그: 요청 로그
    console.log(`[STORY_LOG_BULK] Received ${events.length} events`);
    if (events.length > 0) {
      console.log(`[STORY_LOG_BULK] Sample event:`, {
        eventName: normalizeEventName(events[0]),
        region: events[0].region || "seoul",
        storyId: events[0].storyId,
      });
    }

    // 벌크 삽입
    const insertData = events.map((e) => ({
      eventName: normalizeEventName(e),
      payload: JSON.stringify(e),
      sessionId: e.sessionId,
      userId: e.userId,
      region: e.region || "seoul", // 기본값 추가
      createdAt: e.at || e.timestamp ? new Date(e.at || e.timestamp) : new Date(),
    }));

    // 🔥 Prisma 저장
    await prisma.eventLog.createMany({
      data: insertData,
    });

    // 🔥 Firestore 동시 저장 (dual write)
    let firestoreSaved = 0;
    for (const data of insertData) {
      try {
        await saveEventLogToFirestore({
          eventName: data.eventName,
          payload: data.payload,
          sessionId: data.sessionId || null,
          userId: data.userId || null,
          region: data.region || null,
          createdAt: data.createdAt,
        });
        firestoreSaved++;
      } catch (firestoreError) {
        // Firestore 저장 실패는 로그만 남기고 계속 진행
        console.warn(`[STORY_LOG_BULK] Firestore 저장 실패 (Prisma는 성공):`, firestoreError);
      }
    }

    console.log(`[STORY_LOG_BULK] ✅ Saved ${events.length} events to Prisma, ${firestoreSaved}/${events.length} to Firestore`);
    res.json({
      ok: true,
      count: events.length,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /logs/story/bulk]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/logs/analytics/events
 * 분석 이벤트 벌크 (DB 저장)
 */
router.post("/analytics/events", async (req, res) => {
  try {
    const events = Array.isArray(req.body.events) ? req.body.events : [];

    // 벌크 삽입
    await prisma.eventLog.createMany({
      data: events.map((e) => ({
        eventName: e.eventName || "unknown",
        payload: JSON.stringify(e),
        sessionId: e.sessionId,
        userId: e.userId,
        region: e.region,
      })),
    });

    console.log(`[ANALYTICS_EVENTS] Saved ${events.length} events`);
    res.json({
      ok: true,
      count: events.length,
      receivedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /logs/analytics/events]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/logs/debug/eventlog
 * EventLog 데이터 확인 (디버그용)
 */
router.get("/debug/eventlog", async (req, res) => {
  try {
    const allLogs = await prisma.eventLog.findMany({});
    
    // eventName별 카운트
    const counts: Record<string, number> = {};
    allLogs.forEach((log: any) => {
      const eventName = log.eventName || "unknown";
      counts[eventName] = (counts[eventName] || 0) + 1;
    });

    // region별 카운트
    const regionCounts: Record<string, number> = {};
    allLogs.forEach((log: any) => {
      const region = log.region || "unknown";
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    // 최근 24시간 로그
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = allLogs.filter((log: any) => {
      const logDate = new Date(log.createdAt);
      return logDate >= oneDayAgo;
    });

    const recentCounts: Record<string, number> = {};
    recentLogs.forEach((log: any) => {
      const eventName = log.eventName || "unknown";
      recentCounts[eventName] = (recentCounts[eventName] || 0) + 1;
    });

    // 🔥 상세 진단: region null 체크
    const regionNullCount = allLogs.filter((log: any) => !log.region || log.region === null).length;
    const regionSeoulCount = allLogs.filter((log: any) => log.region === "seoul").length;
    
    // 🔥 이벤트별 + region별 조합 카운트
    const eventRegionCounts: Record<string, Record<string, number>> = {};
    allLogs.forEach((log: any) => {
      const eventName = log.eventName || "unknown";
      const region = log.region || "null";
      if (!eventRegionCounts[eventName]) {
        eventRegionCounts[eventName] = {};
      }
      eventRegionCounts[eventName][region] = (eventRegionCounts[eventName][region] || 0) + 1;
    });

    // 🔥 최근 10개 로그 (시간대 확인)
    const recent10 = allLogs
      .sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      })
      .slice(0, 10)
      .map((log: any) => ({
        eventName: log.eventName || "unknown",
        region: log.region || "null",
        createdAt: log.createdAt,
        ageHours: log.createdAt ? Math.round((Date.now() - new Date(log.createdAt).getTime()) / (1000 * 60 * 60)) : null,
      }));

    res.json({
      total: allLogs.length,
      byEventName: counts,
      byRegion: regionCounts,
      regionAnalysis: {
        null: regionNullCount,
        seoul: regionSeoulCount,
        other: allLogs.length - regionNullCount - regionSeoulCount,
      },
      eventRegionMatrix: eventRegionCounts, // 🔥 핵심: eventName + region 조합
      recent24h: {
        total: recentLogs.length,
        byEventName: recentCounts,
        cutoffTime: oneDayAgo.toISOString(),
        now: new Date().toISOString(),
      },
      recent10: recent10, // 🔥 최근 10개 (시간대 확인)
      sample: allLogs.slice(-5).map((log: any) => ({
        eventName: log.eventName,
        region: log.region,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error("[GET /logs/debug/eventlog]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/logs/activity
 * 플랫폼 활동 로그 기록 (단일, 하위 호환성)
 */
router.post("/activity", async (req, res) => {
  try {
    const { event, location, path, meta, userId, sessionId, userAgent, timestamp, at } = req.body;

    if (!event) {
      return res.status(400).json({ error: "event is required" });
    }

    const createdAt = timestamp || at ? new Date(timestamp || at) : new Date();
    const data = {
      event,
      path: path || location || null,
      userId: userId || null,
      sessionId: sessionId || null,
      meta: meta ? JSON.stringify(meta) : null,
      userAgent: userAgent || null,
      createdAt,
    };

    // 🔥 Prisma 저장
    await prisma.activityLog.create({ data });

    // 🔥 Firestore 동시 저장 (dual write)
    try {
      await saveActivityLogToFirestore(data);
    } catch (firestoreError) {
      // Firestore 저장 실패는 로그만 남기고 계속 진행
      console.warn("[ACTIVITY_LOG] Firestore 저장 실패 (Prisma는 성공):", firestoreError);
    }

    console.log("[ACTIVITY_LOG]", event, path || location);
    res.json({ ok: true, receivedAt: new Date().toISOString() });
  } catch (error) {
    console.error("[POST /logs/activity]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * POST /api/logs/activity/bulk
 * 플랫폼 활동 로그 벌크 기록 (오프라인 큐 flush용)
 */
router.post("/activity/bulk", async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [];
    if (!events.length) {
      return res.json({ ok: true, count: 0 });
    }

    console.log(`[ACTIVITY_LOG_BULK] Received ${events.length} events`);

    const insertData = events.map((e: any) => ({
      event: e.event,
      path: e.path || e.location || null,
      userId: e.userId || null,
      sessionId: e.sessionId || null,
      meta: e.meta ? JSON.stringify(e.meta) : null,
      userAgent: e.userAgent || null,
      createdAt: e.at || e.timestamp ? new Date(e.at || e.timestamp) : new Date(),
    }));

    // 🔥 핵심 — 무조건 안전하게 저장 (createMany 의존 버리고 create 루프로)
    let saved = 0;
    let firestoreSaved = 0;

    for (const data of insertData) {
      try {
        // Prisma 저장
        await prisma.activityLog.create({
          data,
        });
        saved++;

        // 🔥 Firestore 동시 저장 (dual write)
        try {
          await saveActivityLogToFirestore(data);
          firestoreSaved++;
        } catch (firestoreError) {
          // Firestore 저장 실패는 로그만 남기고 계속 진행
          console.warn(`[ACTIVITY_LOG_BULK] Firestore 저장 실패 (Prisma는 성공):`, firestoreError);
        }
      } catch (err) {
        console.warn(`[ACTIVITY_LOG_BULK] Failed to save event:`, err);
      }
    }

    console.log(`[ACTIVITY_LOG_BULK] ✅ Saved ${saved}/${events.length} events to Prisma, ${firestoreSaved}/${events.length} to Firestore`);

    res.json({
      ok: true,
      count: saved,
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[POST /logs/activity/bulk]", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

export default router;
