import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getDefaultStorageBucket } from "./lib/defaultStorageBucket";
import PDFDocument from "pdfkit";
import OpenAI from "openai";

// Firebase Admin 초기화
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

type MarketStat = {
  productId: string;
  name: string;
  sales?: number[];
  clicks?: number[];
  reviews?: number[];
  rating?: number;
};

function arraySum(a: number[] = []): number {
  return a.reduce((s, v) => s + (v || 0), 0);
}

/**
 * 리포트 생성 로직 (HTTP 함수와 스케줄러에서 공통 사용)
 */
async function generateReportLogic(): Promise<{
  ok: boolean;
  reportId?: string;
  pdfUrl?: string;
  audioUrl?: string;
  date?: string;
  totalSales?: number;
  avgRating?: number;
  error?: string;
  message?: string;
}> {
  try {
    logger.info("📊 주간 리포트 생성 시작");

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      logger.warn("⚠️ OPENAI_API_KEY가 설정되지 않음");
      return {
        ok: false,
        error: "OPENAI_API_KEY not configured",
      };
    }

    // 1) 데이터 수집
    const statsSnap = await db.collection("marketStats").get();
    const stats: MarketStat[] = statsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    } as any));

    const reviewsSnap = await db
      .collection("marketReviews")
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    const reviews = reviewsSnap.docs.map((d) => d.data() as any);

    logger.info(`📦 데이터 수집 완료: 상품 ${stats.length}개, 리뷰 ${reviews.length}개`);

    // 2) AI 요약 생성
    const prompt = `
다음은 마켓의 주간 데이터입니다.

- 상품별 주간 통계(JSON): ${JSON.stringify(stats).slice(0, 20000)}
- 최신 리뷰 일부(JSON): ${JSON.stringify(reviews).slice(0, 20000)}

다음 형식으로 한국어 요약을 만들어주세요:

1) 총 예상 판매/주요 추세 (두 줄)
2) TOP 5 상품 (이름, 주간 합계 판매 추정치 1줄 요약)
3) 리뷰 감정 요약 (한 줄)
4) 인사이트 3가지 (불릿)
5) 다음 주 액션 아이템 3가지 (불릿)
`;

    const comp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1000,
    });

    const summary = comp.choices[0]?.message?.content?.trim() || "요약 생성 실패";
    logger.info("🤖 AI 요약 생성 완료");

    // 3) 간단 KPI 계산
    const topProducts = stats
      .map((s) => ({
        name: (s as any).name || s.productId || "상품",
        weeklySales: arraySum(s.sales || []),
        rating: s.rating || 0,
      }))
      .sort((a, b) => b.weeklySales - a.weeklySales)
      .slice(0, 5);

    const totalSales = stats.reduce((sum, s) => sum + arraySum(s.sales || []), 0);
    const avgRating =
      stats.length
        ? (stats.reduce((sum, s) => sum + (s.rating || 0), 0) / stats.length).toFixed(2)
        : "0.0";

    // 4) PDF 생성
    const dateLabel = new Date().toISOString().slice(0, 10);
    const pdfPath = `reports/${dateLabel}/weekly-report.pdf`;

    const pdfDoc = new PDFDocument({
      margin: 48,
      size: "A4",
      info: {
        Title: "YAGO SPORTS 주간 AI 리포트",
        Author: "YAGO SPORTS",
        Subject: "주간 마켓 리포트",
        Creator: "YAGO SPORTS AI",
      },
    });

    const pdfStream = getDefaultStorageBucket().file(pdfPath).createWriteStream({
      contentType: "application/pdf",
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=3600",
        metadata: {
          generatedAt: new Date().toISOString(),
        },
      },
    });

    pdfDoc.pipe(pdfStream);

    // PDF 내용 작성
    pdfDoc.fontSize(20).fillColor("#1e40af").text("YAGO SPORTS – 주간 AI 리포트", { align: "left" });
    pdfDoc.moveDown(0.5);
    pdfDoc.fontSize(10).fillColor("#6b7280").text(`생성일: ${dateLabel}`, { align: "left" });
    pdfDoc.moveDown(1);

    pdfDoc.fillColor("#000").fontSize(14).text("📊 요약", { underline: true });
    pdfDoc.moveDown(0.5);
    pdfDoc.fontSize(11).fillColor("#374151").text(summary, {
      align: "left",
      lineGap: 5,
    });

    pdfDoc.moveDown(1);
    pdfDoc.fontSize(14).fillColor("#000").text("📈 핵심 KPI", { underline: true });
    pdfDoc.moveDown(0.5);
    pdfDoc.fontSize(11).fillColor("#374151").list([
      `총 주간 판매 합계: ${totalSales.toLocaleString()} 개`,
      `평균 평점: ${avgRating} / 5`,
    ]);

    pdfDoc.moveDown(1);
    pdfDoc.fontSize(14).fillColor("#000").text("🏆 TOP 5 상품", { underline: true });
    pdfDoc.moveDown(0.5);
    topProducts.forEach((p, i) => {
      pdfDoc.fontSize(11).fillColor("#374151").text(
        `${i + 1}. ${p.name} – 주간 판매: ${p.weeklySales.toLocaleString()}개 / 평점 ${p.rating.toFixed(1)}`,
        { lineGap: 3 }
      );
    });

    // PDF 종료
    pdfDoc.end();

    // PDF 저장 완료 대기
    await new Promise<void>((resolve, reject) => {
      pdfStream.on("finish", () => {
        logger.info("✅ PDF 생성 완료:", pdfPath);
        resolve();
      });
      pdfStream.on("error", (e) => {
        logger.error("❌ PDF 생성 오류:", e);
        reject(e);
      });
    });

    // 5) TTS MP3 생성 (OpenAI TTS)
    const ttsText = `이번 주 요약입니다. 총 예상 판매는 ${totalSales.toLocaleString()}개, 평균 평점은 ${avgRating}점입니다. 상위 상품은 ${topProducts
      .map((t) => t.name)
      .slice(0, 3)
      .join(", ")} 입니다. 자세한 내용은 PDF 리포트를 확인하세요.`;

    logger.info("🎧 TTS 생성 시작");

    // OpenAI TTS API 호출
    const speech = await openai.audio.speech.create({
      model: "tts-1", // tts-1 또는 tts-1-hd 사용
      voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer 중 선택
      input: ttsText,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const mp3Path = `reports/${dateLabel}/weekly-summary.mp3`;

    await getDefaultStorageBucket().file(mp3Path).save(audioBuffer, {
      contentType: "audio/mpeg",
      resumable: false,
      metadata: {
        cacheControl: "public, max-age=3600",
        metadata: {
          generatedAt: new Date().toISOString(),
        },
      },
    });

    logger.info("✅ MP3 생성 완료:", mp3Path);

    // 6) Firestore 인덱스 기록
    const [pdfUrl] = await getDefaultStorageBucket().file(pdfPath).getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7일
    });

    const [mp3Url] = await getDefaultStorageBucket().file(mp3Path).getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    const docRef = await db.collection("reports").add({
      type: "weekly",
      date: FieldValue.serverTimestamp(),
      pdfUrl,
      audioUrl: mp3Url,
      pdfPath,
      mp3Path,
      totalSales,
      avgRating: Number(avgRating),
      topProducts,
      summary,
      createdAt: FieldValue.serverTimestamp(),
    });

    logger.info("✅ 리포트 인덱스 저장 완료:", docRef.id);

    return {
      ok: true,
      reportId: docRef.id,
      pdfUrl,
      audioUrl: mp3Url,
      date: dateLabel,
      totalSales,
      avgRating: Number(avgRating),
    };
  } catch (error: any) {
    logger.error("❌ 리포트 생성 오류:", error);
    return {
      ok: false,
      error: "REPORT_GENERATION_FAILED",
      message: error.message,
    };
  }
}

