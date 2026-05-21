import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json({ type: "application/json; charset=utf-8" }));

// ✅ 디버깅: 모든 요청 로그
app.use((req, res, next) => {
  console.log("📥 요청 수신:", req.method, req.path);
  console.log("📥 요청 헤더:", JSON.stringify(req.headers));
  next();
});

// ✅ POST /nlu
app.post("/nlu", (req, res) => {
  console.log("🔵 NLU 엔드포인트 실행됨!");
  console.log("🔵 req.body:", req.body);
  console.log("🔵 req.body 타입:", typeof req.body);
  
  let text = req.body?.text || "";
  const originalText = text;

  // ✅ 상세 디버깅
  console.log("🧠 NLU Received (원본):", originalText);
  console.log("🧠 NLU Received (원본 타입):", typeof originalText);
  console.log("🧠 NLU Received (원본 길이):", (originalText as string).length);
  console.log("🧠 NLU Received (원본 유니코드):", Array.from(originalText as string).map(c => `${c}(${c.charCodeAt(0)})`));

  // ✅ 유니코드 정규화 + 소문자 변환 + 공백 정리
  text = text.normalize("NFC").toLowerCase().trim();
  const compact = text.replace(/\s+/g, ""); // 내부 공백 제거 버전

  console.log("🧠 NLU Received (정규화):", text);
  console.log("🧠 NLU Received (compact):", compact);

  let intent = "unknown";
  let message = "명령을 이해하지 못했습니다.";

  // ✅ 매칭 전 상세 확인
  const has지도 = compact.includes("지도");
  const hasMap = text.includes("map");
  const has홈 = compact.includes("홈");
  const hasHome = text.includes("home");
  const has로그인 = compact.includes("로그인");
  const hasLogin = text.includes("login");
  const has리포트 = compact.includes("리포트") || compact.includes("레포트") || compact.includes("보고서");
  const hasReport = text.includes("report");
  const has마켓 = compact.includes("마켓") || compact.includes("상점") || compact.includes("쇼핑");
  const hasMarket = text.includes("market");
  const has팀 = compact.includes("팀") || compact.includes("그룹");
  const hasTeam = text.includes("team");

  console.log("🔍 매칭 체크:", {
    has지도,
    hasMap,
    has홈,
    hasHome,
    has로그인,
    hasLogin,
    has리포트,
    hasReport,
    has마켓,
    hasMarket,
    has팀,
    hasTeam,
    text,
    compact
  });

  // ✅ 한글/영문 모두 인식
  if (has리포트 || hasReport) {
    intent = "open_report";
    message = "리포트 페이지로 이동합니다.";
    console.log("✅ 리포트 매칭 성공!");
  } else if (has지도 || hasMap) {
    intent = "go_to_map";
    message = "지도 페이지로 이동합니다.";
    console.log("✅ 지도 매칭 성공!");
  } else if (has마켓 || hasMarket) {
    intent = "open_market";
    message = "마켓 페이지로 이동합니다.";
    console.log("✅ 마켓 매칭 성공!");
  } else if (has팀 || hasTeam) {
    intent = "open_team";
    message = "팀 페이지로 이동합니다.";
    console.log("✅ 팀 매칭 성공!");
  } else if (has홈 || hasHome) {
    intent = "go_to_home";
    message = "홈페이지로 이동합니다.";
    console.log("✅ 홈 매칭 성공!");
  } else if (has로그인 || hasLogin) {
    intent = "go_to_login";
    message = "로그인 페이지로 이동합니다.";
    console.log("✅ 로그인 매칭 성공!");
  } else {
    console.log("❌ 매칭 실패 - 어떤 키워드도 찾지 못함");
  }

  console.log("🤖 인식 결과:", { intent, message });
  res.json({ intent, message });
});

export { app as nluExpressApp };

/**
 * Cloud Functions에서는 절대 app.listen() 하지 말 것 — 배포 시 코드 로드가 멈추거나 타임아웃 난다.
 * 로컬 전용 스탠드얼론 서버만 필요할 때:
 *   PowerShell: $env:NLU_STANDALONE_SERVER="1"; npx ts-node src/nluServer.ts
 *   (또는 별도 스크립트에서 이 파일을 import 한 뒤 listen)
 */
if (process.env.NLU_STANDALONE_SERVER === "1") {
  const port = Number(process.env.NLU_PORT || 5183);
  app.listen(port, () => {
    console.log(`🚀 NLU Server (standalone) http://localhost:${port}`);
  });
}
