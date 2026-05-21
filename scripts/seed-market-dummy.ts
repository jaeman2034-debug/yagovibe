/**
 * 🔥 마켓 더미 데이터 생성 스크립트
 * 
 * 실행: npx tsx scripts/seed-market-dummy.ts
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

// Firebase 설정 (테스트용 하드코딩)
const firebaseConfig = {
  apiKey: "AIzaSyCDV14KBbqilXniPvxJeQZGZgUmGgKWk7g",
  authDomain: "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DUMMY_POSTS = [
  {
    sport: "soccer",
    category: "equipment",
    title: "나이키 축구화 판매합니다",
    price: 50000,
    location: "서울 강남구",
    images: [],
    status: "open",
    authorId: "dummy-user-1",
    createdAt: serverTimestamp(),
  },
  {
    sport: "soccer",
    category: "equipment",
    title: "아디다스 축구공 중고",
    price: 15000,
    location: "서울 마포구",
    images: [],
    status: "open",
    authorId: "dummy-user-2",
    createdAt: serverTimestamp(),
  },
  {
    sport: "soccer",
    category: "recruit",
    title: "주말 축구팀 모집합니다",
    price: null,
    location: "서울 송파구",
    images: [],
    status: "open",
    authorId: "dummy-user-3",
    createdAt: serverTimestamp(),
  },
  {
    sport: "soccer",
    category: "match",
    title: "5:5 매칭 구합니다",
    price: null,
    location: "서울 노원구",
    images: [],
    status: "open",
    authorId: "dummy-user-4",
    createdAt: serverTimestamp(),
  },
  {
    sport: "soccer",
    category: "equipment",
    title: "축구 유니폼 세트",
    price: 30000,
    location: "서울 종로구",
    images: [],
    status: "open",
    authorId: "dummy-user-5",
    createdAt: serverTimestamp(),
  },
];

async function seedMarket() {
  console.log("🔥 마켓 더미 데이터 생성 시작...");

  try {
    for (const post of DUMMY_POSTS) {
      const docRef = await addDoc(collection(db, "market"), post);
      console.log(`✅ 생성 완료: ${docRef.id} - ${post.title}`);
    }

    console.log("✅ 모든 더미 데이터 생성 완료!");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    throw error;
  }
}

// 실행
seedMarket()
  .then(() => {
    console.log("🎉 완료!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 실패:", error);
    process.exit(1);
  });
