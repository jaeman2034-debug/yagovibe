/**
 * 🔥 Server Entry - 서버 부팅
 * 
 * Week1~2 API Stub 기준
 */

import express from "express";
import { regionMiddleware } from "./middleware/region";
import stories from "./routes/stories";
import leagues from "./routes/leagues";
import logs from "./routes/logs";
import experiments from "./routes/experiments";
import assocSync from "./routes/assoc.sync";
import dashboardKpi from "./routes/dashboard.kpi";
import adminStories from "./routes/admin.stories";
import adminDashboard from "./routes/admin.dashboard";
import adminDaily from "./routes/admin.daily";
import adminWidgets from "./routes/admin.widgets";
import adminPlaybook from "./routes/admin.playbook";
import ground from "./routes/ground";
import pay from "./routes/pay";
import cancel from "./routes/cancel";
import adminSettlement from "./routes/admin.settlement";
import adminExp from "./routes/admin.exp";
import adminCampaign from "./routes/admin.campaign";
import onboarding from "./routes/onboarding";
import map from "./routes/map";
import team from "./routes/team";
import leagueCommunity from "./routes/league.community";
import { syncAssoc } from "./jobs/syncAssoc";
import { aggregateExperiment } from "./jobs/exp.aggregate";
import { decideAllWinners } from "./domain/exp.decider";
import { rollupKpi } from "./jobs/rollupKpi";
import { detectTriggers } from "./domain/marketing.trigger";
import { detectAlert } from "./jobs/alert";
import { runAutopilotAllRegions } from "./jobs/autopilot";
import { prisma } from "./data/prisma";
import { retryAssocSync } from "./domain/fallback.rules";

const app = express();

// Middleware
app.use(express.json());
app.use(regionMiddleware); // 지역 미들웨어 (모든 요청에 지역 컨텍스트 주입)
app.use((req, res, next) => {
  // CORS (개발용)
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get("/health", (_, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Health check (DB 연결 확인)
app.get("/healthz", async (_, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      db: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Routes
app.use("/api/stories", stories);
app.use("/api/leagues", leagues);
app.use("/api/logs", logs);
app.use("/api/experiments", experiments);
app.use("/api/assoc", assocSync);
app.use("/api/admin/dashboard", adminDashboard);
app.use("/api/admin/dashboard/kpi", dashboardKpi); // 기존 KPI API 유지
app.use("/api/admin/daily", adminDaily); // 매일 체크리스트용
app.use("/api/admin/widgets", adminWidgets); // 6개 위젯 통합
app.use("/api/admin/playbook", adminPlaybook); // 운영 플레이북 체크리스트
app.use("/api/admin/stories", adminStories);
app.use("/api/admin/settlement", adminSettlement);
app.use("/api/admin/exp", adminExp);
app.use("/api/admin/campaign", adminCampaign);
app.use("/api/ground", ground);
app.use("/api/pay", pay);
app.use("/api/cancel", cancel);
app.use("/api/team", team);
app.use("/api/league/community", leagueCommunity);
app.use("/api/onboarding", onboarding);
app.use("/api/map", map);

// 지역 라우팅: /r/:region/*
app.get("/r/:region", (req: any, res) => {
  res.json({
    region: req.region,
    message: `Welcome to ${req.region} hub`,
  });
});

// 404
app.use((_, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("[ERROR]", err);
    res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
);

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 API Server running on :${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`📚 Stories: http://localhost:${PORT}/api/stories`);
  console.log(`🏆 Leagues: http://localhost:${PORT}/api/leagues`);

  // 서버 시작 시 협회 데이터 동기화 (1회, 재시도 포함)
  try {
    await retryAssocSync(() => syncAssoc("seoul"), 3);
    console.log("✅ Initial association sync completed");
  } catch (error) {
    console.error("⚠️  Initial association sync failed after retries:", error);
  }

  // 1시간마다 협회 데이터 동기화 (재시도 포함)
  const SYNC_INTERVAL = 60 * 60 * 1000; // 1시간
  setInterval(async () => {
    try {
      await retryAssocSync(() => syncAssoc("seoul"), 3);
      console.log("✅ Scheduled association sync completed");
    } catch (error) {
      console.error("⚠️  Scheduled association sync failed after retries:", error);
    }
  }, SYNC_INTERVAL);

  console.log(`⏰ Association sync scheduled (every ${SYNC_INTERVAL / 1000 / 60} minutes)`);

  // AB 테스트 통계 집계 및 승자 판정 (10분마다)
  setInterval(async () => {
    try {
      await aggregateExperiment();
      await decideAllWinners();
    } catch (error) {
      console.error("[SCHEDULED] AB test aggregation error:", error);
    }
  }, 10 * 60 * 1000); // 10분마다

  console.log(`⏰ AB test aggregation scheduled (every 10 minutes)`);

  // 마케팅 트리거 감지 및 발송 (1시간마다)
  setInterval(async () => {
    try {
      await detectTriggers();
    } catch (error) {
      console.error("[SCHEDULED] Marketing trigger error:", error);
    }
  }, 60 * 60 * 1000); // 1시간마다

  console.log(`⏰ Marketing trigger scheduled (every 60 minutes)`);

  // 위험 신호 감지 및 알림 (30분마다)
  setInterval(async () => {
    try {
      await detectAlert();
    } catch (error) {
      console.error("[SCHEDULED] Alert detection error:", error);
    }
  }, 30 * 60 * 1000); // 30분마다

  console.log(`⏰ Alert detection scheduled (every 30 minutes)`);

  // 무인 운영 오토파일럿 (30분마다)
  setInterval(async () => {
    try {
      await runAutopilotAllRegions();
    } catch (error) {
      console.error("[SCHEDULED] Autopilot error:", error);
    }
  }, 30 * 60 * 1000); // 30분마다

  console.log(`⏰ Autopilot scheduled (every 30 minutes)`);

  // 매일 새벽 3시 10분에 어제 KPI 롤업 (실제 운영 시 cron job 사용 권장)
  const scheduleRollup = () => {
    const now = new Date();
    const nextRollup = new Date(now);
    nextRollup.setHours(3, 10, 0, 0); // 다음 새벽 3시 10분
    if (nextRollup <= now) {
      nextRollup.setDate(nextRollup.getDate() + 1);
    }
    const msUntilRollup = nextRollup.getTime() - now.getTime();

    setTimeout(async () => {
      try {
        // 어제 날짜 계산
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const date = yesterday.toISOString().split("T")[0];

        // 모든 지역 롤업
        const regions = ["seoul", "busan", "daegu", "incheon", "gwangju", "daejeon", "ulsan", "gyeonggi", "gangwon", "jeju"];
        await Promise.allSettled(
          regions.map((r) => rollupKpi(date, r))
        );

        console.log(`✅ Scheduled KPI rollup completed for ${date}`);
      } catch (error) {
        console.error("⚠️  Scheduled KPI rollup failed:", error);
      }
      // 다음 롤업 스케줄링
      scheduleRollup();
    }, msUntilRollup);

    console.log(`⏰ KPI rollup scheduled for ${nextRollup.toISOString()}`);
  };

  scheduleRollup();
});
