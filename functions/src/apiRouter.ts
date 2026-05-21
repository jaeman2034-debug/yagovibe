/**
 * Express API Router for /api/* endpoints
 * 
 * 프론트엔드가 호출하는 /api/* 경로를 처리하는 Express 라우터
 */

import { onRequest } from "firebase-functions/v2/https";
import express from "express";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import OpenAI from "openai";

// Firebase Admin 초기화 (지연 초기화)
let adminInitialized = false;
function ensureAdminInitialized() {
  if (!adminInitialized && !getApps().length) {
    initializeApp();
    adminInitialized = true;
  }
}

// OpenAI 클라이언트 (지연 초기화)
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });
  }
  return openaiClient;
}

const app = express();

// JSON 파싱 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 미들웨어
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  
  next();
});

// ============================================
// 루트 경로 - API 정보
// ============================================
app.get("/", (req, res) => {
  res.json({
    message: "YAGO SPORTS API Server",
    version: "1.0.0",
    endpoints: [
      "/getProductSummary",
      "/detectFraudRisk",
      "/getConditionScore",
      "/getImageQualityScore",
      "/predictFuturePrice",
      "/detectComponents",
      "/generateTotalScore",
      "/recommendSimilar",
      "/getRelatedProducts",
      "/getSellerTrustScore",
    ],
    health: "/health",
  });
});

