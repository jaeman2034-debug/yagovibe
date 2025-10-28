import { Link } from "react-router-dom";

export default function StartPage() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>🎯 시작 페이지</h1>
      <p>익명 로그인 중...</p>
      <p>잠시만 기다려주세요...</p>
      <Link to="/home" style={{ color: "blue", textDecoration: "underline" }}>
        👉 홈 페이지로 이동
      </Link>
    </div>
  );
}
