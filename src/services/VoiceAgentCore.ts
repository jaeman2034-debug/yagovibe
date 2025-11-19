// ✅ NLU 연동 + 라우터 자동 이동 통합 버전
export async function handleVoiceCommand(navigate: any, text: string): Promise<string> {
  console.log("🎤 음성 명령 감지:", text);

  try {
    const res = await fetch("/nlu", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ text }),
    });

    const data = await res.json();
    console.log("🤖 NLU 응답:", data);

    // ✅ intent에 따라 자동 라우팅
    switch (data.intent) {
      case "open_report":
      case "show_report":
        navigate("/home");
        return "📊 리포트 페이지로 이동합니다.";
      
      case "open_market":
        navigate("/app/market");
        return "🛍️ 마켓 페이지로 이동합니다.";
      
      case "open_team":
        navigate("/app/team");
        return "👥 팀 페이지로 이동합니다.";
      
      case "go_to_map":
        navigate("/voice-map");
        return "🗺️ 지도 페이지로 이동합니다.";
      
      case "go_to_home":
        navigate("/sports-hub");
        return "🏠 홈으로 이동합니다.";
      
      case "go_to_login":
        navigate("/login");
        return "🔐 로그인 페이지로 이동합니다.";
      
      case "unknown":
      default:
        return data.message || "명령을 이해하지 못했습니다.";
    }
  } catch (err) {
    console.error("❌ NLU 요청 실패:", err);
    return "서버와 연결할 수 없습니다.";
  }
}
