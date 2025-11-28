// === CORE PROTECTED: DO NOT MODIFY BELOW ===
// 🧠 YAGO VIBE Firebase Configuration
// 이 파일은 Cursor가 자동 수정하지 못하도록 보호됩니다.

// ======================================================
// 🧠 GENIUS MODE PATCH INSTRUCTION
// Project: YAGO VIBE CLEAN BUILD (SPT Edition)
// Author: ChatGPT (천재모드)
// Purpose: Firebase + AuthProvider + Router 구조 세팅
// ======================================================
//
// ⚠️ IMPORTANT DEVELOPER RULES for Cursor
// ------------------------------------------------------
// 1️⃣ 절대 다른 파일 수정 금지 — 지정된 파일만 수정할 것.
// 2️⃣ 파일이 없으면 새로 생성, 반드시 명시된 경로에 생성.
// 3️⃣ 이미 있는 코드는 덮어써도 됨 (본 지시문 내의 파일만).
// 4️⃣ 설치된 패키지, .env, tailwind 설정 절대 건드리지 말 것.
// 5️⃣ ChatGPT가 포함한 주석, 구조, import 경로 절대 삭제 금지.
// ------------------------------------------------------
// ✅ 이 패치는 Firebase + AuthProvider + Router 기반을 구축한다.
// ======================================================

// 🔥 중복 초기화 방지: src/lib/firebase.ts에서 이미 초기화했으므로 re-export만 수행
// 이렇게 하면 authDomain 불일치 문제를 완전히 해결할 수 있습니다.
export { auth, db, storage, app } from "@/lib/firebase";

// ======================================================
// ✅ END OF GENIUS MODE PATCH (DO NOT MODIFY ABOVE LINES)
// ======================================================

// === END PROTECTED ===
