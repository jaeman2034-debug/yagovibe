const token = process.env.VITE_SENTRY_TOKEN;

if (!token) {
  console.error("❌ 환경 변수 VITE_SENTRY_TOKEN을 찾을 수 없습니다.");
  process.exit(1);
}

fetch("https://sentry.io/api/0/projects/", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then((data) => console.log("✅ 연결 성공:", data))
  .catch((err) => console.error("❌ 연결 실패:", err));

