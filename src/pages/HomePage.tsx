import { Link, useNavigate } from "react-router-dom";
import { speak } from "../services/TTSService";
import { analyze } from "../services/NLUService";
import { emitRecognized } from "../services/STTService";
import { useEffect } from "react";

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    speak("홈페이지입니다. 지도 페이지로 이동하거나, 예: 근처 편의점 찾아줘 라고 말씀해 보세요.");
  }, []);

  const handleClick = async (cmd: string) => {
    const result = await analyze(cmd);

    // intent 기반 분기 처리
    if (result.intent === "open_map") {
      navigate("/voice-map");
    } else if (result.intent === "search_convenience" || result.intent === "search_soccer" || result.intent === "search_cafe") {
      // 검색 키워드 추출
      const keyword = cmd.replace(/근처|찾아|줘/g, "").trim() || "편의점";
      navigate("/voice-map", { state: { immediateQuery: keyword } });
    } else {
      emitRecognized(cmd); // 그냥 흘려보내도 상관 없음
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 420 }}>
      <h1>🏠 홈 페이지 (AI 음성 비서)</h1>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => handleClick("지도 페이지로 이동")}>🗺️ 지도 페이지로 이동</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => handleClick("근처 편의점 찾아줘")}>🔍 근처 편의점 찾기</button>
      </div>

      <p style={{ color: "#666" }}>
        예: "지도 페이지로 이동", "근처 축구장 찾아줘"
      </p>

      <div style={{ marginTop: 24 }}>
        <Link to="/voice-map">👉 바로 지도 페이지 보기</Link>
      </div>
    </div>
  );
}