// ============================================
// /nlu - NLU 처리
// ============================================
app.post("/nlu", async (req, res) => {
  try {
    ensureAdminInitialized();
    const { text } = req.body || {};
    logger.info("🎤 NLU 요청 수신:", text);

    if (typeof text === "string" && text.includes("지도")) {
      res.json({ action: "navigate", target: "/voice-map", intent: "open_map" });
      return;
    }

    res.json({ action: "none", intent: "unknown" });
  } catch (error: any) {
    logger.error("❌ NLU 오류:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// /generateWeeklyReport - 주간 리포트 생성
// ============================================
app.post("/generateWeeklyReport", async (req, res) => {
  try {
    ensureAdminInitialized();
    logger.info("📊 주간 리포트 생성 요청");

    // 간단한 응답 (실제 구현은 필요에 따라 확장)
    res.status(200).json({
      success: true,
      message: "주간 리포트 생성 완료",
      url: "https://yagovibe.com/reports/weekly",
    });
  } catch (error: any) {
    logger.error("❌ 주간 리포트 생성 오류:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// /generateWeeklyReport_new - 새로운 주간 리포트 생성
// ============================================
app.post("/generateWeeklyReport_new", async (req, res) => {
  try {
    ensureAdminInitialized();
    const { summaryData, insightsData } = req.body || {};
    logger.info("📊 새로운 주간 리포트 생성 요청:", { summaryData, insightsData });

    // OpenAI로 리포트 생성
    const openai = getOpenAIClient();
    const prompt = `
다음 데이터를 기반으로 주간 리포트 요약을 작성해주세요:

사용자 데이터: ${JSON.stringify(summaryData || {})}
인사이트 데이터: ${JSON.stringify(insightsData || {})}

간결하고 전문적인 리포트 요약을 작성해주세요.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "당신은 전문적인 비즈니스 리포트 작성자입니다." },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content || "리포트 생성 중...";
    
    res.set("Content-Type", "text/plain");
    res.status(200).send(summary);
  } catch (error: any) {
    logger.error("❌ 새로운 주간 리포트 생성 오류:", error);
    res.status(500).send(`오류: ${error.message}`);
  }
});

// ============================================
// /getSummary - 요약 가져오기
// ============================================
app.get("/getSummary", async (req, res) => {
  try {
    ensureAdminInitialized();
    logger.info("📋 요약 조회 요청");

    // Firestore에서 요약 데이터 가져오기
    const admin = await import("firebase-admin");
    const summaryRef = admin.firestore().collection("reports").doc("weekly").collection("data").doc("summary");
    const summarySnap = await summaryRef.get();

    if (summarySnap.exists) {
      res.json(summarySnap.data());
    } else {
      res.json({ message: "요약 데이터가 없습니다." });
    }
  } catch (error: any) {
    logger.error("❌ 요약 조회 오류:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// /getProjectConfig - 프로젝트 설정 가져오기
// ============================================
app.get("/getProjectConfig", async (req, res) => {
  try {
    ensureAdminInitialized();
    logger.info("⚙️ 프로젝트 설정 조회 요청");

    // 기본 설정 반환
    res.json({
      projectId: "yago-vibe-spt",
      region: "asia-northeast3",
      version: "1.0.0",
      features: {
        nlu: true,
        voiceMap: true,
        market: true,
      },
    });
  } catch (error: any) {
    logger.error("❌ 프로젝트 설정 조회 오류:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// /getProductSummary - AI 상품 요약 생성
// ============================================
app.post("/getProductSummary", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const { name, category, description, tags, imageUrl } = req.body;

    if (!name) {
      res.json({ summary: "" });
      return;
    }

    logger.info("✨ 상품 요약 생성 요청:", { name, category });

    const prompt = `
너는 중고거래 플랫폼의 상품 요약 전문가야.

아래 상품 정보를 보고 구매자가 한눈에 이해하도록
2~3줄의 핵심 요약을 만들어줘.

### 정보
상품명: ${name || ""}
카테고리: ${category || ""}
설명: ${description || ""}
태그: ${Array.isArray(tags) ? tags.join(", ") : tags || ""}

### 규칙
- 핵심 장점 또는 특징 위주
- 상태나 용도도 반영
- 너무 광고 문구처럼 금지
- 친절하고 간단한 톤
- 2~3문장으로 (최대 150자)
- 한국어로 자연스럽게 작성
- 구매자가 가장 먼저 알아야 하는 정보 중심

출력 형식(JSON만):
{
  "summary": "요약 내용"
}
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 상품 요약 전문가입니다. 상품 정보를 분석하여 구매자가 한눈에 이해할 수 있는 핵심 요약을 생성합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 200,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let summary = "";
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);
      summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : "";
      if (summary.length > 150) {
        summary = summary.substring(0, 147) + "...";
      }
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      summary = `${name || "이 상품"}은(는) ${category || "중고 상품"}으로, ${description ? description.substring(0, 50) + "..." : "상태 양호한 중고 상품"}입니다.`;
    }

    res.json({ summary });
  } catch (error: any) {
    logger.error("❌ AI 상품 요약 생성 오류:", error);
    const { name, category } = req.body || {};
    res.json({ summary: `${name || "이 상품"}은(는) ${category || "중고 상품"}으로, 상태 양호한 중고 상품입니다.` });
  }
});

// ============================================
// /detectFraudRisk - AI 사기 감지
// ============================================
app.post("/detectFraudRisk", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const {
      name,
      price,
      avgPrice,
      description,
      category,
      tags,
      imageUrl,
      userProfile = {},
    } = req.body;

    if (!name) {
      res.json({
        risk: 0,
        label: "low",
        reason: "상품 정보가 부족하여 분석할 수 없습니다.",
      });
      return;
    }

    logger.info("⚠️ 사기 감지 요청:", { name, price, category });

    const prompt = `
너는 중고 거래 플랫폼의 '사기 탐지 AI'야.

아래 상품 정보가 사기일 확률을 0~1 사이의 점수로 계산해줘.
그리고 사람이 이해할 수 있는 이유(reason)를 작성해줘.

### 상품 정보
- 상품명: ${name || ""}
- 카테고리: ${category || ""}
- 가격: ${price || "없음"}
- 지역 평균 가격: ${avgPrice || "없음"}
- 설명: ${description || ""}
- 태그: ${Array.isArray(tags) ? tags.join(", ") : tags || ""}
- 이미지 URL: ${imageUrl ? "있음" : "없음"}

### 판매자 정보
- UID: ${userProfile.uid || "없음"}
- 계정 생성일: ${userProfile.createdAt || "없음"}
- 총 판매 수: ${userProfile.totalSales || "0"}

### 분석 기준
1) 가격 이상치: 평균가 대비 너무 낮거나 높은 경우 (30% 이상 차이)
2) 설명 부실도: 단어 수가 10자 미만이거나 원본 복붙 의심
3) 이미지 신뢰도: 이미지가 없거나 스톡 이미지/광고 이미지 사용 의심
4) 카테고리 위험성: 전자기기·고가품(노트북, 스마트폰, 명품 등)은 사기 빈도 높음
5) 태그/키워드 위험 신호: "급처", "미개봉 싸게", "정품확인 X", "선착순" 등
6) 판매자 정보 부족: 익명 유저 또는 최근 가입(7일 이내)
7) 상품명 이상: 과도한 특수문자, 반복 문자, 대문자 남용

출력 형식(JSON만):
{
  "risk": 0.0~1.0,
  "label": "low | medium | high",
  "reason": "사유 설명 (한국어로 간단히)"
}

점수 기준:
- 0.0 ~ 0.3: low (안전) - "이 상품은 일반적으로 안전해 보입니다."
- 0.3 ~ 0.6: medium (주의) - "가격이나 설명을 다시 확인해보세요."
- 0.6 ~ 1.0: high (고위험) - "⚠️ 이 상품은 사기 위험이 높습니다. 신중히 거래하세요."

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 중고 거래 플랫폼의 사기 탐지 전문가입니다. 상품 정보를 분석하여 사기 위험도를 정확하게 평가합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: { risk: number; label: string; reason: string };
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      const risk = typeof parsed.risk === "number" && parsed.risk >= 0 && parsed.risk <= 1
        ? parsed.risk
        : 0;

      let label = "low";
      if (risk >= 0.6) {
        label = "high";
      } else if (risk >= 0.3) {
        label = "medium";
      }

      const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : risk >= 0.6
        ? "⚠️ 이 상품은 사기 위험이 높습니다. 신중히 거래하세요."
        : risk >= 0.3
        ? "가격이나 설명을 다시 확인해보세요."
        : "이 상품은 일반적으로 안전해 보입니다.";

      result = { risk, label, reason };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      let risk = 0;
      if (price && avgPrice) {
        const priceDiff = Math.abs(price - avgPrice) / avgPrice;
        if (priceDiff > 0.5) risk += 0.3;
      }
      if (!description || description.trim().length < 10) risk += 0.2;
      const highRiskCategories = ["노트북", "스마트폰", "태블릿", "명품", "시계", "가방"];
      if (category && highRiskCategories.some((c) => category.includes(c))) risk += 0.2;

      let label = risk >= 0.6 ? "high" : risk >= 0.3 ? "medium" : "low";
      const reason = risk >= 0.6
        ? "⚠️ 이 상품은 사기 위험이 높습니다. 신중히 거래하세요."
        : risk >= 0.3
        ? "가격이나 설명을 다시 확인해보세요."
        : "이 상품은 일반적으로 안전해 보입니다.";

      result = { risk: Math.min(risk, 1.0), label, reason };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 사기 감지 오류:", error);
    res.json({
      risk: 0,
      label: "low",
      reason: "AI 분석에 실패했습니다. 직접 확인해주세요.",
    });
  }
});

// ============================================
// /getConditionScore - AI 상품 상태 점수
// ============================================
app.post("/getConditionScore", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const { description, imageUrl, category, tags } = req.body;

    if (!description && !imageUrl) {
      res.json({
        score: 0.5,
        level: "중",
        reason: "상품 정보가 부족하여 정확한 상태 평가가 어렵습니다.",
      });
      return;
    }

    logger.info("🧩 상품 상태 평가 요청:", { category, hasImage: !!imageUrl });

    const prompt = `
너는 중고거래 플랫폼의 "상품 상태 평가 전문가"야.

아래 정보를 기반으로 상품의 상태를
0~1 점수로 평가하고 "상/중/하" 등급으로 분류해줘.

### 입력 정보
- 카테고리: ${category || ""}
- 설명: ${description || ""}
- 태그: ${Array.isArray(tags) ? tags.join(", ") : tags || ""}
- 이미지: ${imageUrl ? "있음" : "없음"}

### 평가 기준
1. 스크래치, 찌그러짐, 파손 여부
2. 구성품 누락 여부 (포함 여부 명시)
3. 실사용감 (버튼 닳음, 모서리 까짐, 마모도 등)
4. 전자기기는 화면 상태/배터리 등 간접 판단
5. 설명의 신뢰도 (설명이 너무 짧거나 모호하면 감점)
6. 이미지의 품질 (blur/noise가 심하면 상태 확인 어려움으로 감점)
7. 외관 상태 (깨끗함, 생활기스, 얼룩 등)
8. 기능 정상 작동 여부 (설명 기반 추론)

### 출력 형식(JSON만):
{
  "score": 0.0~1.0,
  "level": "상 | 중 | 하",
  "reason": "상태에 대한 간단한 이유 (한국어로 1~2문장)"
}

### 등급 기준
- 0.0 ~ 0.4: 하 (심각한 손상, 파손, 사용감 많음)
- 0.4 ~ 0.7: 중 (일반적인 사용감, 작은 스크래치, 구성품 일부 누락)
- 0.7 ~ 1.0: 상 (깨끗함, 생활기스 없음, 구성품 완비, 거의 새것)

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

    const messages: any[] = [
      {
        role: "system",
        content: "당신은 중고거래 플랫폼의 상품 상태 평가 전문가입니다. 이미지와 설명을 분석하여 상품의 상태를 정확하게 평가합니다.",
      },
    ];

    if (imageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    const aiResp = await openai.chat.completions.create({
      model: imageUrl ? "gpt-4o" : "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: { score: number; level: string; reason: string };
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      const score = typeof parsed.score === "number" && parsed.score >= 0 && parsed.score <= 1
        ? parsed.score
        : 0.5;

      let level = "중";
      if (score >= 0.7) {
        level = "상";
      } else if (score < 0.4) {
        level = "하";
      }

      if (parsed.level === "상" || parsed.level === "중" || parsed.level === "하") {
        level = parsed.level;
      }

      const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : score >= 0.7
        ? "상태가 매우 양호하며 생활기스가 거의 없습니다."
        : score >= 0.4
        ? "일반적인 사용감이 있으며 상태는 보통입니다."
        : "사용감이 많거나 손상이 있는 것으로 보입니다.";

      result = { score, level, reason };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      let score = 0.5;
      let level = "중";
      let reason = "상태 평가에 실패했습니다. 직접 확인해주세요.";

      if (description) {
        const descLower = description.toLowerCase();
        if (descLower.includes("새것") || descLower.includes("미사용") || descLower.includes("미개봉")) {
          score = 0.9;
          level = "상";
          reason = "설명상 새것 또는 미사용 상태로 보입니다.";
        } else if (descLower.includes("파손") || descLower.includes("고장") || descLower.includes("손상")) {
          score = 0.2;
          level = "하";
          reason = "설명상 파손 또는 손상이 있는 것으로 보입니다.";
        } else if (descLower.includes("양호") || descLower.includes("깨끗")) {
          score = 0.7;
          level = "상";
          reason = "설명상 상태가 양호한 것으로 보입니다.";
        }
      }

      result = { score, level, reason };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 상품 상태 평가 오류:", error);
    res.json({
      score: 0.5,
      level: "중",
      reason: "AI 분석에 실패했습니다. 직접 확인해주세요.",
    });
  }
});

// ============================================
// /getImageQualityScore - AI 이미지 품질 점수
// ============================================
app.post("/getImageQualityScore", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const { imageUrl } = req.body;

    if (!imageUrl || typeof imageUrl !== "string") {
      res.json({
        score: 0.0,
        label: "low",
        reason: "이미지가 없습니다.",
      });
      return;
    }

    logger.info("📸 이미지 품질 평가 요청:", imageUrl.substring(0, 100));

    const prompt = `
너는 중고거래 플랫폼의 이미지 품질 감정 전문가야.

다음 이미지의 품질을 아래 기준으로 평가해줘:

### 평가 기준
1. 해상도/픽셀 품질: 이미지가 선명하고 고해상도인가?
2. 선명도/흔들림: 상품이 선명하게 찍혔는가? 흔들림이 없는가?
3. 노이즈/저조도: 노이즈가 없고 조도가 적절한가?
4. 구도: 상품의 구도가 잘 잡혀있는가?
5. 거리: 너무 멀거나 너무 가까운지 적절한가?
6. 실사/스톡 이미지: 실제 촬영 사진인가? 스톡 이미지나 홍보 이미지인가?
7. 상품 전체성: 상품 전체가 잘 나오고 특징이 보이는가?
8. 색감 왜곡: 색감이 왜곡되었거나 부자연스러운가?
9. 사기성 패턴: 스톡 이미지, 광고 이미지, 인터넷 이미지 패턴인가?

### 출력 형식
결과는 아래 JSON 형태만 출력:

{
  "score": 0.0~1.0,
  "label": "high | medium | low",
  "reason": "간단한 설명 (한국어)"
}

### 레이블 기준
- 0.0 ~ 0.4 → low (저품질): 흐림, 노이즈 많음, 스톡 이미지, 상품 식별 어려움
- 0.4 ~ 0.7 → medium (보통): 상품 식별 가능하나 품질 개선 여지 있음
- 0.7 ~ 1.0 → high (고품질): 선명하고 신뢰도 높은 실사 사진

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 이미지 품질 평가 전문가입니다. 이미지를 분석하여 품질 점수를 정확하게 평가합니다.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: { score: number; label: string; reason: string };
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      const score = typeof parsed.score === "number" && parsed.score >= 0 && parsed.score <= 1
        ? parsed.score
        : 0;

      let label = "low";
      if (score >= 0.7) {
        label = "high";
      } else if (score >= 0.4) {
        label = "medium";
      }

      const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : score >= 0.7
        ? "선명하고 신뢰도 높은 고품질 실사 사진입니다."
        : score >= 0.4
        ? "상품 식별 가능하나 품질 개선 여지가 있습니다."
        : "이미지 품질이 낮아 상품 식별이 어려울 수 있습니다.";

      result = { score, label, reason };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      result = {
        score: 0.5,
        label: "medium",
        reason: "이미지 품질 분석에 실패했습니다. 직접 확인해주세요.",
      };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 이미지 품질 평가 오류:", error);
    res.json({
      score: 0.5,
      label: "medium",
      reason: "AI 분석에 실패했습니다. 직접 확인해주세요.",
    });
  }
});

// ============================================
// /predictFuturePrice - AI 가격 미래 예측
// ============================================
app.post("/predictFuturePrice", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const {
      name,
      category,
      description,
      price,
      conditionScore,
      imageQualityScore,
      historicalPrices,
    } = req.body;

    if (!name || !price) {
      res.json({
        oneWeek: null,
        twoWeeks: null,
        trend: "unknown",
        reason: "상품 정보가 부족하여 예측할 수 없습니다.",
      });
      return;
    }

    logger.info("📈 가격 미래 예측 요청:", { name, category, price });

    const priceStats = Array.isArray(historicalPrices) && historicalPrices.length > 0
      ? {
          count: historicalPrices.length,
          avg: historicalPrices.reduce((a: number, b: number) => a + b, 0) / historicalPrices.length,
          min: Math.min(...historicalPrices),
          max: Math.max(...historicalPrices),
          recent: historicalPrices.slice(0, 10),
        }
      : null;

    const marketContext = priceStats
      ? `
최근 시세 데이터:
- 유사 상품 ${priceStats.count}개
- 평균가: ${Math.round(priceStats.avg).toLocaleString()}원
- 최저가: ${Math.round(priceStats.min).toLocaleString()}원
- 최고가: ${Math.round(priceStats.max).toLocaleString()}원
- 최근 가격: ${priceStats.recent.map((p: number) => Math.round(p).toLocaleString()).join(", ")}원
`
      : "최근 시세 데이터: 없음";

    const prompt = `
너는 중고거래 시세 분석 전문가야.

아래 데이터 기반으로 1주 후와 2주 후의 예상 가격을 예측해줘.

### 상품 정보
- 상품명: ${name || ""}
- 카테고리: ${category || ""}
- 설명: ${description || ""}

### 현재 정보
- 현재 가격: ${Math.round(Number(price) || 0).toLocaleString()}원
- 상태 점수(0~1): ${conditionScore || 0.5}
- 이미지 품질 점수(0~1): ${imageQualityScore || 0.5}

${marketContext}

### 규칙
- 중고 시세는 보통 완만하게 떨어지므로 하락 추세가 일반적임
- 거래량이 적으면 예측 정확도 낮음
- 상태 점수가 높다면(0.7 이상) 시세가 유지/상승 가능
- 이미지 품질이 높으면(0.7 이상) 신뢰도 상승으로 가격 유지 가능
- 가격 예측은 단일 숫자가 아니라 범위(min~max)로 반환
- 1주 후보다 2주 후가 더 넓은 범위를 가짐
- 현재 가격 기준으로 ±5~15% 범위 내에서 예측

### 출력 형식(JSON만):
{
  "oneWeek": { "min": 숫자, "max": 숫자 },
  "twoWeeks": { "min": 숫자, "max": 숫자 },
  "trend": "상승 | 보합 | 하락",
  "reason": "요약 설명 (한국어로 1~2문장)"
}

조건:
- oneWeek.min < oneWeek.max
- twoWeeks.min < twoWeeks.max
- twoWeeks 범위가 oneWeek보다 넓어야 함
- trend는 "상승", "보합", "하락" 중 하나
- 반드시 유효한 JSON만 출력

반드시 유효한 JSON만 출력 (다른 설명 없이).
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 중고거래 시세 분석 전문가입니다. 시세 데이터와 상품 정보를 분석하여 정확한 가격 변동을 예측합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 400,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: {
      oneWeek: { min: number; max: number } | null;
      twoWeeks: { min: number; max: number } | null;
      trend: string;
      reason: string;
    };

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      const currentPrice = Number(price) || 0;

      let oneWeek: { min: number; max: number } | null = null;
      if (parsed.oneWeek && typeof parsed.oneWeek.min === "number" && typeof parsed.oneWeek.max === "number") {
        oneWeek = {
          min: Math.round(Math.max(0, parsed.oneWeek.min)),
          max: Math.round(Math.max(parsed.oneWeek.min, parsed.oneWeek.max)),
        };
      } else {
        oneWeek = {
          min: Math.round(currentPrice * 0.9),
          max: Math.round(currentPrice * 1.1),
        };
      }

      let twoWeeks: { min: number; max: number } | null = null;
      if (parsed.twoWeeks && typeof parsed.twoWeeks.min === "number" && typeof parsed.twoWeeks.max === "number") {
        twoWeeks = {
          min: Math.round(Math.max(0, parsed.twoWeeks.min)),
          max: Math.round(Math.max(parsed.twoWeeks.min, parsed.twoWeeks.max)),
        };
      } else {
        twoWeeks = {
          min: Math.round(currentPrice * 0.85),
          max: Math.round(currentPrice * 1.15),
        };
      }

      if (twoWeeks && oneWeek) {
        const oneWeekRange = oneWeek.max - oneWeek.min;
        const twoWeeksRange = twoWeeks.max - twoWeeks.min;
        if (twoWeeksRange < oneWeekRange) {
          const center = (twoWeeks.min + twoWeeks.max) / 2;
          const expandedRange = oneWeekRange * 1.2;
          twoWeeks = {
            min: Math.round(center - expandedRange / 2),
            max: Math.round(center + expandedRange / 2),
          };
        }
      }

      const trend = parsed.trend === "상승" || parsed.trend === "보합" || parsed.trend === "하락"
        ? parsed.trend
        : "보합";

      const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : "시세 데이터를 기반으로 예측했습니다.";

      result = { oneWeek, twoWeeks, trend, reason };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      const currentPrice = Number(price) || 0;
      result = {
        oneWeek: {
          min: Math.round(currentPrice * 0.9),
          max: Math.round(currentPrice * 1.1),
        },
        twoWeeks: {
          min: Math.round(currentPrice * 0.85),
          max: Math.round(currentPrice * 1.15),
        },
        trend: "보합",
        reason: "시세 데이터 분석에 실패했습니다. 현재 가격 기준으로 예측했습니다.",
      };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 가격 미래 예측 오류:", error);
    const currentPrice = Number(req.body?.price) || 0;
    res.json({
      oneWeek: {
        min: Math.round(currentPrice * 0.9),
        max: Math.round(currentPrice * 1.1),
      },
      twoWeeks: {
        min: Math.round(currentPrice * 0.85),
        max: Math.round(currentPrice * 1.15),
      },
      trend: "보합",
      reason: "AI 분석에 실패했습니다. 현재 가격 기준으로 예측했습니다.",
    });
  }
});

// ============================================
// /api/detectComponents - AI 구성품 분석
// ============================================
app.post("/detectComponents", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const { category, description, imageUrl } = req.body;

    if (!category && !description) {
      res.json({
        components: [],
        summary: "카테고리 또는 설명이 필요합니다.",
      });
      return;
    }

    logger.info("🧰 AI 구성품 분석 요청:", { category });

    const prompt = `
너는 중고거래 플랫폼의 "구성품 분석 전문가"야.

아래 상품 정보를 보고 구성품 체크리스트를 생성해줘.

### 입력
- 카테고리: ${category || "미분류"}
- 설명: ${description || "설명 없음"}
- 이미지: ${imageUrl ? "있음" : "없음"}

### 단계
1. 해당 카테고리의 기본 구성품 리스트 만들기
   - 전자기기: 본체, 충전 케이블, 충전 어댑터, 박스, 설명서, 이어팁 등
   - 스포츠 용품: 본체, 케이스, 추가 부속품, 설명서, 박스 등
   - 의류/액세서리: 본체, 태그, 박스, 케이스 등
   - 기타: 카테고리에 맞는 일반적인 구성품

2. 이미지와 설명을 기반으로 각각이 있는지 판단
   - 이미지에서 명확히 보이면 "있음"
   - 설명에 명시되어 있으면 "있음"
   - 이미지나 설명에서 확인 불가능하면 "판단불가"
   - 설명에 "없음", "포함 안됨" 등이 명시되면 "없음"

3. "있음/없음/판단불가" 중 하나로 표시

4. JSON 형식으로만 출력

### 출력(JSON)
{
  "components": [
    { "name": "본체", "status": "있음" },
    { "name": "충전 케이블", "status": "판단불가" },
    { "name": "박스", "status": "없음" }
  ],
  "summary": "본체는 확인됨, 충전 케이블은 확인이 어려우며 박스는 없는 것으로 보입니다."
}

조건:
- components 배열에는 3~8개 정도의 주요 구성품만 포함
- status는 반드시 "있음", "없음", "판단불가" 중 하나
- summary는 1~2문장으로 간단히 요약
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

    const messages: any[] = [
      {
        role: "system",
        content: "당신은 중고거래 플랫폼의 구성품 분석 전문가입니다. 이미지와 설명을 정확하게 분석하여 구성품 체크리스트를 생성합니다.",
      },
      {
        role: "user",
        content: imageUrl
          ? [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ]
          : [{ type: "text", text: prompt }],
      },
    ];

    const aiResp = await openai.chat.completions.create({
      model: imageUrl ? "gpt-4o" : "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: {
      components: Array<{ name: string; status: "있음" | "없음" | "판단불가" }>;
      summary: string;
    };

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      const components = Array.isArray(parsed.components)
        ? parsed.components
            .map((c: any) => {
              if (typeof c.name !== "string" || !c.name.trim()) return null;
              const status = c.status === "있음" || c.status === "없음" || c.status === "판단불가"
                ? c.status
                : "판단불가";
              return { name: c.name.trim(), status };
            })
            .filter((c: any) => c !== null)
            .slice(0, 10)
        : [];

      const summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : components.length > 0
        ? `${components.length}개 구성품을 분석했습니다.`
        : "구성품 분석을 완료했습니다.";

      result = { components, summary };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      result = {
        components: [{ name: "본체", status: "판단불가" }],
        summary: "AI 분석에 실패했습니다.",
      };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 구성품 분석 오류:", error);
    res.json({
      components: [{ name: "본체", status: "판단불가" }],
      summary: "AI 분석에 실패했습니다.",
    });
  }
});

// ============================================
// /api/generateTotalScore - AI 종합 등급
// ============================================
app.post("/generateTotalScore", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const {
      conditionScore,
      imageQualityScore,
      fraud,
      components,
      price,
      historicalPrices,
      oneLineSummary,
    } = req.body;

    logger.info("⭐ AI 종합 등급 생성 요청");

    const componentsInfo = Array.isArray(components) && components.length > 0
      ? {
          total: components.length,
          available: components.filter((c: any) => c.status === "있음").length,
          completeness: components.filter((c: any) => c.status === "있음").length / components.length,
        }
      : { total: 0, available: 0, completeness: 0.5 };

    const priceInfo = Array.isArray(historicalPrices) && historicalPrices.length > 0 && price
      ? {
          current: Number(price) || 0,
          avg: historicalPrices.reduce((a: number, b: number) => a + b, 0) / historicalPrices.length,
          isReasonable: (() => {
            const current = Number(price) || 0;
            const avg = historicalPrices.reduce((a: number, b: number) => a + b, 0) / historicalPrices.length;
            const diff = Math.abs(current - avg) / avg;
            return diff < 0.3;
          })(),
        }
      : { current: 0, avg: 0, isReasonable: true };

    const prompt = `
너는 중고거래 플랫폼의 "AI 종합 등급 평가 전문가"야.

아래 정보를 종합하여 상품에 대한 총점(0~5)을 매기고 그 이유를 간단하게 요약해줘.

### 입력 데이터
상태 점수(0~1): ${conditionScore || 0.5}
이미지 품질(0~1): ${imageQualityScore || 0.5}
사기 위험 점수: ${fraud?.risk || 0}
사기 레벨: ${fraud?.label || "low"}
구성품 정보: 총 ${componentsInfo.total}개 중 ${componentsInfo.available}개 있음 (완전도: ${Math.round(componentsInfo.completeness * 100)}%)
현재 가격: ${priceInfo.current > 0 ? priceInfo.current.toLocaleString() + "원" : "정보 없음"}
최근 시세: ${priceInfo.avg > 0 ? `평균 ${Math.round(priceInfo.avg).toLocaleString()}원` : "정보 없음"} ${priceInfo.isReasonable ? "(적정)" : "(비적정)"}
한줄 요약: ${oneLineSummary || "없음"}

### 점수 계산 기준
- 상태 점수 비중: 30% (0~1 점수를 0~1.5점으로 변환)
- 이미지 품질 비중: 20% (0~1 점수를 0~1.0점으로 변환)
- 사기 위험 비중: 20% (risk가 낮을수록 높은 점수, 0~1점)
- 구성품 충실도: 15% (완전도에 따라 0~0.75점)
- 가격 적정성: 10% (적정하면 0.5점, 비적정하면 감점)
- 설명/요약 신뢰도: 5% (한줄 요약이 있으면 0.25점)

### 등급 기준
- 4.5 ~ 5.0: 매우 좋음 (거의 완벽한 상품)
- 3.5 ~ 4.5: 좋음 (양호한 상품)
- 2.5 ~ 3.5: 보통 (일반적인 상품)
- 1.5 ~ 2.5: 나쁨 (주의 필요)
- 0.0 ~ 1.5: 매우 나쁨 (사기 위험 높음)

### 출력 형식(JSON only):
{
  "score": 0~5 (소수점 1자리),
  "label": "매우 좋음 | 좋음 | 보통 | 나쁨 | 매우 나쁨",
  "reason": "요약 사유 (1~2문장)"
}

조건:
- score는 0.0~5.0 사이의 숫자 (소수점 1자리)
- label은 위 5가지 중 하나
- reason은 간결하게 1~2문장으로 작성
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 종합 등급 평가 전문가입니다. 모든 분석 결과를 종합하여 정확한 등급을 매깁니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 300,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: {
      score: number;
      label: string;
      reason: string;
    };

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      let score = typeof parsed.score === "number" ? parsed.score : 0;
      score = Math.max(0, Math.min(5, score));
      score = Math.round(score * 10) / 10;

      const validLabels = ["매우 좋음", "좋음", "보통", "나쁨", "매우 나쁨"];
      let label = typeof parsed.label === "string" && validLabels.includes(parsed.label)
        ? parsed.label
        : score >= 4.5
        ? "매우 좋음"
        : score >= 3.5
        ? "좋음"
        : score >= 2.5
        ? "보통"
        : score >= 1.5
        ? "나쁨"
        : "매우 나쁨";

      const reason = typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : `${label} 등급의 상품입니다.`;

      result = { score, label, reason };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      const baseScore =
        (conditionScore || 0.5) * 1.5 +
        (imageQualityScore || 0.5) * 1.0 +
        (1 - (fraud?.risk || 0.5)) * 1.0 +
        componentsInfo.completeness * 0.75 +
        (priceInfo.isReasonable ? 0.5 : 0.2) +
        (oneLineSummary ? 0.25 : 0);

      const finalScore = Math.min(5, Math.max(0, baseScore));
      result = {
        score: Math.round(finalScore * 10) / 10,
        label: finalScore >= 4.5 ? "매우 좋음" : finalScore >= 3.5 ? "좋음" : finalScore >= 2.5 ? "보통" : finalScore >= 1.5 ? "나쁨" : "매우 나쁨",
        reason: "AI 분석을 종합하여 등급을 매겼습니다.",
      };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 종합 등급 오류:", error);
    const baseScore =
      (req.body?.conditionScore || 0.5) * 1.5 +
      (req.body?.imageQualityScore || 0.5) * 1.0 +
      (1 - (req.body?.fraud?.risk || 0.5)) * 1.0 +
      0.5 * 0.75 +
      0.5 +
      0.25;

    const finalScore = Math.min(5, Math.max(0, baseScore));
    res.json({
      score: Math.round(finalScore * 10) / 10,
      label: finalScore >= 4.5 ? "매우 좋음" : finalScore >= 3.5 ? "좋음" : finalScore >= 2.5 ? "보통" : finalScore >= 1.5 ? "나쁨" : "매우 나쁨",
      reason: "AI 분석을 종합하여 등급을 매겼습니다.",
    });
  }
});

// ============================================
// /api/recommendSimilar - AI 유사상품 추천
// ============================================
app.post("/recommendSimilar", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const { base, candidates, userLocation } = req.body;

    if (!base || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      res.json({ ranked: [] });
      return;
    }

    logger.info("🔍 AI 유사상품 추천 요청:", { baseId: base.id, candidateCount: candidates.length });

    const candidateInfo = candidates.slice(0, 200).map((c: any) => ({
      id: c.id || "",
      name: c.name || "",
      category: c.category || "",
      description: typeof c.description === "string" ? c.description.substring(0, 200) : "",
      tags: Array.isArray(c.tags) ? c.tags.slice(0, 10) : [],
      price: typeof c.price === "number" ? c.price : 0,
    }));

    const baseInfo = {
      id: base.id || "",
      name: base.name || "",
      category: base.category || "",
      description: typeof base.description === "string" ? base.description.substring(0, 200) : "",
      tags: Array.isArray(base.tags) ? base.tags.slice(0, 10) : [],
      price: typeof base.price === "number" ? base.price : 0,
    };

    const prompt = `
너는 중고거래 플랫폼의 "AI 유사상품 추천 엔진"이야.

기준 상품과 후보 상품들을 비교해서 유사도를 0~1로 점수 계산해줘.

### 기준 상품
${JSON.stringify(baseInfo, null, 2)}

### 후보 상품들 (${candidateInfo.length}개)
${JSON.stringify(candidateInfo.slice(0, 50), null, 2)}${candidateInfo.length > 50 ? `\n... 외 ${candidateInfo.length - 50}개` : ""}

### 유사도 기준
1) 카테고리 동일/유사도 (20%)
2) 제목 의미적 유사도 (25%)
3) 설명 의미적 유사도 (15%)
4) 태그 유사성 (15%)
5) 가격대 비슷함 (10%)
6) 거리 가까움 (10%)
7) 종합 등급 가까움 (5%)

### 출력 형식(JSON only):
{
  "ranked": [
    { "id": "상품ID1", "score": 0.0~1.0, "reasons": ["이유1", "이유2"] },
    { "id": "상품ID2", "score": 0.0~1.0, "reasons": ["이유1"] },
    ...
  ]
}

조건:
- ranked는 score 높은 순으로 정렬 (상위 20개만)
- score는 0.0~1.0 사이 숫자
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 AI 유사상품 추천 엔진입니다. 상품 간 의미적 유사도를 정확하게 계산합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 3000,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: {
      ranked: Array<{
        id: string;
        score: number;
        reasons?: string[];
      }>;
    };

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      const ranked = Array.isArray(parsed.ranked)
        ? parsed.ranked
            .map((item: any) => {
              if (!item.id || typeof item.id !== "string") return null;
              let score = typeof item.score === "number" ? item.score : 0;
              score = Math.max(0, Math.min(1, score));
              const reasons = Array.isArray(item.reasons)
                ? item.reasons.filter((r: any) => typeof r === "string").slice(0, 3)
                : [];
              return { id: item.id, score, reasons };
            })
            .filter((item: any): item is { id: string; score: number; reasons: string[] } => item !== null)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
        : [];

      result = { ranked };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      const baseCategory = baseInfo.category || "";
      const basePrice = baseInfo.price || 0;
      const baseTags = baseInfo.tags || [];

      const ranked = candidateInfo
        .map((c: any) => {
          if (c.id === baseInfo.id) return null;

          let score = 0;
          if (c.category === baseCategory) score += 0.2;
          const commonTags = baseTags.filter((tag: string) => c.tags?.includes(tag));
          score += Math.min(0.15, (commonTags.length / Math.max(baseTags.length, 1)) * 0.15);
          if (basePrice > 0 && c.price > 0) {
            const priceDiff = Math.abs(c.price - basePrice) / basePrice;
            if (priceDiff <= 0.3) score += 0.1;
          }

          return score > 0 ? { id: c.id, score: Math.min(1, score), reasons: [] } : null;
        })
        .filter((item: any): item is { id: string; score: number; reasons: string[] } => item !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);

      result = { ranked };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 유사상품 추천 오류:", error);
    res.json({ ranked: [] });
  }
});

// ============================================
// /api/getRelatedProducts - AI 연관 상품 추천
// ============================================
app.post("/getRelatedProducts", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const { current, candidates } = req.body;

    if (!current || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      res.json({ related: [] });
      return;
    }

    logger.info("🔮 연관 상품 추천 요청:", {
      currentId: current.id || current.name,
      candidateCount: candidates.length,
    });

    const limitedCandidates = candidates.slice(0, 20);

    const prompt = `
너는 중고거래 플랫폼의 상품 추천 알고리즘 전문가야.

현재 상품(current)와 후보 상품들(candidates)을 비교해서
각 후보 상품과의 유사도를 0~1 사이로 점수화해줘.

유사도 평가 요소:
1. 카테고리 유사도 (같은 카테고리면 높은 점수)
2. 태그 유사도 (공통 태그가 많을수록 높은 점수)
3. 상품명 키워드 유사도 (비슷한 키워드 포함 여부)
4. 설명 기반 의미적 유사도 (설명 내용이 비슷한지)
5. 브랜드 유사도 (같은 브랜드면 추가 점수)

출력 형식(JSON):
{
  "related": [
    { "id": "상품ID", "score": 0.83 },
    ...
  ]
}

조건:
- 점수가 높은 순서로 정렬
- 최대 10개만 반환
- 점수는 0.0~1.0 사이
- 반드시 유효한 JSON만 출력

[current]
${JSON.stringify({
  id: current.id || "",
  name: current.name || "",
  category: current.category || "",
  tags: current.tags || current.aiTags || [],
  description: (current.description || "").substring(0, 200),
  brand: current.brand || "",
}, null, 2)}

[candidates]
${JSON.stringify(
  limitedCandidates.map((c: any) => ({
    id: c.id || "",
    name: c.name || "",
    category: c.category || "",
    tags: c.tags || c.aiTags || [],
    description: (c.description || "").substring(0, 200),
    brand: c.brand || "",
  })),
  null,
  2
)}
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 상품 추천 알고리즘 전문가입니다. 상품 간 유사도를 정확하게 분석하여 점수화합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let related: Array<{ id: string; score: number }> = [];

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      if (Array.isArray(parsed)) {
        related = parsed;
      } else if (Array.isArray(parsed.related)) {
        related = parsed.related;
      } else if (Array.isArray(parsed.results)) {
        related = parsed.results;
      }

      related = related
        .filter((r: any) => r.id && typeof r.score === "number" && r.score >= 0 && r.score <= 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      const currentCategory = current.category || "";
      const currentTags = current.tags || current.aiTags || [];

      related = limitedCandidates
        .map((c: any) => {
          let score = 0;
          if (c.category === currentCategory) score += 0.5;
          const cTags = c.tags || c.aiTags || [];
          const commonTags = currentTags.filter((t: string) => cTags.includes(t));
          score += (commonTags.length / Math.max(currentTags.length, cTags.length, 1)) * 0.3;
          const currentName = (current.name || "").toLowerCase();
          const cName = (c.name || "").toLowerCase();
          if (currentName && cName) {
            const currentWords = currentName.split(/\s+/);
            const cWords = cName.split(/\s+/);
            const commonWords = currentWords.filter((w) => cWords.includes(w));
            score += (commonWords.length / Math.max(currentWords.length, cWords.length, 1)) * 0.2;
          }
          return { id: c.id || "", score: Math.min(score, 1.0) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
    }

    res.json({ related });
  } catch (error: any) {
    logger.error("❌ AI 연관 상품 추천 오류:", error);
    res.json({ related: [] });
  }
});

// ============================================
// /api/getSellerTrustScore - AI 판매자 신뢰도 평가
// ============================================
app.post("/getSellerTrustScore", async (req, res) => {
  try {
    ensureAdminInitialized();
    const openai = getOpenAIClient();
    const { seller, stats } = req.body;

    if (!seller || !seller.uid) {
      res.status(400).json({
        score: 0,
        label: "분석 실패",
        reason: "판매자 정보가 없습니다.",
      });
      return;
    }

    logger.info("⭐ AI 판매자 신뢰도 평가 요청:", { sellerId: seller.uid });

    const normalizedStats = {
      totalSales: typeof stats?.totalSales === "number" ? stats.totalSales : 0,
      successfulSales: typeof stats?.successfulSales === "number" ? stats.successfulSales : 0,
      cancelledSales: typeof stats?.cancelledSales === "number" ? stats.cancelledSales : 0,
      reports: typeof stats?.reports === "number" ? stats.reports : 0,
      avgResponseMinutes: typeof stats?.avgResponseMinutes === "number" ? stats.avgResponseMinutes : null,
      avgFraudRisk: typeof stats?.avgFraudRisk === "number" ? Math.max(0, Math.min(1, stats.avgFraudRisk)) : 0.0,
      avgConditionScore: typeof stats?.avgConditionScore === "number" ? Math.max(0, Math.min(1, stats.avgConditionScore)) : 0.0,
      avgPriceFairness: typeof stats?.avgPriceFairness === "number" ? Math.max(0, Math.min(1, stats.avgPriceFairness)) : 0.0,
      accountAgeDays: typeof stats?.accountAgeDays === "number" ? stats.accountAgeDays : null,
    };

    const completionRate = normalizedStats.totalSales > 0
      ? normalizedStats.successfulSales / normalizedStats.totalSales
      : 0;
    const cancellationRate = normalizedStats.totalSales > 0
      ? normalizedStats.cancelledSales / normalizedStats.totalSales
      : 0;
    const reportRate = normalizedStats.totalSales > 0
      ? normalizedStats.reports / normalizedStats.totalSales
      : 0;

    const prompt = `
너는 중고거래 플랫폼의 "판매자 신뢰도 평가 AI"야.

아래 판매자 정보를 보고 0~5점 사이의 신뢰도 점수와 등급을 매겨줘.

### 판매자 기본 정보
${JSON.stringify({ uid: seller.uid || "", nickname: seller.nickname || "알 수 없음" }, null, 2)}

### 판매자 통계 정보
${JSON.stringify(normalizedStats, null, 2)}

### 계산된 지표
- 완료율: ${(completionRate * 100).toFixed(1)}% (${normalizedStats.successfulSales}/${normalizedStats.totalSales})
- 취소율: ${(cancellationRate * 100).toFixed(1)}%
- 신고율: ${(reportRate * 100).toFixed(1)}%
- 평균 응답 시간: ${normalizedStats.avgResponseMinutes !== null ? `${normalizedStats.avgResponseMinutes}분` : "정보 없음"}
- 계정 연령: ${normalizedStats.accountAgeDays !== null ? `${normalizedStats.accountAgeDays}일` : "정보 없음"}

### 평가 기준
**높은 점수 요소:**
- 거래 수 많음 (10회 이상 높음, 50회 이상 매우 높음)
- 완료율 높음 (80% 이상 좋음, 95% 이상 매우 좋음)
- 취소율 낮음 (10% 이하 좋음, 5% 이하 매우 좋음)
- 신고율 낮음 (5% 이하 좋음, 1% 이하 매우 좋음)
- 평균 응답 시간 빠름 (24시간 이내 좋음, 12시간 이내 매우 좋음)
- 사기 위험도 낮음 (avgFraudRisk < 0.3 좋음, < 0.1 매우 좋음)

**낮은 점수 요소:**
- 신규 계정 (7일 이하 경고)
- 거래 이력 적음 (5회 이하 주의)
- 취소율 높음 (30% 이상 위험)
- 신고율 높음 (10% 이상 위험)
- 사기 위험도 높음 (avgFraudRisk > 0.7 위험)

### 출력 형식 (JSON only)
{
  "score": 0~5 사이 숫자 (소수점 1자리),
  "label": "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험",
  "reason": "한 문장~두 문장으로 신뢰도 판단 이유 설명"
}

조건:
- score는 0.0~5.0 사이 숫자
- label은 반드시 "매우 신뢰", "신뢰", "보통", "주의", "위험" 중 하나
- reason은 간결하게 1~2문장으로 설명
- 반드시 유효한 JSON만 출력 (다른 설명 없이)
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 중고거래 플랫폼의 AI 판매자 신뢰도 평가 시스템입니다. 판매자의 거래 이력, 응답 속도, 사기 위험도 등을 종합 분석하여 정확한 신뢰도 점수를 제공합니다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 500,
    });

    const aiText = aiResp.choices[0]?.message?.content?.trim() || "{}";
    let result: {
      score: number;
      label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험";
      reason: string;
    };

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);

      let score = typeof parsed.score === "number" ? parsed.score : 0;
      score = Math.max(0, Math.min(5, score));
      score = Math.round(score * 10) / 10;

      const validLabels = ["매우 신뢰", "신뢰", "보통", "주의", "위험"];
      const label = validLabels.includes(parsed.label) ? parsed.label : "보통";

      const reason = typeof parsed.reason === "string" ? parsed.reason : "AI 분석 중...";

      result = { score, label, reason };
    } catch (parseError: any) {
      logger.error("❌ JSON 파싱 오류:", parseError);
      let score = 3.0;

      if (normalizedStats.totalSales >= 50) score += 1.0;
      else if (normalizedStats.totalSales >= 10) score += 0.5;
      else if (normalizedStats.totalSales >= 5) score += 0.2;

      if (completionRate >= 0.95) score += 1.0;
      else if (completionRate >= 0.8) score += 0.5;
      else if (completionRate < 0.5) score -= 1.0;

      if (normalizedStats.avgFraudRisk >= 0.7) score -= 1.5;
      else if (normalizedStats.avgFraudRisk >= 0.3) score -= 0.5;
      else if (normalizedStats.avgFraudRisk < 0.1) score += 0.5;

      if (cancellationRate >= 0.3) score -= 1.0;
      else if (cancellationRate >= 0.1) score -= 0.5;

      if (reportRate >= 0.1) score -= 1.0;
      else if (reportRate >= 0.05) score -= 0.5;

      score = Math.max(0, Math.min(5, score));
      score = Math.round(score * 10) / 10;

      let label: "매우 신뢰" | "신뢰" | "보통" | "주의" | "위험" = "보통";
      if (score >= 4.5) label = "매우 신뢰";
      else if (score >= 3.5) label = "신뢰";
      else if (score >= 2.5) label = "보통";
      else if (score >= 1.5) label = "주의";
      else label = "위험";

      const reason = `거래 ${normalizedStats.totalSales}회, 완료율 ${(completionRate * 100).toFixed(1)}%, 사기 위험도 ${(normalizedStats.avgFraudRisk * 100).toFixed(1)}%`;

      result = { score, label, reason };
    }

    res.json(result);
  } catch (error: any) {
    logger.error("❌ AI 판매자 신뢰도 평가 오류:", error);
    res.json({
      score: 0,
      label: "분석 실패",
      reason: "서버 오류로 신뢰도를 평가할 수 없습니다.",
    });
  }
});

// ============================================
// Health Check
// ============================================
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  logger.warn("⚠️ 알 수 없는 API 경로:", req.path);
  res.status(404).json({ error: "API endpoint not found", path: req.path });
});

// Firebase Functions v2로 Express 앱 배포
export const api = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  app
);

