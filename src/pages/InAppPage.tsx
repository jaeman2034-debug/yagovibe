import { useEffect, useState } from "react";

export default function InAppPage() {
  const [isIOS, setIsIOS] = useState(false);
  const targetUrl = "https://www.yagovibe.com";

  useEffect(() => {
    // iOS 감지
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // iOS Safari로 열기
      window.location.href = targetUrl;
    } else {
      // Android Chrome
      const url = encodeURIComponent(targetUrl);
      window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
    }
  }, []);

  const handleChromeOpen = () => {
    if (isIOS) {
      // iOS Safari
      window.location.href = targetUrl;
    } else {
      // Android Chrome
      const url = encodeURIComponent(targetUrl);
      window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px" }}>
        앱 내 브라우저에서는 사용할 수 없습니다
      </h2>
      <p style={{ marginBottom: "24px", color: "#666" }}>
        아래 버튼을 눌러 {isIOS ? "Safari" : "Chrome"}으로 열어주세요.
      </p>
      <a
        href={isIOS ? targetUrl : `googlechrome://navigate?url=${targetUrl}`}
        onClick={handleChromeOpen}
        style={{
          display: "inline-block",
          marginTop: "20px",
          padding: "12px 20px",
          background: "#FF6F0F",
          color: "#fff",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        {isIOS ? "Safari로 열기" : "Chrome으로 열기"}
      </a>
      <p style={{ marginTop: "24px", fontSize: "14px", color: "#999" }}>
        또는 브라우저 주소창에 직접 입력: {targetUrl}
      </p>
    </div>
  );
}