/**
 * Step 10: AI 주간 리포트 자동 PDF + 음성(MP3) 리포트 생성 (HTTP 함수)
 * Firebase Functions가 PDF 리포트 만들고, TTS MP3까지 생성해 Storage에 저장
 */
export const generateWeeklyReport = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 300, // PDF + TTS 생성 시간 고려
  },
  async (req, res) => {
    try {
      // CORS 헤더 설정
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");

      // OPTIONS 요청 처리
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
      }

      // 공통 리포트 생성 로직 호출
      const result = await generateReportLogic();

      if (result.ok) {
        res.set("Access-Control-Allow-Origin", "*");
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      return;
    } catch (error: any) {
      logger.error("❌ 리포트 생성 오류:", error);
      res.status(500).json({
        ok: false,
        error: "REPORT_GENERATION_FAILED",
        message: error.message,
      });
    }
  }
);

/**
 * 🔄 매주 월요일 오전 09:00에 자동 실행되는 스케줄러
 * 한국시간(KST) 기준: 09:00
 * UTC 기준: 00:00 (Asia/Seoul = UTC+9)
 */
export const generateWeeklyReportJob = onSchedule(
  {
    schedule: "0 0 * * 1", // 매주 월요일 00:00 UTC (= 09:00 KST)
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      logger.info("🕘 주간 리포트 자동 생성 시작", {
        scheduleTime: event.scheduleTime,
      });

      // 공통 리포트 생성 로직 호출
      const result = await generateReportLogic();

      if (result.ok) {
        // 성공 로그 기록
        await db.collection("reports-log").add({
          createdAt: FieldValue.serverTimestamp(),
          status: "success",
          reportId: result.reportId,
          pdfUrl: result.pdfUrl,
          audioUrl: result.audioUrl,
          date: result.date,
          totalSales: result.totalSales,
          avgRating: result.avgRating,
        });

        logger.info("✅ 주간 리포트 자동 생성 완료", {
          reportId: result.reportId,
          date: result.date,
        });
      } else {
        // 실패 로그 기록
        await db.collection("reports-log").add({
          createdAt: FieldValue.serverTimestamp(),
          status: "error",
          error: result.error,
          message: result.message,
        });

        logger.error("❌ 주간 리포트 자동 생성 실패", {
          error: result.error,
          message: result.message,
        });
      }
    } catch (error: any) {
      logger.error("❌ 주간 리포트 자동 생성 오류:", error);

      // 에러 로그 기록
      try {
        await db.collection("reports-log").add({
          createdAt: FieldValue.serverTimestamp(),
          status: "error",
          error: "EXCEPTION",
          message: error.message,
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

