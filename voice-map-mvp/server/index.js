import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import dotenv from "dotenv";
import { transcribeAudio } from "./stt.js";
import { logEvent, getSummary } from "./analytics.js";

// 환경 변수 로드
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 📁 업로드 디렉토리 생성 (없으면)
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 📤 Multer 설정 (임시 파일 저장)
const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한 (비용 최소화)
  },
  fileFilter: (req, file, cb) => {
    // 오디오 파일만 허용
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("오디오 파일만 업로드 가능합니다."), false);
    }
  },
});

// 🔑 키워드 → 카테고리 매핑 (MVP용)
const CATEGORY_MAP = {
  "축구장": "SOCCER_FIELD",
  "헬스장": "GYM",
  "헬스": "GYM",
  "배드민턴": "BADMINTON",
  "배드민턴장": "BADMINTON",
  "카페": "CAFE",
  "커피": "CAFE",
};

// 🔧 mock 장소 데이터 (의정부 기준)
const PLACES = [
  { id: 1, name: "의정부 축구장", lat: 37.738, lng: 127.046, category: "SOCCER_FIELD", distance: 850 },
  { id: 2, name: "중앙 헬스장", lat: 37.739, lng: 127.048, category: "GYM", distance: 1200 },
  { id: 3, name: "시민 배드민턴장", lat: 37.737, lng: 127.045, category: "BADMINTON", distance: 600 },
  { id: 4, name: "민락동 축구장", lat: 37.740, lng: 127.050, category: "SOCCER_FIELD", distance: 1500 },
  { id: 5, name: "스타벅스 의정부점", lat: 37.741, lng: 127.047, category: "CAFE", distance: 1100 },
];

// 🔧 거리 계산 (간단 버전)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 미터
}

// 💸 비용 최소화: 일일 호출 제한 (메모리 기반, MVP용)
const dailyRequestCount = new Map();
const MAX_REQUESTS_PER_IP = 100; // 하루 100회 제한

function getDailyKey(ip) {
  const today = new Date().toISOString().split("T")[0];
  return `${ip}:${today}`;
}

function checkRateLimit(ip) {
  const key = getDailyKey(ip);
  const count = dailyRequestCount.get(key) || 0;
  
  if (count >= MAX_REQUESTS_PER_IP) {
    return false;
  }
  
  dailyRequestCount.set(key, count + 1);
  return true;
}

// 🎙️ Whisper STT 엔드포인트
app.post("/stt", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "음성 파일이 필요합니다." });
  }

  // 💸 비용 최소화: 파일 크기 체크 (무음 감지)
  if (req.file.size < 10_000) {
    // 10KB 미만 = 무음으로 간주
    fs.unlinkSync(req.file.path);
    return res.json({ text: "" });
  }

  // 💸 비용 최소화: 일일 호출 제한
  const clientIp = req.ip || req.connection.remoteAddress;
  if (!checkRateLimit(clientIp)) {
    fs.unlinkSync(req.file.path);
    return res.status(429).json({ 
      error: "일일 호출 제한을 초과했습니다. 내일 다시 시도해주세요." 
    });
  }

  const filePath = req.file.path;

  try {
    const text = await transcribeAudio(filePath);

    // 임시 파일 삭제
    fs.unlinkSync(filePath);

    res.json({ text });
  } catch (error) {
    // 에러 발생 시에도 임시 파일 삭제
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.error("STT 처리 실패:", error);
    res.status(500).json({ 
      error: "음성 인식에 실패했습니다.",
      message: error.message 
    });
  }
});

app.post("/search/voice", (req, res) => {
  const { query, lat, lng } = req.body;

  // 키워드 추출
  const keyword = Object.keys(CATEGORY_MAP).find(k => query.includes(k));
  if (!keyword) {
    return res.json({ primary: null, others: [] });
  }

  const category = CATEGORY_MAP[keyword];
  
  // 카테고리별 필터링
  let results = PLACES.filter(p => p.category === category);

  // 위치 기반 거리 계산 (있으면)
  if (lat && lng) {
    results = results.map(place => ({
      ...place,
      distance: calculateDistance(lat, lng, place.lat, place.lng),
    })).sort((a, b) => a.distance - b.distance);
  } else {
    // Mock 거리 사용
    results = results.sort((a, b) => a.distance - b.distance);
  }

  // 최대 5개
  results = results.slice(0, 5);

  res.json({
    primary: results[0] || null,
    others: results.slice(1),
  });
});

// 📊 Analytics 엔드포인트
app.post("/analytics", (req, res) => {
  const { event, data } = req.body;
  logEvent(event, data);
  res.json({ success: true });
});

// 📈 지표 조회 엔드포인트
app.get("/metrics", (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const summary = getSummary(days);
  res.json(summary);
});

// 📊 지표 조회 엔드포인트 (간단한 HTML 대시보드)
app.get("/metrics/dashboard", (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const summary = getSummary(days);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>YAGO 지표 대시보드</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        h1 { color: #2563eb; }
        .metric { margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; }
        .success { color: #10b981; }
        .fail { color: #ef4444; }
        .number { font-size: 24px; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>YAGO 지표 대시보드 (최근 ${days}일)</h1>
      
      <div class="metric">
        <h3>앱 실행</h3>
        <div class="number">${summary.appOpen}명</div>
      </div>
      
      <div class="metric">
        <h3>음성 버튼 클릭률</h3>
        <div class="number ${summary.verdict.voiceClick === "✅" ? "success" : "fail"}">
          ${summary.voiceClickRate} ${summary.verdict.voiceClick}
        </div>
        <p>목표: 40% 이상</p>
      </div>
      
      <div class="metric">
        <h3>검색 성공률</h3>
        <div class="number ${summary.verdict.searchSuccess === "✅" ? "success" : "fail"}">
          ${summary.searchSuccessRate} ${summary.verdict.searchSuccess}
        </div>
        <p>목표: 70% 이상</p>
      </div>
      
      <div class="metric">
        <h3>길찾기 클릭률</h3>
        <div class="number ${summary.verdict.navigation === "✅" ? "success" : "fail"}">
          ${summary.navigationClickRate} ${summary.verdict.navigation}
        </div>
        <p>목표: 20% 이상</p>
      </div>
      
      <div class="metric">
        <h3>판정</h3>
        <p>2개 이상 성공 시 통과</p>
        <p>현재: ${Object.values(summary.verdict).filter(v => v === "✅").length}/3</p>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

app.listen(4000, () => {
  console.log("🚀 API running on http://localhost:4000");
  console.log("📝 Test: POST http://localhost:4000/search/voice");
  console.log("📊 Metrics: GET http://localhost:4000/metrics");
  console.log("📊 Dashboard: http://localhost:4000/metrics/dashboard");
});
